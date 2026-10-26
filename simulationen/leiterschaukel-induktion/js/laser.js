// ------------------------------------------------------------------
// Laserpointer: Mit Apple Pencil oder Maus Bereiche markieren, um zu zeigen, wovon man gerade spricht.
// Die Spur leuchtet rot über allem und verblasst kurz nach dem Absetzen; an der Simulation ändert sich nichts.
//
// Eingeschaltet (state.laser.on, Knöpfe mit data-laser, Taste L) fängt die Seite Stift und Maus ab, bevor
// Simulation oder Tafel sie bekommen. Finger bedienen alles weiter wie gewohnt, ebenso Knöpfe und Eingabefelder
// (auch mit Stift oder Maus, damit man den Laser wieder ausschalten kann). Läuft nur im Browser, ohne Server.
// ------------------------------------------------------------------
import { state } from './state.js';

const HALTEN = 400;     // ms: so lange bleibt die Spur nach dem Absetzen voll sichtbar …
const VERBLASSEN = 1100; // … und verblasst dann in dieser Zeit
const BEDIENELEMENTE = 'button, input, select, textarea, a, label';

const canvas = document.getElementById('laserCanvas');
const ctx = canvas.getContext('2d');
const spuren = [];          // { id, punkte: [{ x, y }], ende: Zeitpunkt des Absetzens oder null }
let laeuft = false;         // Zeichenschleife aktiv

function groesse() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function zeichnen() {
  const jetzt = performance.now();
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = spuren.length - 1; i >= 0; i--) {
    const s = spuren[i];
    const alter = s.ende === null ? 0 : jetzt - s.ende;
    const deckkraft = alter <= HALTEN ? 1 : 1 - (alter - HALTEN) / VERBLASSEN;
    if (deckkraft <= 0) {
      spuren.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = deckkraft;
    ctx.lineCap = ctx.lineJoin = 'round';
    // Leuchten außen, heller Kern innen
    for (const [breite, farbe, leuchten] of [[9, 'rgba(255, 30, 30, 0.85)', 14], [3, 'rgba(255, 220, 220, 0.95)', 0]]) {
      ctx.lineWidth = breite;
      ctx.strokeStyle = farbe;
      ctx.shadowColor = 'rgba(255, 0, 0, 0.9)';
      ctx.shadowBlur = leuchten;
      ctx.beginPath();
      s.punkte.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (s.punkte.length === 1) ctx.lineTo(s.punkte[0].x + 0.1, s.punkte[0].y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  laeuft = spuren.length > 0;
  if (laeuft) requestAnimationFrame(zeichnen);
}
function anstossen() {
  if (laeuft) return;
  laeuft = true;
  requestAnimationFrame(zeichnen);
}

// Gehört dieses Ereignis dem Laser? Nur Stift und Maus, nur eingeschaltet, nicht auf Bedienelementen
const fuerLaser = event => state.laser.on && (event.pointerType === 'pen' || event.pointerType === 'mouse')
  && !event.target.closest?.(BEDIENELEMENTE);
const abfangen = event => {
  event.preventDefault();
  event.stopPropagation();
};

// In der Erfassungsphase am Fenster: kommt vor allen anderen Zuhörern (Ansicht drehen, Schaukel ziehen, Tafel)
window.addEventListener('pointerdown', event => {
  if (!fuerLaser(event) || event.button > 0) return;
  abfangen(event);
  spuren.push({ id: event.pointerId, punkte: [{ x: event.clientX, y: event.clientY }], ende: null });
  anstossen();
}, { capture: true });

window.addEventListener('pointermove', event => {
  const s = spuren.find(sp => sp.id === event.pointerId && sp.ende === null);
  if (!s) return;
  abfangen(event);
  const zusammengefasst = event.getCoalescedEvents?.();
  for (const e of zusammengefasst?.length ? zusammengefasst : [event]) s.punkte.push({ x: e.clientX, y: e.clientY });
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
window.addEventListener('contextmenu', event => { if (state.laser.on && !event.target.closest?.(BEDIENELEMENTE)) event.preventDefault(); }, { capture: true });

export function setzeLaser(an) {
  state.laser.on = an;
  document.body.classList.toggle('laser-an', an);
  for (const knopf of document.querySelectorAll('[data-laser]')) knopf.setAttribute('aria-pressed', String(an));
  if (!an) for (const s of spuren) s.ende ??= performance.now();
}

export function initLaser() {
  groesse();
  window.addEventListener('resize', groesse);
  for (const knopf of document.querySelectorAll('[data-laser]')) {
    knopf.addEventListener('click', () => setzeLaser(!state.laser.on));
  }
  // Taste L am Laptop (nicht beim Tippen in ein Eingabefeld)
  window.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'l' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.('input, textarea, select')) return;
    setzeLaser(!state.laser.on);
  });
}
