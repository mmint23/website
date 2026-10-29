// ------------------------------------------------------------------
// U–t-Diagramm: Spannung am Messgerät. Sichtbar sind die letzten PLOT_SECONDS Sekunden (Simulationszeit; Antrieb
// „Wind“: PLOT_SECONDS_WIND); rechts bleibt ein schmaler Rand für den aktuellen Punkt.
// Bei zwei Spulen: U₁ und U₂ dünn, U (Summe am Messgerät) dick.
// ------------------------------------------------------------------
import { PLOT_SECONDS, PLOT_SECONDS_WIND } from './config.js';
import { state } from './state.js';
import { clock, coilVoltage, meterVoltage } from './physik.js';
import { formatNumber } from './hilfen.js';

const $ = id => document.getElementById(id);
const box = $('plotBox');
const plots = { u: $('plotU') };
const samples = [];               // { t, u, u1, u2 (V) }

const PAD = { left: 52, right: 34, top: 10, bottom: 22 };
const FARBE = { s1: '#1d4f91', s2: '#e65100', summe: '#1d2733' };

function resizeCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w, h };
}

// Sichtbare Zeitspanne: beim Antrieb „Wind“ länger (der Rotor dreht langsam)
const sekunden = () => (state.drive === 'wind' ? PLOT_SECONDS_WIND : PLOT_SECONDS);

const zahl = (value, digits) => (value < 0 ? '−' : '') + formatNumber(Math.abs(value), digits);

// Achsen, Raster und Beschriftung; liefert die Umrechnung in Pixel
function rahmen(canvas, max, ticks, digits, mitZeit) {
  const { ctx, w, h } = resizeCanvas(canvas);
  const dauer = sekunden();
  const x0 = PAD.left, x1 = w - PAD.right, y0 = PAD.top, y1 = h - PAD.bottom;
  const now = clock.t;
  const X = t => x1 - (now - t) / dauer * (x1 - x0);
  const Y = v => (y0 + y1) / 2 - Math.max(-1.08, Math.min(1.08, v / max)) * (y1 - y0) / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.font = '12px system-ui, sans-serif';
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#d5dce3';
  ctx.fillStyle = '#4a5866';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of ticks) {
    ctx.beginPath();
    ctx.moveTo(x0, Y(v));
    ctx.lineTo(x1, Y(v));
    ctx.stroke();
    ctx.fillText(zahl(v, digits), x0 - 6, Y(v));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let s = Math.ceil(now - dauer); s <= now; s++) {
    if (s < 0) continue;
    ctx.beginPath();
    ctx.moveTo(X(s), y0);
    ctx.lineTo(X(s), y1);
    ctx.stroke();
    if (mitZeit) ctx.fillText(String(s), X(s), y1 + 4);
  }
  ctx.strokeStyle = '#1d2733';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 2);
  ctx.lineTo(x0, y1);
  ctx.moveTo(x0, Y(0));
  ctx.lineTo(x1 + 4, Y(0));
  ctx.stroke();
  if (mitZeit) {
    ctx.fillStyle = '#1d2733';
    ctx.textAlign = 'right';
    ctx.fillText('t in s', x1 + 30, y1 + 4);
  }
  // „jetzt“: senkrechte Linie am aktuellen Zeitpunkt
  ctx.strokeStyle = '#9aa7b4';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(X(now), y0);
  ctx.lineTo(X(now), y1);
  ctx.stroke();
  ctx.setLineDash([]);
  return { ctx, X, Y, x0, x1, y0, y1 };
}

function kurve(p, key, farbe, breite, strich = []) {
  const { ctx, X, Y, x0, x1, y0, y1 } = p;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0 - 2, x1 - x0, y1 - y0 + 4);
  ctx.clip();
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  ctx.setLineDash(strich);
  ctx.beginPath();
  samples.forEach((s, i) => (i ? ctx.lineTo(X(s.t), Y(s[key])) : ctx.moveTo(X(s.t), Y(s[key]))));
  ctx.stroke();
  ctx.restore();
}

function punkt(p, wert, farbe) {
  const { ctx, X, Y } = p;
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.arc(X(clock.t), Y(wert), 4.5, 0, 2 * Math.PI);
  ctx.fill();
}

// Neuen Messpunkt aufnehmen und zeichnen (jedes Bild)
export function updatePlot() {
  box.hidden = !state.showPlot;
  const now = clock.t, zwei = state.coils === 2;
  const jetzt = { t: now, u: meterVoltage(), u1: coilVoltage(0), u2: coilVoltage(1) };
  if (!samples.length || now > samples.at(-1).t) samples.push(jetzt);
  while (samples.length && samples[0].t < now - PLOT_SECONDS_WIND - 0.5) samples.shift();
  for (const el of document.querySelectorAll('[data-zwei]')) el.hidden = !zwei;
  if (box.hidden) return;

  const r = state.range;
  const u = rahmen(plots.u, r, [-r, -r / 2, 0, r / 2, r], r < 1 ? 2 : 1, true);
  if (zwei) {
    kurve(u, 'u1', FARBE.s1, 1.4);
    kurve(u, 'u2', FARBE.s2, 1.4, [6, 5]);
  }
  kurve(u, 'u', zwei ? FARBE.summe : FARBE.s1, 2.6);
  punkt(u, jetzt.u, zwei ? FARBE.summe : FARBE.s1);
}

export const clearPlot = () => { samples.length = 0; };
