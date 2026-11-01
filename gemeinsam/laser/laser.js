// ------------------------------------------------------------------
// Laserpointer (gemeinsamer Baustein): Mit Apple Pencil oder Maus Bereiche markieren, um zu zeigen, wovon man gerade
// spricht. Die Spur leuchtet rot über allem und verblasst kurz nach dem Absetzen; an der Simulation ändert sich nichts.
// Anleitung: README.md.
//
// Eingeschaltet (Knöpfe mit data-laser bzw. laserKnopf(), Taste L) fängt die Seite Stift und Maus ab, bevor
// Simulation oder Tafel sie bekommen. Finger bedienen alles weiter wie gewohnt, ebenso Knöpfe und Eingabefelder
// (auch mit Stift oder Maus, damit man den Laser wieder ausschalten kann). Läuft nur im Browser, ohne Server.
//
// Live-Steuerung (gemeinsam/live/): Die Spuren des steuernden Geräts werden mit übertragen – als Punkte in der 3D-Szene
// (auf der Ebene durch den Drehpunkt der Ansicht), damit sie auf jedem Bildschirm am selben Teil der Simulation
// liegen, auch wenn Größe und Seitenverhältnis verschieden sind. Spuren auf der großen Tafel gehen stattdessen in
// Tafeleinheiten mit (ort 'tafel'): Sie liegen auf jedem Gerät an derselben Stelle des Tafelbilds. Das zuschauende
// Gerät zeichnet sie zusätzlich – Tafelspuren nur bei offener Tafel, Szenenspuren nur bei geschlossener.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { stilLaden } from '../stil.js';

const HALTEN = 400;     // ms: so lange bleibt die Spur nach dem Absetzen voll sichtbar …
const VERBLASSEN = 1100; // … und verblasst dann in dieser Zeit
const BEDIENELEMENTE = 'button, input, select, textarea, a, label';

let an = false;
let szene = null;           // { renderer, camera, controls } der Simulation (initLaser)
let tafel = null;           // { offen, zu, von } aus gemeinsam/tafel/, wenn die Simulation eine Tafel hat
let canvas = null, ctx = null;
// Spuren: { id, ort ('szene' | 'tafel'), punkte: [{ x, y }] (Bildschirm), welt: Punkte zum Übertragen – in der
// Szene [x, y, z], auf der Tafel [x, y] in Tafeleinheiten –, ende: Zeitpunkt des Absetzens oder null }
const spuren = [];
let fremde = [];            // Spuren des steuernden Geräts (Live-Steuerung): { ort, welt, alter }
let laeuft = false;         // Zeichenschleife aktiv
const MAX_PUNKTE = 1500;    // so viele Punkte höchstens übertragen (die neuesten Spuren zuerst)

// ---------------- Bildschirm ↔ Szene (für die Übertragung)

const strahl = new THREE.Raycaster(), ebene = new THREE.Plane(), blick = new THREE.Vector3(), punkt = new THREE.Vector3();
const runden = v => Math.round(v * 100) / 100;

// Bildschirmpunkt → Punkt auf der Ebene durch den Drehpunkt der Ansicht, senkrecht zur Blickrichtung
function zuWelt(x, y) {
  const { renderer, camera, controls } = szene;
  const r = renderer.domElement.getBoundingClientRect();
  strahl.setFromCamera({ x: (x - r.left) / r.width * 2 - 1, y: 1 - (y - r.top) / r.height * 2 }, camera);
  camera.getWorldDirection(blick);
  ebene.setFromNormalAndCoplanarPoint(blick, controls.target);
  return strahl.ray.intersectPlane(ebene, punkt) ? punkt.toArray().map(runden) : null;
}

// Punkt der Szene → Bildschirmpunkt (null, wenn hinter der Kamera)
function zuBild(p) {
  punkt.fromArray(p).project(szene.camera);
  if (punkt.z > 1) return null;
  const r = szene.renderer.domElement.getBoundingClientRect();
  return { x: r.left + (punkt.x + 1) / 2 * r.width, y: r.top + (1 - punkt.y) / 2 * r.height };
}

function merken(s, x, y) {
  s.punkte.push({ x, y });
  if (s.ort === 'tafel') {
    const t = tafel.zu(x, y);
    if (t) s.welt.push([runden(t.x), runden(t.y)]);
    return;
  }
  const w = zuWelt(x, y);
  if (w) s.welt.push(w);
}

// Übertragenen Punkt einer fremden Spur auf diesem Bildschirm (null: hier gerade nicht zu sehen)
const tafelOffen = () => Boolean(tafel?.offen());
const aufBild = (ort, p) => (ort === 'tafel' ? tafel.von(p[0], p[1]) : zuBild(p));
const sichtbar = ort => (ort === 'tafel') === tafelOffen();

function groesse() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const deckkraftNach = alter => (alter <= HALTEN ? 1 : 1 - (alter - HALTEN) / VERBLASSEN);

function strich(punkte, deckkraft) {
  if (!punkte.length) return;
  ctx.globalAlpha = deckkraft;
  ctx.lineCap = ctx.lineJoin = 'round';
  // Leuchten außen, heller Kern innen
  for (const [breite, farbe, leuchten] of [[9, 'rgba(255, 30, 30, 0.85)', 14], [3, 'rgba(255, 220, 220, 0.95)', 0]]) {
    ctx.lineWidth = breite;
    ctx.strokeStyle = farbe;
    ctx.shadowColor = 'rgba(255, 0, 0, 0.9)';
    ctx.shadowBlur = leuchten;
    ctx.beginPath();
    punkte.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (punkte.length === 1) ctx.lineTo(punkte[0].x + 0.1, punkte[0].y);
    ctx.stroke();
  }
}

function zeichnen() {
  const jetzt = performance.now();
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = spuren.length - 1; i >= 0; i--) {
    const s = spuren[i];
    const deckkraft = deckkraftNach(s.ende === null ? 0 : jetzt - s.ende);
    if (deckkraft <= 0) {
      spuren.splice(i, 1);
      continue;
    }
    strich(s.punkte, deckkraft);
  }
  // Spuren des steuernden Geräts: jedes Bild neu aus der Szene projiziert (die Ansicht kann sich bewegen)
  for (const s of fremde) {
    if (sichtbar(s.ort)) strich(s.welt.map(p => aufBild(s.ort, p)).filter(Boolean), deckkraftNach(s.alter));
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  laeuft = spuren.length > 0 || fremde.length > 0;
  if (laeuft) requestAnimationFrame(zeichnen);
}
function anstossen() {
  if (laeuft) return;
  laeuft = true;
  requestAnimationFrame(zeichnen);
}

// Gehört dieses Ereignis dem Laser? Nur Stift und Maus, nur eingeschaltet, nicht auf Bedienelementen
const fuerLaser = event => an && (event.pointerType === 'pen' || event.pointerType === 'mouse')
  && !event.target.closest?.(BEDIENELEMENTE);
const abfangen = event => {
  event.preventDefault();
  event.stopPropagation();
};

// In der Erfassungsphase am Fenster: kommt vor allen anderen Zuhörern (Ansicht drehen, Schaukel ziehen, Tafel)
window.addEventListener('pointerdown', event => {
  if (!fuerLaser(event) || event.button > 0) return;
  abfangen(event);
  const s = { id: event.pointerId, ort: tafelOffen() ? 'tafel' : 'szene', punkte: [], welt: [], ende: null };
  merken(s, event.clientX, event.clientY);
  spuren.push(s);
  anstossen();
}, { capture: true });

window.addEventListener('pointermove', event => {
  const s = spuren.find(sp => sp.id === event.pointerId && sp.ende === null);
  if (!s) return;
  abfangen(event);
  const zusammengefasst = event.getCoalescedEvents?.();
  for (const e of zusammengefasst?.length ? zusammengefasst : [event]) {
    const letzter = s.punkte.at(-1);
    if (Math.hypot(e.clientX - letzter.x, e.clientY - letzter.y) >= 2) merken(s, e.clientX, e.clientY);   // spart Daten
  }
}, { capture: true });

function absetzen(event) {
  const s = spuren.find(sp => sp.id === event.pointerId && sp.ende === null);
  if (!s) return;
  abfangen(event);
  s.ende = performance.now();
}
window.addEventListener('pointerup', absetzen, { capture: true });
window.addEventListener('pointercancel', absetzen, { capture: true });
// kein Klick und kein Kontextmenü aus einem Laserstrich
window.addEventListener('click', event => { if (fuerLaser(event)) abfangen(event); }, { capture: true });
window.addEventListener('contextmenu', event => { if (an && !event.target.closest?.(BEDIENELEMENTE)) event.preventDefault(); }, { capture: true });

// Live-Steuerung, steuerndes Gerät: sichtbare Spuren zum Übertragen ({ welt, alter }, neueste zuerst begrenzt)
export function laserDaten() {
  const jetzt = performance.now(), daten = [];
  let anzahl = 0;
  for (const s of [...spuren].reverse()) {
    const alter = s.ende === null ? 0 : Math.round(jetzt - s.ende);
    if (deckkraftNach(alter) <= 0 || !s.welt.length) continue;
    const welt = s.welt.slice(-(MAX_PUNKTE - anzahl));
    anzahl += welt.length;
    daten.unshift({ ort: s.ort, welt, alter });
    if (anzahl >= MAX_PUNKTE) break;
  }
  return daten;
}

// Live-Steuerung, zuschauendes Gerät: Spuren des steuernden Geräts übernehmen (leere Liste: keine)
export function fremdeLaser(daten) {
  fremde = Array.isArray(daten) ? daten.filter(s => Array.isArray(s?.welt) && Number.isFinite(s.alter))
    .map(s => ({ ...s, ort: s.ort === 'tafel' && tafel ? 'tafel' : 'szene' })) : [];
  if (fremde.length) anstossen();
}

export function setzeLaser(wert) {
  an = wert;
  document.body.classList.toggle('laser-an', an);
  for (const knopf of document.querySelectorAll('[data-laser]')) knopf.setAttribute('aria-pressed', String(an));
  if (!an) for (const s of spuren) s.ende ??= performance.now();
}
export const laserAn = () => an;

// Knopf „Laserpointer“ für eine Werkzeugleiste, z. B. die der Tafel (initTafel({ leisteZusatz: [laserKnopf()] })).
// Knöpfe in der index.html bekommen stattdessen data-laser (Muster in README.md). Auch beim Zuschauen bedienbar.
export function laserKnopf() {
  const knopf = document.createElement('button');
  knopf.className = 'laser-btn live-frei laser-btn-fertig';   // fertig: initLaser hängt keinen zweiten Klick an
  knopf.type = 'button';
  knopf.dataset.laser = '';
  knopf.setAttribute('aria-pressed', String(an));
  knopf.title = 'Mit Apple Pencil oder Maus markieren (Taste L)';
  knopf.textContent = 'Laserpointer';
  knopf.addEventListener('click', () => setzeLaser(!an));
  return knopf;
}

// optionen: { renderer, camera, controls } der Simulation; tafel: { offen, zu, von } (tafelOffen, zuTafel,
// vonTafel aus gemeinsam/tafel/), wenn sie eine Tafel hat
export function initLaser(optionen) {
  stilLaden(new URL('./laser.css', import.meta.url));
  szene = { renderer: optionen.renderer, camera: optionen.camera, controls: optionen.controls };
  tafel = optionen.tafel ?? null;
  canvas = document.createElement('canvas');
  canvas.id = 'laserCanvas';
  canvas.setAttribute('aria-hidden', 'true');   // Spur über allem, nimmt selbst keine Berührungen an
  document.body.append(canvas);
  ctx = canvas.getContext('2d');
  groesse();
  window.addEventListener('resize', groesse);
  for (const knopf of document.querySelectorAll('[data-laser]:not(.laser-btn-fertig)')) {
    knopf.classList.add('laser-btn-fertig');
    knopf.addEventListener('click', () => setzeLaser(!an));
  }
  // Taste L am Laptop (nicht beim Tippen in ein Eingabefeld)
  window.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'l' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.('input, textarea, select')) return;
    setzeLaser(!an);
  });
}
