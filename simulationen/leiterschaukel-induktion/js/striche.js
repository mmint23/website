// ------------------------------------------------------------------
// Striche auf der Tafel: Datenformat, Prüfung und Zeichnen
// Ohne DOM und ohne three.js, damit auch der Abgabe-Server (server/server.js) die Abgaben damit prüfen kann.
//
// Koordinaten in Tafeleinheiten: 0 … TAFEL.W nach rechts, 0 … TAFEL.H nach unten (Seitenverhältnis des Tafelbilds).
// Im Browser:   { k: 'free', c: '#rrggbb', p: [{ x, y, pr }, …] }   (pr: Stiftdruck 0 … 1)
//               { k: 'arrow', c: '#rrggbb', a: { x, y }, b: { x, y } }
// Übertragung:  { k: 'f', c, p: [x, y, pr, x, y, pr, …] }  bzw.  { k: 'a', c, p: [ax, ay, bx, by] }
// ------------------------------------------------------------------

export const TAFEL = { W: 1600, H: 1000 };

// Farben der Stifte (wie die Pfeile im Erklärmodus) und Schwarz zum Beschriften
export const FARBEN = { v: '#2e7d32', B: '#1565c0', F: '#c62828', schwarz: '#1d2733' };

// Grenzen einer Abgabe (der Server weist größere ab)
export const GRENZEN = { STRICHE: 1500, PUNKTE: 60000, NAME: 40 };

const r1 = v => Math.round(v * 10) / 10;

export function packen(striche) {
  return striche.map(s => s.k === 'arrow'
    ? { k: 'a', c: s.c, p: [r1(s.a.x), r1(s.a.y), r1(s.b.x), r1(s.b.y)] }
    : { k: 'f', c: s.c, p: s.p.flatMap(q => [r1(q.x), r1(q.y), Math.round(q.pr * 100) / 100]) });
}

export function entpacken(daten) {
  return daten.map(d => {
    if (d.k === 'a') return { k: 'arrow', c: d.c, a: { x: d.p[0], y: d.p[1] }, b: { x: d.p[2], y: d.p[3] } };
    const p = [];
    for (let i = 0; i < d.p.length; i += 3) p.push({ x: d.p[i], y: d.p[i + 1], pr: d.p[i + 2] });
    return { k: 'free', c: d.c, p };
  });
}

// Prüft übertragene Striche (Format wie bei packen). Gibt eine Fehlermeldung zurück oder null.
export function pruefen(daten) {
  if (!Array.isArray(daten)) return 'Striche fehlen';
  if (daten.length > GRENZEN.STRICHE) return 'Zu viele Striche';
  let punkte = 0;
  const zahl = v => typeof v === 'number' && Number.isFinite(v) && v >= -TAFEL.W && v <= 2 * TAFEL.W;
  for (const d of daten) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.p)) return 'Ungültiger Strich';
    if (typeof d.c !== 'string' || !/^#[0-9a-f]{6}$/i.test(d.c)) return 'Ungültige Farbe';
    if (d.k === 'a') {
      if (d.p.length !== 4) return 'Ungültiger Pfeil';
    } else if (d.k === 'f') {
      if (d.p.length === 0 || d.p.length % 3 !== 0) return 'Ungültiger Strich';
    } else return 'Ungültiger Strich';
    if (!d.p.every(zahl)) return 'Ungültige Koordinaten';
    punkte += d.p.length / 3;
    if (punkte > GRENZEN.PUNKTE) return 'Zeichnung zu groß';
  }
  return null;
}

// ---------------- Zeichnen (ctx: Canvas-2D-Kontext, bereits auf Tafeleinheiten skaliert)

export const strichBreite = pr => 6.4 * (0.45 + pr * 1.25);
const PFEIL_BREITE = 7;

function pfeilspitze(ctx, a, b, farbe, dicker) {
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const hs = (18 + PFEIL_BREITE * 2.2) * Math.sqrt(dicker);
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.moveTo(b.x + ux * 3, b.y + uy * 3);
  ctx.lineTo(b.x - ux * hs - uy * hs * 0.55, b.y - uy * hs + ux * hs * 0.55);
  ctx.lineTo(b.x - ux * hs + uy * hs * 0.55, b.y - uy * hs - ux * hs * 0.55);
  ctx.closePath();
  ctx.fill();
}

// Teilstück eines Freihandstrichs von Punkt i−1 bis i (beim Zeichnen wird nur das neue Stück ergänzt).
// dicker: Faktor für die Strichbreite (kleine Vorschaubilder)
export function zeichneStueck(ctx, s, i, dicker = 1) {
  const p0 = s.p[i - 1], p1 = s.p[i];
  ctx.strokeStyle = s.c;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.lineWidth = dicker * (strichBreite(p0.pr) + strichBreite(p1.pr)) / 2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
}

export function zeichneStrich(ctx, s, dicker = 1) {
  ctx.strokeStyle = s.c;
  ctx.lineCap = ctx.lineJoin = 'round';
  if (s.k === 'arrow') {
    ctx.lineWidth = PFEIL_BREITE * dicker;
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y);
    ctx.lineTo(s.b.x, s.b.y);
    ctx.stroke();
    if (Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) > 10) pfeilspitze(ctx, s.a, s.b, s.c, dicker);
    return;
  }
  if (!s.p.length) return;
  if (s.p.length === 1) {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.p[0].x, s.p[0].y, dicker * strichBreite(s.p[0].pr) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < s.p.length; i++) zeichneStueck(ctx, s, i, dicker);
}

// Alle Striche auf eine Fläche der Breite breite (in Pixeln) zeichnen
export function zeichneAlle(ctx, striche, breite, dicker = 1) {
  const sc = breite / TAFEL.W;
  ctx.save();
  ctx.scale(sc, sc);
  for (const s of striche) zeichneStrich(ctx, s, dicker);
  ctx.restore();
}

// ---------------- Radierer: Abstand eines Punkts zu einem Strich

function abstandStrecke(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function getroffen(s, p, radius) {
  if (s.k === 'arrow') return abstandStrecke(p, s.a, s.b) <= radius;
  if (s.p.length === 1) return Math.hypot(s.p[0].x - p.x, s.p[0].y - p.y) <= radius;
  for (let i = 1; i < s.p.length; i++) if (abstandStrecke(p, s.p[i - 1], s.p[i]) <= radius) return true;
  return false;
}
