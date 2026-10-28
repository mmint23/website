// ------------------------------------------------------------------
// U-t-Diagramm: schreibt die Induktionsspannung mit (wie ein Schreiber bzw. Oszilloskop).
// Sichtbar sind die letzten PLOT_SECONDS Sekunden (Simulationszeit). Die U-Achse folgt zunächst dem Messbereich;
// an der U-Achse ziehen (oder dort das Mausrad drehen) streckt bzw. staucht sie, Doppeltippen stellt sie zurück.
// ------------------------------------------------------------------
import { PLOT_SECONDS, PLOT_SECONDS_WIND } from './config.js';
import { state } from './state.js';
import { clock, meterReading } from './physik.js';
import { formatNumber } from './hilfen.js';

const box = document.getElementById('plotBox');
const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const samples = [];               // { t, u } mit u in mV

// Abstände für die Beschriftung (in CSS-Pixeln, bei Grundgröße)
const PAD = { left: 52, right: 12, top: 14, bottom: 30 };
// Grundgröße der Zeichenfläche: Ist sie größer, wachsen Schrift, Linien und Ränder mit (bis dreifach)
const GRUND = { w: 420, h: 190 };
const titel = document.getElementById('plotHandle');

export function clearPlot() {
  samples.length = 0;
}

// ---------------- Fenster verschieben (überall anfassen) und vergrößern (Griff unten rechts), mit Maus oder Finger

const grip = document.getElementById('plotResize');
const RAND = 8;   // Abstand zum Fensterrand in px
const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));

// Lage fest in px angeben (statt der Vorgabe aus dem CSS, z. B. „unten links“)
function festlegen() {
  const r = box.getBoundingClientRect();
  Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', bottom: 'auto', right: 'auto', width: r.width + 'px' });
  return r;
}

function ziehen(element, beiBewegung) {
  element.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;                             // × in der Titelleiste
    if (element === box && e.target.closest('#plotResize')) return;   // Griff zum Vergrößern
    if (element === box && aufAchse(e)) return;                         // U-Achse strecken (siehe unten)
    e.preventDefault();
    element.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, rect: festlegen(), canvasH: canvas.clientHeight };
    const move = ev => beiBewegung(ev.clientX - start.x, ev.clientY - start.y, start);
    const ende = () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', ende);
      element.removeEventListener('pointercancel', ende);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', ende);
    element.addEventListener('pointercancel', ende);
  });
}

// Verschieben: ganz im Fenster bleiben
ziehen(box, (dx, dy, { rect }) => {
  box.style.left = clamp(rect.left + dx, RAND, innerWidth - rect.width - RAND) + 'px';
  box.style.top = clamp(rect.top + dy, RAND, innerHeight - rect.height - RAND) + 'px';
});

// ---------------- U-Achse strecken: an der Achse (links neben dem Diagramm) nach oben ziehen streckt die Kurve
// (kleinerer Bereich), nach unten staucht sie (größerer Bereich). Ohne Eingriff folgt die Achse dem Messbereich.

let achse = null;          // eigener Bereich der U-Achse in mV (null: wie der Messbereich)
let achseZu = null;        // Messbereich, zu dem achse gehört – ändert man ihn, folgt die Achse wieder ihm
let achsenBreite = PAD.left;
const ACHSE_MIN = 0.2, ACHSE_MAX = 200;
const bereich = () => (achse !== null && achseZu === state.range ? achse : state.range);
function aufAchse(e) {
  if (e.target !== canvas) return false;
  return e.clientX - canvas.getBoundingClientRect().left < achsenBreite;
}
function setzeAchse(wert) {
  achse = clamp(wert, ACHSE_MIN, ACHSE_MAX);
  achseZu = state.range;
}
canvas.addEventListener('pointerdown', e => {
  if (!aufAchse(e)) return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const start = { y: e.clientY, wert: bereich() };
  const move = ev => setzeAchse(start.wert * Math.exp((ev.clientY - start.y) / 120));
  const ende = () => {
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', ende);
    canvas.removeEventListener('pointercancel', ende);
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', ende);
  canvas.addEventListener('pointercancel', ende);
});
canvas.addEventListener('wheel', e => {
  if (!aufAchse(e)) return;
  e.preventDefault();
  setzeAchse(bereich() * Math.exp(e.deltaY / 400));
}, { passive: false });
canvas.addEventListener('dblclick', e => { if (aufAchse(e)) achse = null; });
// Doppeltippen mit dem Finger (dblclick kommt auf Tablets nicht immer an)
let letztesTippen = 0;
canvas.addEventListener('pointerup', e => {
  if (e.pointerType !== 'touch' || !aufAchse(e)) return;
  if (e.timeStamp - letztesTippen < 350) achse = null;
  letztesTippen = e.timeStamp;
});
// Mauszeiger zeigt, wo die Achse gezogen werden kann
canvas.addEventListener('pointermove', e => { canvas.style.cursor = aufAchse(e) ? 'ns-resize' : ''; });

// Schöne Schrittweite für die Beschriftung: 1, 2, 2,5 oder 5 mal Zehnerpotenz, etwa halber Bereich
function schritt(r) {
  const ziel = r / 2, p = 10 ** Math.floor(Math.log10(ziel));
  return [1, 2, 2.5, 5, 10].map(f => f * p).reduce((best, s) => (Math.abs(s - ziel) < Math.abs(best - ziel) ? s : best));
}
const stellen = s => (s >= 1 && Number.isInteger(s) ? 0 : s >= 0.1 && Number.isInteger(s * 10) ? 1 : 2);

// Größe setzen: Breite des Fensters und Höhe der Zeichenfläche, höchstens so groß wie das Browserfenster.
// Stößt das Diagramm an den rechten bzw. unteren Rand, weicht es nach links bzw. oben aus.
function setzeGroesse(left, top, breite, hoehe, rand) {
  const w = clamp(breite, 240, innerWidth - 2 * RAND);
  const h = clamp(hoehe, 90, innerHeight - 2 * RAND - rand);
  box.style.width = w + 'px';
  canvas.style.height = h + 'px';
  box.style.left = clamp(left, RAND, innerWidth - w - RAND) + 'px';
  box.style.top = clamp(top, RAND, innerHeight - h - rand - RAND) + 'px';
}

// Vergrößern am Griff unten rechts
ziehen(grip, (dx, dy, { rect, canvasH }) => {
  setzeGroesse(rect.left, rect.top, rect.width + dx, canvasH + dy, rect.height - canvasH);
  gross = false;
  $groß.setAttribute('aria-pressed', 'false');
});

// Knopf ⤢: fast so groß wie das Browserfenster (für den Beamer); nochmal gedrückt zurück zur vorherigen Größe
const $groß = document.getElementById('plotBigBtn');
let gross = false, vorher = null;
$groß.addEventListener('click', () => {
  const rect = festlegen();
  const rand = rect.height - canvas.clientHeight;
  if (!gross) {
    vorher = { left: rect.left, top: rect.top, w: rect.width, h: canvas.clientHeight };
    setzeGroesse(0, 0, innerWidth, innerHeight, rand);
  } else if (vorher) {
    setzeGroesse(vorher.left, vorher.top, vorher.w, vorher.h, rand);
  }
  gross = !gross;
  $groß.setAttribute('aria-pressed', String(gross));
});

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { w, h };
}

// Neuen Messpunkt aufnehmen und zeichnen (jedes Bild)
export function updatePlot() {
  box.hidden = !state.showPlot;
  const now = clock.t;
  const seconds = state.drive === 'wind' ? PLOT_SECONDS_WIND : PLOT_SECONDS;
  if (!samples.length || now > samples.at(-1).t) samples.push({ t: now, u: meterReading() });
  while (samples.length && samples[0].t < now - PLOT_SECONDS_WIND - 0.5) samples.shift();
  if (box.hidden) return;

  const { w, h } = resizeCanvas();
  // Maßstab für Schrift, Linien und Ränder: wächst mit der Größe der Zeichenfläche
  const k = clamp(Math.min(w / GRUND.w, h / GRUND.h), 1, 3);
  titel.style.fontSize = 0.85 * Math.min(k, 1.6) + 'rem';
  // Wird das Fenster (z. B. durch die größere Überschrift) höher als der Bildschirm, die Zeichenfläche kürzen
  if (box.style.top) {
    const ueber = box.getBoundingClientRect().bottom - (innerHeight - RAND);
    if (ueber > 0.5) canvas.style.height = Math.max(90, canvas.clientHeight - ueber) + 'px';
  }
  const x0 = PAD.left * k, x1 = w - PAD.right * k, y0 = PAD.top * k, y1 = h - PAD.bottom * k;
  achsenBreite = x0;
  const range = bereich();
  const X = t => x1 - (now - t) / seconds * (x1 - x0);
  const Y = u => (y0 + y1) / 2 - Math.max(-1.05, Math.min(1.05, u / range)) * (y1 - y0) / 2;

  ctx.clearRect(0, 0, w, h);
  ctx.font = `${12 * k}px system-ui, sans-serif`;
  ctx.lineWidth = k;
  // Raster: U in schönen Schritten bis ±Bereich, t jede Sekunde (wandert mit)
  ctx.strokeStyle = '#d5dce3';
  ctx.fillStyle = '#4a5866';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const s = schritt(range), n = Math.floor(range / s + 1e-6);
  for (let i = -n; i <= n; i++) {
    const u = i * s, y = Y(u);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.fillText((u < 0 ? '−' : '') + formatNumber(Math.abs(u), stellen(s)), x0 - 6 * k, y);
  }
  // Hinweis, dass die Achse gezogen wurde (Doppeltippen: zurück zum Messbereich)
  if (range !== state.range) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#1d4f91';
    ctx.font = `${11 * k}px system-ui, sans-serif`;
    ctx.fillText('U-Achse verändert · Doppeltippen: zurück', x0 + 6 * k, y0);
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tick = seconds > 6 ? 2 : 1;
  for (let t = tick * Math.ceil((now - seconds) / tick); t <= now; t += tick) {
    if (t < 0) continue;
    const x = X(t);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    ctx.fillText(String(t), x, y1 + 4 * k);
  }
  // Achsen
  ctx.strokeStyle = '#1d2733';
  ctx.lineWidth = 1.5 * k;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 4 * k);
  ctx.lineTo(x0, y1);
  ctx.moveTo(x0, Y(0));
  ctx.lineTo(x1 + 4 * k, Y(0));
  ctx.stroke();
  ctx.fillStyle = '#1d2733';
  ctx.textAlign = 'left';
  ctx.fillText('t in s', x1 - 30 * k, Y(0) + 4 * k);

  // Messkurve
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0 - 2 * k, x1 - x0, y1 - y0 + 4 * k);
  ctx.clip();
  ctx.strokeStyle = '#1d4f91';
  ctx.lineWidth = 2.2 * k;
  ctx.beginPath();
  samples.forEach(({ t, u }, i) => (i ? ctx.lineTo(X(t), Y(u)) : ctx.moveTo(X(t), Y(u))));
  ctx.stroke();
  ctx.restore();
}
