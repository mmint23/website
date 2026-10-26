// ------------------------------------------------------------------
// Tafel im Erklärmodus: kleine Tafel in der Szene (hinter dem Magneten) mit einem festen Bild des Leiters im
// Magnetfeld (bilder/tafel.jpg). Antippen öffnet sie groß; dort zeichnet man mit Apple Pencil, Finger oder Maus.
//
// Zustand (Werkzeug, geöffnet, Zeichnungen) liegt in state.tafel. Was auf der Tafel steht, ist ein „Dokument“
// { striche, verlauf, bearbeitet }: normalerweise die eigene Zeichnung (state.tafel.eigene, im Browser gespeichert);
// die Lehrerseite (abgabe.js) legt stattdessen eine Arbeitskopie einer Abgabe auf.
// Zeichnen: Stiftdruck bestimmt die Strichbreite; sobald ein Stift benutzt wurde, werden Berührungen mit
// Finger/Handballen ignoriert.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { TAFEL, FARBEN, zeichneStrich, zeichneStueck, zeichneAlle, getroffen } from './striche.js';
import { axisHeight } from './config.js';
import { state } from './state.js';
import { mat } from './materialien.js';
import { addMesh } from './hilfen.js';
import { scene, camera, renderer } from './szene.js';

const $ = id => document.getElementById(id);
const SPEICHER = 'leiterschaukel-tafel-v1';
const RADIERER = 18;          // Radius des Radierers in Tafeleinheiten
const MIN_ABSTAND = 1.2;      // Punkte eines Strichs mindestens so weit auseinander (spart Daten)

export const tafelBild = new Image();
export const bildGeladen = new Promise(resolve => {
  tafelBild.onload = resolve;
  tafelBild.onerror = resolve;
});
tafelBild.src = 'bilder/tafel.jpg';

// ---------------- Dokumente

function ladeEigenes() {
  try {
    const daten = JSON.parse(localStorage.getItem(SPEICHER) ?? '[]');
    if (Array.isArray(daten)) return daten;
  } catch { /* leer anfangen */ }
  return [];
}
const tafel = state.tafel;
tafel.eigene = ladeEigenes();
export const eigenesDokument = {
  eigen: true,
  verlauf: [],
  get striche() { return tafel.eigene; },
  set striche(striche) { tafel.eigene = striche; },
};
tafel.dokument = eigenesDokument;
const beiAenderung = [];   // Rückrufe (abgabe.js): nach jeder Änderung des aktuellen Dokuments
export const aufAenderung = rueckruf => beiAenderung.push(rueckruf);

export const aktuellesDokument = () => tafel.dokument;

// Anderes Dokument auf die Tafel legen (Lehrerseite: Abgabe bzw. wieder die eigene Tafel)
export function zeigeDokument(neu) {
  abbrechen();
  tafel.dokument = neu;
  neuZeichnen();
}

// Nach außen (z. B. „Original wiederherstellen“) geänderte Striche anzeigen
export function dokumentGeaendert() {
  neuZeichnen();
}

function geaendert() {
  const dok = tafel.dokument;
  dok.bearbeitet = true;
  if (dok.eigen) {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(dok.striche));
    } catch { /* ohne Speicher geht es auch */ }
  }
  texturVeraltet = true;
  for (const rueckruf of beiAenderung) rueckruf(dok);
}

// ---------------- Kleine Tafel in der Szene

const BREITE = 17.6, HOEHE = 11;
const texturCanvas = document.createElement('canvas');
texturCanvas.width = 1280;
texturCanvas.height = 800;
const textur = new THREE.CanvasTexture(texturCanvas);
textur.colorSpace = THREE.SRGBColorSpace;
textur.anisotropy = 8;
let texturVeraltet = true;

const tafel3d = new THREE.Group();
scene.add(tafel3d);
const rahmen = addMesh(new THREE.BoxGeometry(BREITE + 1.6, HOEHE + 1.6, 0.8), mat.wood, tafel3d);
rahmen.position.z = -0.45;
const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(BREITE, HOEHE),
  new THREE.MeshBasicMaterial({ map: textur, toneMapped: false }));
tafel3d.add(flaeche);
function texturAktualisieren() {
  const ctx = texturCanvas.getContext('2d');
  ctx.fillStyle = '#e8edf2';
  ctx.fillRect(0, 0, texturCanvas.width, texturCanvas.height);
  if (tafelBild.naturalWidth) ctx.drawImage(tafelBild, 0, 0, texturCanvas.width, texturCanvas.height);
  zeichneAlle(ctx, tafel.dokument.striche, texturCanvas.width, 1.6);
  // Hinweis als Band am unteren Rand (nur in der Szene, nicht auf der großen Tafel)
  ctx.fillStyle = 'rgba(92, 58, 28, 0.85)';
  ctx.fillRect(0, texturCanvas.height - 84, texturCanvas.width, 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tafel – antippen zum Zeichnen', texturCanvas.width / 2, texturCanvas.height - 40);
  textur.needsUpdate = true;
}
bildGeladen.then(() => { texturVeraltet = true; });

// Jedes Bild: nur im Erklärmodus sichtbar, unter und hinter dem Magneten (dort ist in der Erklär-Ansicht
// Platz zwischen den Bedienfeldern), zur Erklär-Kamera gedreht
const blickpunkt = new THREE.Vector3();
export function syncTafel() {
  tafel3d.visible = state.explain;
  if (!state.explain) return;
  const axisY = axisHeight(state.setup, state.longMagnet);
  tafel3d.position.set(4, axisY - 26, -17);
  tafel3d.lookAt(blickpunkt.set(-42, axisY + 14, 42));
  if (texturVeraltet) {
    texturVeraltet = false;
    texturAktualisieren();
  }
}

// Antippen der Tafel in der Szene (kurzer Tipp, kein Ziehen – sonst dreht sich wie gewohnt die Ansicht)
{
  const canvas3d = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const zeiger = new THREE.Vector2();
  const trifft = event => {
    if (!tafel3d.visible) return false;
    const r = canvas3d.getBoundingClientRect();
    zeiger.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(zeiger, camera);
    return raycaster.intersectObject(flaeche, false).length > 0;
  };
  let tipp = null;
  canvas3d.addEventListener('pointerdown', event => {
    tipp = trifft(event) ? { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now() } : null;
  });
  canvas3d.addEventListener('pointerup', event => {
    if (!tipp || tipp.id !== event.pointerId) return;
    const kurz = performance.now() - tipp.t < 600 && Math.hypot(event.clientX - tipp.x, event.clientY - tipp.y) < 10;
    tipp = null;
    if (kurz && trifft(event)) oeffneTafel();
  });
  canvas3d.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' && event.buttons === 0 && trifft(event)) canvas3d.style.cursor = 'pointer';
  });
}

// ---------------- Großes Zeichenfenster

const fenster = $('tafelOverlay');
const bereich = $('tafelBereich');
const blatt = $('tafelBlatt');
const canvas = $('tafelCanvas');
const ctx = canvas.getContext('2d');
const basis = document.createElement('canvas');   // fertige Striche (Zwischenspeicher)
const basisCtx = basis.getContext('2d');

let strich = null;       // Strich, der gerade gezeichnet wird
let radiert = null;      // beim laufenden Radieren entfernte Striche
let aktiv = null;        // { id, typ } des zeichnenden Zeigers
let stiftGesehen = false;

export const tafelOffen = () => tafel.open;

export function oeffneTafel() {
  tafel.open = true;
  fenster.hidden = false;
  groesse();
}
export function schliesseTafel() {
  abbrechen();
  tafel.open = false;
  fenster.hidden = true;
  texturVeraltet = true;
}

// Blatt so groß wie möglich im Seitenverhältnis des Tafelbilds
function groesse() {
  if (!tafel.open) return;
  const w = Math.max(1, Math.floor(Math.min(bereich.clientWidth, bereich.clientHeight * TAFEL.W / TAFEL.H)));
  const h = Math.floor(w * TAFEL.H / TAFEL.W);
  blatt.style.width = w + 'px';
  blatt.style.height = h + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = basis.width = Math.round(w * dpr);
  canvas.height = basis.height = Math.round(h * dpr);
  neuZeichnen();
}

const massstab = () => canvas.width / TAFEL.W;

function basisNeu() {
  basisCtx.setTransform(1, 0, 0, 1, 0, 0);
  basisCtx.clearRect(0, 0, basis.width, basis.height);
  zeichneAlle(basisCtx, tafel.dokument.striche, basis.width);
}
function anzeigen() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(basis, 0, 0);
  if (strich) {
    ctx.setTransform(massstab(), 0, 0, massstab(), 0, 0);
    zeichneStrich(ctx, strich);
  }
}
function neuZeichnen() {
  texturVeraltet = true;
  if (!tafel.open) return;
  basisNeu();
  anzeigen();
}

function punkt(event) {
  const r = canvas.getBoundingClientRect();
  const druck = event.pointerType === 'pen' && event.pressure > 0 ? event.pressure : 0.5;
  return { x: (event.clientX - r.left) / r.width * TAFEL.W, y: (event.clientY - r.top) / r.height * TAFEL.H, pr: druck };
}

function radiere(p) {
  const treffer = tafel.dokument.striche.filter(s => getroffen(s, p, RADIERER));
  if (!treffer.length) return;
  tafel.dokument.striche = tafel.dokument.striche.filter(s => !treffer.includes(s));
  radiert.push(...treffer);
  basisNeu();
  anzeigen();
}

// Laufenden Strich verwerfen (z. B. Handballen, bevor der Stift aufsetzt)
function abbrechen() {
  if (radiert?.length) tafel.dokument.striche.push(...radiert);
  strich = radiert = aktiv = null;
}

canvas.addEventListener('pointerdown', event => {
  if (event.pointerType === 'pen') stiftGesehen = true;
  if (event.pointerType === 'touch' && stiftGesehen) return;   // Handballen ignorieren
  if (aktiv) {
    if (!(event.pointerType === 'pen' && aktiv.typ !== 'pen')) return;
    abbrechen();
    neuZeichnen();
  }
  event.preventDefault();
  aktiv = { id: event.pointerId, typ: event.pointerType };
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch { /* Zeiger schon weg */ }
  const p = punkt(event);
  if (tafel.eraser) {
    radiert = [];
    radiere(p);
    return;
  }
  const c = FARBEN[tafel.color];
  strich = tafel.mode === 'pfeil' ? { k: 'arrow', c, a: p, b: p } : { k: 'free', c, p: [p] };
  anzeigen();
});

canvas.addEventListener('pointermove', event => {
  if (!aktiv || event.pointerId !== aktiv.id) return;
  // alle Zwischenpunkte des Stifts (Apple Pencil liefert mehr Punkte als Bilder); leer → nur dieses Ereignis
  const zusammengefasst = event.getCoalescedEvents?.();
  const ereignisse = zusammengefasst?.length ? zusammengefasst : [event];
  if (radiert) {
    for (const e of ereignisse) radiere(punkt(e));
    return;
  }
  if (!strich) return;
  if (strich.k === 'arrow') {
    strich.b = punkt(event);
    anzeigen();
    return;
  }
  // Freihand: nur die neuen Teilstücke zeichnen
  ctx.setTransform(massstab(), 0, 0, massstab(), 0, 0);
  for (const e of ereignisse) {
    const p = punkt(e), letzter = strich.p[strich.p.length - 1];
    if (Math.hypot(p.x - letzter.x, p.y - letzter.y) < MIN_ABSTAND) continue;
    strich.p.push(p);
    zeichneStueck(ctx, strich, strich.p.length - 1);
  }
});

function ende(event) {
  if (!aktiv || event.pointerId !== aktiv.id) return;
  aktiv = null;
  if (strich) {
    const s = strich;
    strich = null;
    tafel.dokument.striche.push(s);
    tafel.dokument.verlauf.push({ neu: [s] });
    basisCtx.setTransform(massstab(), 0, 0, massstab(), 0, 0);
    zeichneStrich(basisCtx, s);
    anzeigen();
    geaendert();
  }
  if (radiert) {
    if (radiert.length) {
      tafel.dokument.verlauf.push({ weg: radiert });
      geaendert();
    }
    radiert = null;
  }
  if (tafel.dokument.verlauf.length > 100) tafel.dokument.verlauf.shift();
}
canvas.addEventListener('pointerup', ende);
canvas.addEventListener('pointercancel', ende);
// iOS: kein Kontextmenü, keine Lupe beim langen Drücken
canvas.addEventListener('contextmenu', event => event.preventDefault());

function rueckgaengig() {
  const schritt = tafel.dokument.verlauf.pop();
  if (!schritt) return;
  if (schritt.neu) tafel.dokument.striche = tafel.dokument.striche.filter(s => !schritt.neu.includes(s));
  else tafel.dokument.striche.push(...schritt.weg);
  neuZeichnen();
  geaendert();
}

function gedrueckt(knoepfe, aktivKnopf) {
  for (const k of knoepfe) k.setAttribute('aria-pressed', String(k === aktivKnopf));
}

// Knopf mit Rückfrage: erster Klick „Wirklich …?“, zweiter Klick innerhalb von 3 s führt aus
export function mitRueckfrage(knopf, frage, aktion) {
  const text = knopf.textContent;
  let zeit = null;
  knopf.addEventListener('click', () => {
    if (!knopf.classList.contains('scharf')) {
      knopf.classList.add('scharf');
      knopf.textContent = frage;
      zeit = setTimeout(() => {
        knopf.classList.remove('scharf');
        knopf.textContent = text;
      }, 3000);
      return;
    }
    clearTimeout(zeit);
    knopf.classList.remove('scharf');
    knopf.textContent = text;
    aktion();
  });
}

export function initTafel() {
  const farbKnoepfe = [...fenster.querySelectorAll('[data-farbe]')];
  const radiererKnopf = $('tafelRadierer');
  const modusKnoepfe = [...fenster.querySelectorAll('[data-modus]')];
  for (const knopf of farbKnoepfe) {
    knopf.addEventListener('click', () => {
      tafel.color = knopf.dataset.farbe;
      tafel.eraser = false;
      gedrueckt([...farbKnoepfe, radiererKnopf], knopf);
    });
  }
  radiererKnopf.addEventListener('click', () => {
    tafel.eraser = true;
    gedrueckt([...farbKnoepfe, radiererKnopf], radiererKnopf);
  });
  for (const knopf of modusKnoepfe) {
    knopf.addEventListener('click', () => {
      tafel.mode = knopf.dataset.modus;
      gedrueckt(modusKnoepfe, knopf);
      if (tafel.eraser) farbKnoepfe.find(k => k.dataset.farbe === tafel.color).click();
    });
  }
  $('tafelUndo').addEventListener('click', rueckgaengig);
  mitRueckfrage($('tafelLeeren'), 'Wirklich löschen?', () => {
    if (!tafel.dokument.striche.length) return;
    tafel.dokument.verlauf.push({ weg: tafel.dokument.striche });
    tafel.dokument.striche = [];
    neuZeichnen();
    geaendert();
  });
  $('tafelSchliessen').addEventListener('click', schliesseTafel);
  $('tafelBtn').addEventListener('click', oeffneTafel);
  window.addEventListener('keydown', event => {
    if (!tafel.open || event.target.matches?.('input')) return;
    if (event.key === 'Escape') schliesseTafel();
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      rueckgaengig();
    }
  });
  new ResizeObserver(groesse).observe(bereich);
}
