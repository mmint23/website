// ------------------------------------------------------------------
// Zeichenfläche: Eisenstück mit Elementarmagneten, Stabmagnet (ziehen), Spule, Kompassnadeln,
// Feldlinien, Hammer. Welt-Koordinaten mit y nach oben; der Ausschnitt hängt vom Modus ab.
// Bedienung: Stabmagneten ziehen; auf das Eisenstück tippen = Hammerschlag.
// ------------------------------------------------------------------
import { feldVonPolen, magnetisierung } from './modell.js';
import { state, STUECK, MAGNET, SPULE } from './state.js';
import { stueckX, allePole, schlag } from './welt.js';

const NORD = '#d32f2f', SUED = '#2e7d32', FELD = '#1e88e5', KUPFER = '#c46a2b';
const cv = document.getElementById('flaeche');
const ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1;
const kamera = { s: 40, ox: 0, oy: 0 };          // Bildschirm = (x · s + ox, oy − y · s)
const BEREICH = {
  streichen: { x0: -12.5, x1: 12.5, y0: -4.2, y1: 9.2 },
  spule: { x0: -10, x1: 26, y0: -5.5, y1: 4.5 },
};
const RAND = { oben: 84, unten: 70, seite: 20 };

function einpassen() {
  const b = BEREICH[state.modus];
  const s = Math.min((W - 2 * RAND.seite) / (b.x1 - b.x0), (H - RAND.oben - RAND.unten) / (b.y1 - b.y0));
  kamera.s = s;
  kamera.ox = (W - (b.x1 + b.x0) * s) / 2;
  kamera.oy = RAND.oben + (H - RAND.oben - RAND.unten) / 2 + (b.y1 + b.y0) / 2 * s;
}
const X = x => kamera.ox + x * kamera.s, Y = y => kamera.oy - y * kamera.s;
const welt = (px, py) => ({ x: (px - kamera.ox) / kamera.s, y: (kamera.oy - py) / kamera.s });

function groesse() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  einpassen();
}

// ---------------- Bausteine
function rundRechteck(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Elementarmagnet: kleiner Stabmagnet, rote Hälfte = Nordpol (in Richtung θ), grüne = Südpol */
function elementarmagnet(x, y, theta, l, b) {
  ctx.save();
  ctx.translate(X(x), Y(y));
  ctx.rotate(-theta);
  const L = l * kamera.s, B = b * kamera.s;
  ctx.fillStyle = SUED; ctx.fillRect(-L / 2, -B / 2, L / 2, B);
  ctx.fillStyle = NORD; ctx.fillRect(0, -B / 2, L / 2, B);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 1;
  ctx.strokeRect(-L / 2, -B / 2, L, B);
  if (B >= 11) {
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(B * 0.8)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('S', -L / 4, 1); ctx.fillText('N', L / 4, 1);
  }
  ctx.restore();
}

function stueck(x0, wackeln) {
  const { b, h } = STUECK;
  const xs = x0 + wackeln;
  // Metall
  const g = ctx.createLinearGradient(0, Y(h / 2), 0, Y(-h / 2));
  g.addColorStop(0, '#d9dee3'); g.addColorStop(0.5, '#b7bec6'); g.addColorStop(1, '#9aa3ad');
  ctx.fillStyle = g;
  rundRechteck(X(xs - b / 2), Y(h / 2), b * kamera.s, h * kamera.s, 0.25 * kamera.s);
  ctx.fill();
  // Pole: die Enden färben sich mit der Magnetisierung
  const { mx } = magnetisierung(state.magnete);
  if (state.zeigePole && Math.abs(mx) > 0.25) {
    const a = Math.min(0.55, Math.abs(mx) * 0.6);
    for (const seite of [-1, 1]) {
      const nord = (seite > 0) === (mx > 0);
      ctx.fillStyle = nord ? `rgba(211, 47, 47, ${a})` : `rgba(46, 125, 50, ${a})`;
      const xe = seite > 0 ? xs + b / 2 - 2.2 : xs - b / 2;
      ctx.save();
      rundRechteck(X(xs - b / 2), Y(h / 2), b * kamera.s, h * kamera.s, 0.25 * kamera.s);
      ctx.clip();
      ctx.fillRect(X(xe), Y(h / 2), 2.2 * kamera.s, h * kamera.s);
      ctx.restore();
      ctx.fillStyle = nord ? NORD : SUED;
      ctx.font = `800 ${Math.round(0.9 * kamera.s)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = Math.min(1, (Math.abs(mx) - 0.25) * 3);
      ctx.fillText(nord ? 'N' : 'S', X(xs + seite * (b / 2 - 1.1)), Y(-h / 2 - 1.2));
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = '#6b737c'; ctx.lineWidth = 2;
  rundRechteck(X(xs - b / 2), Y(h / 2), b * kamera.s, h * kamera.s, 0.25 * kamera.s);
  ctx.stroke();
  for (const e of state.magnete) elementarmagnet(xs + e.x, e.y, e.theta, 0.78, 0.26);
}

function stabmagnet() {
  const { b, l } = MAGNET;
  const x = state.magnetX, y = state.magnetY;
  const unten = state.unten === 'N';
  const teile = [[y - l / 2, unten ? NORD : SUED, unten ? 'N' : 'S'], [y, unten ? SUED : NORD, unten ? 'S' : 'N']];
  for (const [y0, farbe, buchstabe] of teile) {
    ctx.fillStyle = farbe;
    ctx.fillRect(X(x - b / 2), Y(y0 + l / 2), b * kamera.s, (l / 2) * kamera.s);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.round(0.8 * kamera.s)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(buchstabe, X(x), Y(y0 + l / 4));
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; ctx.lineWidth = 2;
  ctx.strokeRect(X(x - b / 2), Y(y + l / 2), b * kamera.s, l * kamera.s);
  if (!gezogen && !schonGezogen) {                // Hinweis, solange noch nie gezogen wurde
    ctx.fillStyle = '#33404d';
    ctx.font = `600 ${Math.round(0.55 * kamera.s)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ziehen', X(x), Y(y + l / 2 + 0.4));
  }
}

// Spule: hintere Windungen (vor dem Kern gezeichnet) und vordere (danach)
function windungen(vorne) {
  const { halb, r, windungen: n } = SPULE;
  const d = (2 * halb) / n;
  ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const x = -halb + (k + 0.5) * d;
    ctx.strokeStyle = vorne ? KUPFER : '#8a4a1f';
    ctx.lineWidth = (vorne ? 0.22 : 0.14) * kamera.s;
    ctx.beginPath();
    if (vorne) { ctx.moveTo(X(x - d * 0.25), Y(-r)); ctx.lineTo(X(x + d * 0.25), Y(r)); }
    else { ctx.moveTo(X(x + d * 0.25), Y(r)); ctx.lineTo(X(x + d * 0.75), Y(-r)); }
    ctx.stroke();
    // Stromrichtung auf den vorderen Windungen
    if (vorne && state.stromAn && state.strom > 0) {
      const auf = state.polung > 0;
      const xm = x, ym = 0;
      const dir = auf ? -1 : 1;                   // Bildschirm: nach oben = negativ
      ctx.fillStyle = '#ffb300';
      const px = X(xm), py = Y(ym), sz = 0.28 * kamera.s;
      ctx.beginPath();
      ctx.moveTo(px + dir * 0.2 * sz, py + dir * sz);
      ctx.lineTo(px - 0.7 * sz, py - dir * 0.5 * sz);
      ctx.lineTo(px + 0.7 * sz, py - dir * 0.5 * sz);
      ctx.closePath(); ctx.fill();
    }
  }
  if (vorne) {
    // Zuleitungen und Anschlusskasten mit Stromstärke
    ctx.strokeStyle = KUPFER; ctx.lineWidth = 0.12 * kamera.s;
    ctx.beginPath();
    ctx.moveTo(X(-halb + 0.1), Y(-r)); ctx.lineTo(X(-halb + 0.1), Y(-r - 1.6)); ctx.lineTo(X(-1.4), Y(-r - 1.6));
    ctx.moveTo(X(halb - 0.1), Y(-r)); ctx.lineTo(X(halb - 0.1), Y(-r - 1.6)); ctx.lineTo(X(1.4), Y(-r - 1.6));
    ctx.stroke();
    ctx.fillStyle = '#3b4450';
    rundRechteck(X(-1.6), Y(-r - 1.0), 3.2 * kamera.s, 1.3 * kamera.s, 6);
    ctx.fill();
    ctx.fillStyle = state.stromAn ? '#7CFC8A' : '#8a949e';
    ctx.font = `700 ${Math.round(0.6 * kamera.s)}px ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const i = state.stromAn ? state.strom : 0;
    ctx.fillText(`${(state.polung * i).toFixed(1).replace('.', ',')} A`, X(0), Y(-r - 1.65));
  }
}

// ---------------- Kompassnadeln (Streichen): zeigen das Feld an den Enden des Eisenstücks
const kompasse = [{ x: -10.6, y: 0, w: Math.PI / 2 }, { x: 10.6, y: 0, w: Math.PI / 2 }];
function kompassZeichnen(k, pole, dt) {
  const { bx, by } = feldVonPolen(pole, k.x, k.y);
  if (Math.hypot(bx, by) > 0.01) {
    const ziel = Math.atan2(by, bx);
    let d = Math.atan2(Math.sin(ziel - k.w), Math.cos(ziel - k.w));
    k.w += d * Math.min(1, dt * 6);
  }
  const R = 1.0 * kamera.s;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#6b737c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(X(k.x), Y(k.y), R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.translate(X(k.x), Y(k.y)); ctx.rotate(-k.w);
  const L = R * 0.85, B = R * 0.22;
  ctx.fillStyle = NORD; ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(0, -B); ctx.lineTo(0, B); ctx.fill();
  ctx.fillStyle = SUED; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, -B); ctx.lineTo(0, B); ctx.fill();
  ctx.fillStyle = '#33404d'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 2 * Math.PI); ctx.fill();
  ctx.restore();
}

// ---------------- Feldlinien: von den Nordpolen aus, nicht im Inneren von Magnet und Eisenstück
function innen(x, y) {
  const xs = stueckX();
  if (Math.abs(x - xs) < STUECK.b / 2 && Math.abs(y) < STUECK.h / 2) return true;
  if (state.modus === 'streichen' && Math.abs(x - state.magnetX) < MAGNET.b / 2 && Math.abs(y - state.magnetY) < MAGNET.l / 2) return true;
  if (state.modus === 'spule' && Math.abs(x) < SPULE.halb && Math.abs(y) < SPULE.r) return true;
  return false;
}
function feldlinien(pole) {
  const b = BEREICH[state.modus];
  const qMax = Math.max(...pole.map(p => Math.abs(p.q)), 0);
  if (qMax < 0.08) return;
  ctx.strokeStyle = ctx.fillStyle = 'rgba(30, 136, 229, 0.75)';
  ctx.lineWidth = 2;
  for (const p of pole) {
    if (p.q <= 0.08) continue;
    // Linien verlassen die Polfläche nach außen (± 80° um ihre Richtung), Zahl nach Polstärke
    const anzahl = Math.max(3, Math.round(12 * Math.min(1, p.q / 3)));
    const mitte = Math.atan2(p.ny ?? 0, p.nx ?? 1);
    for (let k = 0; k < anzahl; k++) {
      const a = mitte + ((k + 0.5) / anzahl - 0.5) * 2 * 1.4;
      let x = p.x + 0.45 * Math.cos(a), y = p.y + 0.45 * Math.sin(a);
      const pts = [];
      // auch außerhalb des Bildes weiterverfolgen, damit sich große Schleifen wieder zum Südpol schließen
      for (let i = 0; i < 1400; i++) {
        const { bx, by } = feldVonPolen(pole, x, y);
        const f = Math.hypot(bx, by) || 1;
        const h = Math.min(0.4, 0.07 * Math.max(1, Math.hypot(x - p.x, y - p.y) / 4));   // weit weg größere Schritte
        x += h * bx / f; y += h * by / f;
        if (x < b.x0 - 25 || x > b.x1 + 25 || y < b.y0 - 25 || y > b.y1 + 25) break;
        if (pole.some(s => s.q < 0 && Math.hypot(x - s.x, y - s.y) < 0.25)) break;
        pts.push([x, y, innen(x, y)]);
      }
      ctx.beginPath();
      let offen = false;
      for (const [px, py, drin] of pts) {
        if (drin) { offen = false; continue; }
        if (!offen) { ctx.moveTo(X(px), Y(py)); offen = true; } else ctx.lineTo(X(px), Y(py));
      }
      ctx.stroke();
      // Pfeil in der Mitte des sichtbaren Teils
      const sicht = pts.filter(q => !q[2]);
      if (sicht.length > 10) {
        const m = Math.floor(sicht.length / 2), [x1, y1] = sicht[m], [x0, y0] = sicht[m - 2];
        const w = Math.atan2(-(y1 - y0), x1 - x0);
        ctx.beginPath();
        ctx.moveTo(X(x1), Y(y1));
        ctx.lineTo(X(x1) - 10 * Math.cos(w - 0.45), Y(y1) - 10 * Math.sin(w - 0.45));
        ctx.lineTo(X(x1) - 10 * Math.cos(w + 0.45), Y(y1) - 10 * Math.sin(w + 0.45));
        ctx.fill();
      }
    }
  }
}

// ---------------- Hammer
let hammer = null;                                 // { x, y, t }
function hammerZeichnen(dt) {
  if (!hammer) return 0;
  hammer.t += dt;
  const T = 0.35, p = hammer.t / T;
  if (p >= 1) { hammer = null; return 0; }
  // ausholen und zuschlagen: Winkel von 70° auf 0° (Treffer bei p = 0,5), dann zurück
  const w = p < 0.5 ? (1 - p / 0.5) * 1.2 : (p - 0.5) / 0.5 * 0.5;
  ctx.save();
  ctx.translate(X(hammer.x + 3.2), Y(hammer.y + 0.9));
  ctx.rotate(-w);
  ctx.fillStyle = '#8d6e63'; ctx.fillRect(-3.0 * kamera.s, -0.18 * kamera.s, 3.0 * kamera.s, 0.36 * kamera.s);
  ctx.fillStyle = '#546e7a'; ctx.fillRect(-3.4 * kamera.s, -0.75 * kamera.s, 0.8 * kamera.s, 1.5 * kamera.s);
  ctx.restore();
  return p > 0.45 && p < 0.75 ? Math.sin(p * 60) * 0.08 : 0;   // Eisenstück wackelt beim Treffer
}

/** Hammerschlag (Knopf oder Antippen des Eisenstücks) */
export function hammerschlag(x = stueckX() + (Math.random() - 0.5) * 8) {
  hammer = { x, y: STUECK.h / 2, t: 0 };
  setTimeout(schlag, 175);                         // die Ordnung geht beim Treffer verloren
}

// ---------------- Bild für Bild
export function zeichnen(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (W === 0) return;
  const pole = allePole();
  const wackeln = hammer ? hammerZeichnen(0) : 0;
  if (state.zeigeFeld) feldlinien(pole);
  if (state.modus === 'spule') windungen(false);
  stueck(stueckX(), wackeln);
  if (state.modus === 'spule') windungen(true);
  if (state.modus === 'streichen') {
    if (state.zeigeKompass) for (const k of kompasse) kompassZeichnen(k, pole, dt);
    stabmagnet();
  }
  hammerZeichnen(dt);
}

// ---------------- Bedienung: Stabmagnet ziehen, Eisenstück antippen
let gezogen = null, schonGezogen = false;
function aufMagnet({ x, y }) {
  return state.modus === 'streichen' && Math.abs(x - state.magnetX) < MAGNET.b / 2 + 0.3 && Math.abs(y - state.magnetY) < MAGNET.l / 2 + 0.3;
}
function aufStueck({ x, y }) {
  return Math.abs(x - stueckX()) < STUECK.b / 2 && Math.abs(y) < STUECK.h / 2 + 0.3;
}
/** Magnet verschieben: nicht ins Eisenstück und nicht aus dem Bild */
function magnetSetzen(x, y) {
  const b = BEREICH.streichen;
  x = Math.min(b.x1 - 1, Math.max(b.x0 + 1, x));
  y = Math.min(b.y1 - MAGNET.l / 2, Math.max(b.y0 + MAGNET.l / 2, y));
  const ueberStueck = Math.abs(x) < STUECK.b / 2 + MAGNET.b / 2;
  const unten = y - MAGNET.l / 2;
  if (ueberStueck && unten < STUECK.h / 2 + 0.05 && y > 0) y = STUECK.h / 2 + 0.05 + MAGNET.l / 2;
  if (ueberStueck && y <= 0 && y + MAGNET.l / 2 > -STUECK.h / 2 - 0.05) y = -STUECK.h / 2 - 0.05 - MAGNET.l / 2;
  state.magnetX = x; state.magnetY = y;
}

cv.addEventListener('pointerdown', e => {
  const p = welt(e.offsetX, e.offsetY);
  if (aufMagnet(p)) {
    cv.setPointerCapture(e.pointerId);
    gezogen = { id: e.pointerId, dx: state.magnetX - p.x, dy: state.magnetY - p.y };
    schonGezogen = true;
  } else if (aufStueck(p)) {
    hammerschlag(p.x);
  }
});
cv.addEventListener('pointermove', e => {
  const p = welt(e.offsetX, e.offsetY);
  if (gezogen && e.pointerId === gezogen.id) magnetSetzen(p.x + gezogen.dx, p.y + gezogen.dy);
  cv.style.cursor = aufMagnet(p) ? 'grab' : aufStueck(p) ? 'pointer' : 'default';
});
for (const typ of ['pointerup', 'pointercancel']) cv.addEventListener(typ, () => { gezogen = null; });

export function initAnsicht() {
  groesse();
  new ResizeObserver(groesse).observe(cv);
}
export const neuEinpassen = einpassen;
