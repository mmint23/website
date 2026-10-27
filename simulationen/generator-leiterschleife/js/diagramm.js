// ------------------------------------------------------------------
// U-t-Diagramm: schreibt die Induktionsspannung mit (wie ein Schreiber bzw. Oszilloskop).
// Sichtbar sind die letzten PLOT_SECONDS Sekunden (Simulationszeit); die U-Achse folgt dem Messbereich.
// ------------------------------------------------------------------
import { PLOT_SECONDS, PLOT_SECONDS_WIND } from './config.js';
import { state } from './state.js';
import { clock, meterReading } from './physik.js';
import { formatNumber } from './hilfen.js';

const box = document.getElementById('plotBox');
const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const samples = [];               // { t, u } mit u in mV

// Abstände für die Beschriftung (in CSS-Pixeln)
const PAD = { left: 52, right: 12, top: 14, bottom: 30 };

export function clearPlot() {
  samples.length = 0;
}

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
  const x0 = PAD.left, x1 = w - PAD.right, y0 = PAD.top, y1 = h - PAD.bottom;
  const range = state.range;
  const X = t => x1 - (now - t) / seconds * (x1 - x0);
  const Y = u => (y0 + y1) / 2 - Math.max(-1.05, Math.min(1.05, u / range)) * (y1 - y0) / 2;

  ctx.clearRect(0, 0, w, h);
  ctx.font = '12px system-ui, sans-serif';
  ctx.lineWidth = 1;
  // Raster: U bei ±Bereich und ±halbem Bereich, t jede Sekunde (wandert mit)
  ctx.strokeStyle = '#d5dce3';
  ctx.fillStyle = '#4a5866';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const f of [-1, -0.5, 0, 0.5, 1]) {
    const y = Y(f * range);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    const value = formatNumber(Math.abs(f * range), f * range % 1 ? 1 : 0);
    ctx.fillText((f < 0 ? '−' : '') + value, x0 - 6, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tick = seconds > 6 ? 2 : 1;
  for (let s = tick * Math.ceil((now - seconds) / tick); s <= now; s += tick) {
    if (s < 0) continue;
    const x = X(s);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    ctx.fillText(String(s), x, y1 + 4);
  }
  // Achsen
  ctx.strokeStyle = '#1d2733';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 4);
  ctx.lineTo(x0, y1);
  ctx.moveTo(x0, Y(0));
  ctx.lineTo(x1 + 4, Y(0));
  ctx.stroke();
  ctx.fillStyle = '#1d2733';
  ctx.textAlign = 'left';
  ctx.fillText('t in s', x1 - 30, Y(0) + 4);

  // Messkurve
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0 - 2, x1 - x0, y1 - y0 + 4);
  ctx.clip();
  ctx.strokeStyle = '#1d4f91';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  samples.forEach(({ t, u }, i) => (i ? ctx.lineTo(X(t), Y(u)) : ctx.moveTo(X(t), Y(u))));
  ctx.stroke();
  ctx.restore();
}
