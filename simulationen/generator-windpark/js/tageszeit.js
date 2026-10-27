// ------------------------------------------------------------------
// Tageszeit im Windpark (Regler „Uhrzeit“): Sonnenstand, Farben von Himmel, Licht und Dunst, Lichter im Dorf und die
// Flugsicherungsbefeuerung der Windräder. So lässt sich am Abend die Energiekette beschreiben: Wind → Rotor →
// Generator → Stromleitung → Licht in den Häusern.
//
// Die Sonne geht um SONNE.AUF auf und um SONNE.UNTER unter; sie zieht von links (morgens) über die Mitte (mittags,
// hinter dem Betrachter, wie bisher) nach rechts (abends). Aus ihrer Höhe ergeben sich Tag (hell), Dämmerung
// (rötlicher Himmel, warmes, flaches Licht) und Nacht (dunkelblau, schwaches Mondlicht).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { parkScene, skyCanvas, skyTexture, hemi, sun, lichter, turbines, streakMaterial } from './landschaft.js';

export const SONNE = { AUF: 6, UNTER: 20, HOEHE: 55 * Math.PI / 180, ABSTAND: 950 };
const MITTAG = new THREE.Vector3(-500, 0, 300).normalize();   // Richtung zur Sonne am Mittag (waagrecht)
const OBEN = new THREE.Vector3(0, 1, 0);

// Himmelsfarben (oben, Mitte, Horizont) für Tag, Dämmerung und Nacht
const FARBEN = {
  tag: ['#5b9bd5', '#a9cdee', '#e6f0f7'],
  daemmerung: ['#33437a', '#c97a6a', '#f6b26b'],
  nacht: ['#050a1a', '#0c1830', '#1a2944'],
};
const farbe = Object.fromEntries(Object.entries(FARBEN).map(([k, v]) => [k, v.map(c => new THREE.Color(c))]));
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Höhe der Sonne als Sinus (−1 … 1) und ihre Richtung für eine Uhrzeit (Stunden, 0 … 24)
export function sonnenstand(uhrzeit) {
  const tag = SONNE.UNTER - SONNE.AUF;
  const s = (uhrzeit - SONNE.AUF) / tag;                 // 0 bei Sonnenaufgang, 1 bei Sonnenuntergang
  // Höhenwinkel: tagsüber ein Bogen bis HOEHE, nachts unter dem Horizont (bis −HOEHE/2 um Mitternacht)
  const hoehe = s >= 0 && s <= 1 ? SONNE.HOEHE * Math.sin(Math.PI * s)
    : -SONNE.HOEHE / 2 * Math.sin(Math.PI * ((uhrzeit - SONNE.UNTER + 24) % 24) / (24 - tag));
  const richtung = MITTAG.clone().applyAxisAngle(OBEN, -(s - 0.5) * Math.PI * 0.9);   // morgens links, abends rechts
  return { sinHoehe: Math.sin(hoehe), richtung: richtung.multiplyScalar(Math.cos(hoehe)).add(new THREE.Vector3(0, Math.sin(hoehe), 0)) };
}

// Wie dunkel ist es? 0 am Tag, 1 in der Nacht (für Lichter und Befeuerung)
export const dunkelheit = uhrzeit => 1 - smooth(-0.08, 0.18, sonnenstand(uhrzeit).sinHoehe);

const mischen = (a, b, t) => a.clone().lerp(b, t);
function himmel(oben, mitte, unten) {
  const ctx = skyCanvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, skyCanvas.height);
  g.addColorStop(0, '#' + oben.getHexString());
  g.addColorStop(0.55, '#' + mitte.getHexString());
  g.addColorStop(1, '#' + unten.getHexString());
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  skyTexture.needsUpdate = true;
}

const SONNENFARBE = { tag: new THREE.Color(0xfff4e0), tief: new THREE.Color(0xffa55c) };
const BODEN = { tag: new THREE.Color(0x7d8f5a), nacht: new THREE.Color(0x2a3550) };
const HIMMELSLICHT = { tag: new THREE.Color(0xdfefff), nacht: new THREE.Color(0x6a7cb0) };

let gezeigt = null;
// Jedes Bild: Licht und Himmel nur bei geänderter Uhrzeit neu, Blinken der Warnlichter immer
export function syncTageszeit(uhrzeit, zeit) {
  const dunkel = dunkelheit(uhrzeit);
  if (uhrzeit !== gezeigt) {
    gezeigt = uhrzeit;
    const { sinHoehe, richtung } = sonnenstand(uhrzeit);
    const hell = smooth(0, 0.3, sinHoehe);              // 0 bei Sonne am Horizont, 1 ab mittlerer Höhe
    const daemmrig = smooth(-0.15, 0.03, sinHoehe);      // 0 in der Nacht, 1 ab Sonnenaufgang
    // Himmel und Dunst: Nacht → Dämmerung → Tag
    const [oben, mitte, unten] = [0, 1, 2].map(i => mischen(farbe.nacht[i], mischen(farbe.daemmerung[i], farbe.tag[i], hell), daemmrig));
    himmel(oben, mitte, unten);
    parkScene.fog.color.copy(unten);
    // Sonne: Richtung, Stärke, Farbe (tief stehend warm); unter dem Horizont aus
    sun.position.copy(richtung).multiplyScalar(SONNE.ABSTAND);
    sun.intensity = 2.2 * smooth(-0.02, 0.15, sinHoehe);
    sun.color.copy(mischen(SONNENFARBE.tief, SONNENFARBE.tag, hell));
    sun.castShadow = sinHoehe > 0;
    // Himmelslicht: am Tag hell, in der Nacht schwaches, bläuliches Mondlicht
    hemi.intensity = 0.4 + 0.6 * daemmrig * (0.45 + 0.55 * hell);
    hemi.color.copy(mischen(HIMMELSLICHT.nacht, HIMMELSLICHT.tag, daemmrig));
    hemi.groundColor.copy(mischen(BODEN.nacht, BODEN.tag, daemmrig));
    // Lichter im Dorf: jedes Haus ab seiner eigenen Dunkelheit, weich eingeblendet
    for (const { material, schein, scheine, schwelle } of lichter) {
      const an = smooth(schwelle - 0.08, schwelle + 0.08, dunkel);
      material.emissiveIntensity = 2.2 * an;
      material.color.setHex(an > 0.5 ? 0x6b5a3a : 0x3b4a5a);
      schein.opacity = 0.9 * an;
      for (const s of scheine) s.visible = an > 0.01;
    }
    // Windstreifen: in der Dunkelheit nur noch schwach
    streakMaterial.opacity = 0.75 * (0.2 + 0.8 * (1 - dunkel));
  }
  // Befeuerung: ab der Dämmerung, im Takt 1 s an, 0,5 s aus
  const blink = dunkel > 0.4 && (zeit % 1.5) < 1;
  for (const t of turbines) t.warn.visible = blink;
}

// Uhrzeit als Text, z. B. „19:30 Uhr“
export const uhrText = uhrzeit => {
  const minuten = Math.round(uhrzeit * 60) % (24 * 60);
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, '0')} Uhr`;
};
