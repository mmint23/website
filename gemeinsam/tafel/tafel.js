// ------------------------------------------------------------------
// Zeichentafel: großes Fenster mit einem festen Bild der Simulation, auf dem man mit Apple Pencil, Finger oder
// Maus zeichnet (Stifte, Radierer, Freihand oder gerader Pfeil, Rückgängig, Alles löschen).
// Fenster und Aussehen legt initTafel() selbst an; die Simulation gibt nur Bild und Stifte vor (siehe README.md).
//
// Was auf der Tafel steht, ist ein „Dokument“ { striche, verlauf, bearbeitet }: normalerweise die eigene Zeichnung
// (im Browser gespeichert); die Lehrerseite (abgabe.js) legt stattdessen eine Arbeitskopie einer Abgabe auf.
// Zeichnen: Stiftdruck bestimmt die Strichbreite; sobald ein Stift benutzt wurde, werden Berührungen mit
// Finger/Handballen ignoriert.
// ------------------------------------------------------------------
import { TAFEL_BREITE, zeichneStrich, zeichneStueck, zeichneAlle, getroffen } from './striche.js';
import { stilLaden } from '../stil.js';

const $ = id => document.getElementById(id);
// Bild aus der Offline-Version (eingebettet, globalThis.OFFLINE.dateien) oder wie angegeben
const datei = pfad => globalThis.OFFLINE?.dateien?.[pfad] ?? pfad;
const RADIERER = 18;          // Radius des Radierers in Tafeleinheiten
const MIN_ABSTAND = 1.2;      // Punkte eines Strichs mindestens so weit auseinander (spart Daten)

// Stifte, wenn die Simulation keine eigenen vorgibt
const STANDARD_STIFTE = [
  { name: 'schwarz', farbe: '#1d2733', text: 'Schwarz' },
  { name: 'rot', farbe: '#c62828', text: 'Rot' },
  { name: 'blau', farbe: '#1565c0', text: 'Blau' },
  { name: 'gruen', farbe: '#2e7d32', text: 'Grün' },
];

let optionen = null;   // { id, bild, bildText, seitenverhaeltnis, stifte } aus initTafel
export const tafelId = () => optionen.id;

// Höhe der Tafel in Tafeleinheiten (Breite: TAFEL_BREITE); aus den Optionen oder aus dem Bild
let hoehe = TAFEL_BREITE / 1.6;
export const tafelHoehe = () => hoehe;

export const tafelBild = new Image();
export const bildGeladen = new Promise(resolve => {
  tafelBild.onload = resolve;
  tafelBild.onerror = resolve;
});

// ---------------- Dokumente

const zustand = {
  open: false,      // groß geöffnet
  color: null,      // Name des gewählten Stifts
  eraser: false,
  mode: 'frei',     // 'frei' (Freihand) oder 'pfeil' (gerader Pfeil)
  eigene: [],       // eigene Zeichnung (Striche, Format siehe striche.js); im Browser gespeichert
  dokument: null,   // was gerade auf der Tafel liegt
};
const speicherSchluessel = () => optionen.id + '-tafel-v1';

function ladeEigenes() {
  try {
    const daten = JSON.parse(localStorage.getItem(speicherSchluessel()) ?? '[]');
    if (Array.isArray(daten)) return daten;
  } catch { /* leer anfangen */ }
  return [];
}
export const eigenesDokument = {
  eigen: true,
  verlauf: [],
  get striche() { return zustand.eigene; },
  set striche(striche) { zustand.eigene = striche; },
};
zustand.dokument = eigenesDokument;

// Rückrufe: aufAenderung nach jeder Bearbeitung des aktuellen Dokuments (abgabe.js),
// aufAnzeige immer, wenn sich ändert, was auf der Tafel zu sehen ist (z. B. für ein Abbild in der Szene)
const beiAenderung = [], beiAnzeige = [];
export const aufAenderung = rueckruf => beiAenderung.push(rueckruf);
export const aufAnzeige = rueckruf => beiAnzeige.push(rueckruf);
const anzeigeMelden = () => { for (const rueckruf of beiAnzeige) rueckruf(); };

export const aktuellesDokument = () => zustand.dokument;

// Anderes Dokument auf die Tafel legen (Lehrerseite: Abgabe bzw. wieder die eigene Tafel)
export function zeigeDokument(neu) {
  abbrechen();
  zustand.dokument = neu;
  neuZeichnen();
}

// Nach außen (z. B. „Original wiederherstellen“) geänderte Striche anzeigen
export function dokumentGeaendert() {
  neuZeichnen();
}

function geaendert() {
  const dok = zustand.dokument;
  dok.bearbeitet = true;
  if (dok.eigen) {
    try {
      localStorage.setItem(speicherSchluessel(), JSON.stringify(dok.striche));
    } catch { /* ohne Speicher geht es auch */ }
  }
  anzeigeMelden();
  for (const rueckruf of beiAenderung) rueckruf(dok);
}

// ---------------- Großes Zeichenfenster

let fenster, bereich, blatt, canvas, ctx;
const basis = document.createElement('canvas');   // fertige Striche (Zwischenspeicher)
const basisCtx = basis.getContext('2d');

let strich = null;       // Strich, der gerade gezeichnet wird
let radiert = null;      // beim laufenden Radieren entfernte Striche
let aktiv = null;        // { id, typ } des zeichnenden Zeigers
let stiftGesehen = false;

export const tafelOffen = () => zustand.open;

export function oeffneTafel() {
  zustand.open = true;
  fenster.hidden = false;
  groesse();
}
export function schliesseTafel() {
  abbrechen();
  zustand.open = false;
  fenster.hidden = true;
  anzeigeMelden();
}

// Blatt so groß wie möglich im Seitenverhältnis des Tafelbilds
function groesse() {
  if (!zustand.open) return;
  const w = Math.max(1, Math.floor(Math.min(bereich.clientWidth, bereich.clientHeight * TAFEL_BREITE / hoehe)));
  const h = Math.floor(w * hoehe / TAFEL_BREITE);
  blatt.style.width = w + 'px';
  blatt.style.height = h + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = basis.width = Math.round(w * dpr);
  canvas.height = basis.height = Math.round(h * dpr);
  neuZeichnen();
}

const massstab = () => canvas.width / TAFEL_BREITE;

function basisNeu() {
  basisCtx.setTransform(1, 0, 0, 1, 0, 0);
  basisCtx.clearRect(0, 0, basis.width, basis.height);
  zeichneAlle(basisCtx, zustand.dokument.striche, basis.width);
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
  anzeigeMelden();
  if (!zustand.open) return;
  basisNeu();
  anzeigen();
}

function punkt(event) {
  const r = canvas.getBoundingClientRect();
  const druck = event.pointerType === 'pen' && event.pressure > 0 ? event.pressure : 0.5;
  return { x: (event.clientX - r.left) / r.width * TAFEL_BREITE, y: (event.clientY - r.top) / r.height * hoehe, pr: druck };
}

function radiere(p) {
  const treffer = zustand.dokument.striche.filter(s => getroffen(s, p, RADIERER));
  if (!treffer.length) return;
  zustand.dokument.striche = zustand.dokument.striche.filter(s => !treffer.includes(s));
  radiert.push(...treffer);
  basisNeu();
  anzeigen();
}

// Laufenden Strich verwerfen (z. B. Handballen, bevor der Stift aufsetzt)
function abbrechen() {
  if (radiert?.length) zustand.dokument.striche.push(...radiert);
  strich = radiert = aktiv = null;
}

function zeichnenEinrichten() {
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
    if (zustand.eraser) {
      radiert = [];
      radiere(p);
      return;
    }
    const c = optionen.stifte.find(s => s.name === zustand.color).farbe;
    strich = zustand.mode === 'pfeil' ? { k: 'arrow', c, a: p, b: p } : { k: 'free', c, p: [p] };
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
      zustand.dokument.striche.push(s);
      zustand.dokument.verlauf.push({ neu: [s] });
      basisCtx.setTransform(massstab(), 0, 0, massstab(), 0, 0);
      zeichneStrich(basisCtx, s);
      anzeigen();
      geaendert();
    }
    if (radiert) {
      if (radiert.length) {
        zustand.dokument.verlauf.push({ weg: radiert });
        geaendert();
      }
      radiert = null;
    }
    if (zustand.dokument.verlauf.length > 100) zustand.dokument.verlauf.shift();
  }
  canvas.addEventListener('pointerup', ende);
  canvas.addEventListener('pointercancel', ende);
  // iOS: kein Kontextmenü, keine Lupe beim langen Drücken
  canvas.addEventListener('contextmenu', event => event.preventDefault());
}

function rueckgaengig() {
  const schritt = zustand.dokument.verlauf.pop();
  if (!schritt) return;
  if (schritt.neu) zustand.dokument.striche = zustand.dokument.striche.filter(s => !schritt.neu.includes(s));
  else zustand.dokument.striche.push(...schritt.weg);
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

// ---------------- Aufbau

const html = text => String(text).replace(/[&<>"]/g, z => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z]);

function fensterAnlegen() {
  const stifte = optionen.stifte.map((s, i) => `
        <button data-farbe="${html(s.name)}" type="button" aria-pressed="${i === 0}"><span class="dot" style="background:${html(s.farbe)}"></span>${html(s.text ?? s.name)}</button>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
  <div class="tafel-overlay" id="tafelOverlay" hidden>
    <div class="tafel-leiste" role="toolbar" aria-label="Zeichenwerkzeuge">
      <div class="gruppe">${stifte}
        <button id="tafelRadierer" type="button" aria-pressed="false">Radierer</button>
      </div>
      <div class="gruppe">
        <button data-modus="frei" type="button" aria-pressed="true">Freihand</button>
        <button data-modus="pfeil" type="button" aria-pressed="false">Gerader Pfeil</button>
      </div>
      <div class="gruppe">
        <button id="tafelUndo" type="button">Rückgängig</button>
        <button id="tafelLeeren" class="gefahr" type="button">Alles löschen</button>
      </div>
      <div class="gruppe" id="tafelSchueler" hidden>
        <input id="tafelName" type="text" placeholder="Name/Kürzel (freiwillig)" autocomplete="off" aria-label="Name oder Kürzel" />
        <button id="tafelTeilen" class="haupt" type="button">Teilen</button>
        <span class="tafel-status" id="tafelTeilenStatus" aria-live="polite"></span>
      </div>
      <div class="gruppe" id="tafelLehrer" hidden>
        <span class="tafel-titel" id="tafelTitel"></span>
        <button id="tafelOriginal" type="button">Original wiederherstellen</button>
        <button id="tafelAbgabeLoeschen" class="gefahr" type="button">Abgabe löschen</button>
      </div>
      <button id="tafelSchliessen" class="schliessen" type="button">Schließen ✕</button>
    </div>
    <div class="tafel-bereich" id="tafelBereich">
      <div class="tafel-blatt" id="tafelBlatt">
        <img alt="" draggable="false" />
        <canvas id="tafelCanvas" aria-label="Zeichenfläche der Tafel"></canvas>
      </div>
    </div>
  </div>`);
  fenster = $('tafelOverlay');
  bereich = $('tafelBereich');
  blatt = $('tafelBlatt');
  canvas = $('tafelCanvas');
  ctx = canvas.getContext('2d');
  const img = blatt.querySelector('img');
  img.src = datei(optionen.bild);
  img.alt = optionen.bildText ?? '';
  // eigene Knöpfe der Simulation (z. B. Laserpointer) vor „Schließen“
  for (const element of optionen.leisteZusatz ?? []) $('tafelSchliessen').before(element);
}

// optionen: { id, bild, bildText?, seitenverhaeltnis?, stifte?, leisteZusatz? } – siehe README.md
export function initTafel(neu) {
  if (optionen) throw new Error('initTafel() wurde schon aufgerufen');
  if (!neu?.id || !neu?.bild) throw new Error('initTafel() braucht mindestens id und bild');
  optionen = { ...neu, stifte: neu.stifte?.length ? neu.stifte : STANDARD_STIFTE };
  zustand.color = optionen.stifte[0].name;
  zustand.eigene = ladeEigenes();
  stilLaden(new URL('./tafel.css', import.meta.url));

  if (optionen.seitenverhaeltnis) hoehe = TAFEL_BREITE / optionen.seitenverhaeltnis;
  tafelBild.src = datei(optionen.bild);
  bildGeladen.then(() => {
    if (!optionen.seitenverhaeltnis && tafelBild.naturalWidth) {
      hoehe = TAFEL_BREITE * tafelBild.naturalHeight / tafelBild.naturalWidth;
      groesse();
    }
    anzeigeMelden();
  });

  fensterAnlegen();
  zeichnenEinrichten();

  const farbKnoepfe = [...fenster.querySelectorAll('[data-farbe]')];
  const radiererKnopf = $('tafelRadierer');
  const modusKnoepfe = [...fenster.querySelectorAll('[data-modus]')];
  for (const knopf of farbKnoepfe) {
    knopf.addEventListener('click', () => {
      zustand.color = knopf.dataset.farbe;
      zustand.eraser = false;
      gedrueckt([...farbKnoepfe, radiererKnopf], knopf);
    });
  }
  radiererKnopf.addEventListener('click', () => {
    zustand.eraser = true;
    gedrueckt([...farbKnoepfe, radiererKnopf], radiererKnopf);
  });
  for (const knopf of modusKnoepfe) {
    knopf.addEventListener('click', () => {
      zustand.mode = knopf.dataset.modus;
      gedrueckt(modusKnoepfe, knopf);
      if (zustand.eraser) farbKnoepfe.find(k => k.dataset.farbe === zustand.color).click();
    });
  }
  $('tafelUndo').addEventListener('click', rueckgaengig);
  mitRueckfrage($('tafelLeeren'), 'Wirklich löschen?', () => {
    if (!zustand.dokument.striche.length) return;
    zustand.dokument.verlauf.push({ weg: zustand.dokument.striche });
    zustand.dokument.striche = [];
    neuZeichnen();
    geaendert();
  });
  $('tafelSchliessen').addEventListener('click', schliesseTafel);
  window.addEventListener('keydown', event => {
    if (!zustand.open || event.target.matches?.('input')) return;
    if (event.key === 'Escape') schliesseTafel();
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      rueckgaengig();
    }
  });
  new ResizeObserver(groesse).observe(bereich);
}
