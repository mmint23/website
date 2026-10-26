// ------------------------------------------------------------------
// Zahl und Einteilung des Quadrats (ohne Zeichnen, testbar mit node --test)
//
// Die Zahl wird als ganze Zahl von Zehntausendsteln gespeichert (n = 3470 bedeutet 0,347),
// damit beim Rechnen keine Rundungsfehler entstehen. Negative Zahlen (nur am Zahlenstrahl): n < 0.
//
// Einteilung eines Quadrats (Seitenlänge 1, y nach unten). Jedes Teil wird in 10 gleiche Teile zerlegt;
// ein Quadrat lässt sich nicht in 10 gleiche Quadrate teilen, daher wechseln sich Quadrate und Rechtecke ab.
//   'rechtecke' (Zehnerfeld): Quadrat → 5 × 2 hochkante Rechtecke, Rechteck → 2 × 5 Quadrate
//       Zehntel 0,2 × 0,5 · Hundertstel 0,1 × 0,1 · Tausendstel 0,02 × 0,05 · Zehntausendstel 0,01 × 0,01
//   'streifen': Quadrat → 10 senkrechte Streifen, Streifen → 10 Quadrate
//       Zehntel 0,1 × 1 · Hundertstel 0,1 × 0,1 · Tausendstel 0,01 × 0,1 · Zehntausendstel 0,01 × 0,01
// Reihenfolge der Teile wie beim Lesen: zeilenweise von links nach rechts, von oben nach unten.
// ------------------------------------------------------------------

export const STELLEN = 4;                       // Nachkommastellen (bis Zehntausendstel)
export const EINHEIT = 10 ** STELLEN;           // Zehntausendstel pro Ganzes
export const STUFEN = [
  { name: 'Ganze', kurz: 'E', einzahl: 'Ganzes' },
  { name: 'Zehntel', kurz: 'z', einzahl: 'Zehntel' },
  { name: 'Hundertstel', kurz: 'h', einzahl: 'Hundertstel' },
  { name: 'Tausendstel', kurz: 't', einzahl: 'Tausendstel' },
  { name: 'Zehntausendstel', kurz: 'zt', einzahl: 'Zehntausendstel' },
];

export const MINUS = '−';

/** Ziffern des Betrags der Zahl: ganze Zahl und die Nachkommaziffern [z, h, t, zt]; negativ: Vorzeichen */
export function ziffern(n) {
  const negativ = n < 0;
  n = Math.abs(n);
  const ganze = Math.floor(n / EINHEIT);
  let rest = n - ganze * EINHEIT;
  const nach = [];
  for (let k = STELLEN - 1; k >= 0; k--) {
    const p = 10 ** k;
    nach.push(Math.floor(rest / p));
    rest %= p;
  }
  return { ganze, nach, negativ };
}

/** Zahl aus Ziffern */
export function ausZiffern(ganze, nach) {
  return ganze * EINHEIT + nach.reduce((s, d, k) => s + d * 10 ** (STELLEN - 1 - k), 0);
}

/** Anzahl der nötigen Nachkommastellen (ohne Endnullen) */
export function nachkommastellen(n) {
  const { nach } = ziffern(n);
  let k = STELLEN;
  while (k > 0 && nach[k - 1] === 0) k--;
  return k;
}

/** Zahl als Text mit Dezimalkomma, z. B. „0,347“ (mindestens `mindestens` Nachkommastellen) */
export function alsText(n, mindestens = 0) {
  const { ganze, nach } = ziffern(n);
  const k = Math.max(nachkommastellen(n), mindestens);
  const v = n < 0 ? MINUS : '';
  return k === 0 ? v + ganze : `${v}${ganze},${nach.slice(0, k).join('')}`;
}

/**
 * Text einlesen („0,347“, „0.347“, „,5“, „2“, „-1,5“ oder Brüche „1/10“, „-3/4“, „1 1/2“).
 * Ergebnis { n } bzw. bei Brüchen { n, bruch: { negativ, ganze, zaehler, nenner } } oder { fehler }.
 * max, min: größte und kleinste erlaubte Zahl (in Zehntausendsteln); stellen: höchstens so viele Nachkommastellen.
 */
export function lies(text, max, min = 0, stellen = STELLEN) {
  const roh = String(text).trim().replace(/^[−–]/, '-').replace(/\s+/g, ' ');
  const mb = roh.match(/^([+-]?) ?(?:(\d+) )?(\d+) ?\/ ?(\d+)$/);
  if (mb) return liesBruch(mb, max, min, stellen);
  const t = String(text).trim().replace(/\s/g, '').replace('.', ',').replace(/^[−–]/, '-');
  if (t === '') return { fehler: 'Bitte eine Zahl eingeben.' };
  const m = t.match(/^([+-]?)(\d*)(?:,(\d*))?$/);
  if (!m || (m[2] === '' && !m[3])) return { fehler: 'Das ist keine Dezimalzahl. Beispiel: 0,347' };
  const nachText = m[3] ?? '';
  if (nachText.replace(/0+$/, '').length > stellen) {
    return { fehler: `Höchstens ${stellen} Nachkommastellen (bis zu den ${STUFEN[stellen].name}n).` };
  }
  const ganze = m[2] === '' ? 0 : Number(m[2]);
  const nach = (nachText + '0'.repeat(STELLEN)).slice(0, STELLEN).split('').map(Number);
  return imBereich((m[1] === '-' ? -1 : 1) * ausZiffern(ganze, nach), max, min);
}

/** Bruch (Treffer der Bruch-Erkennung in lies) einlesen; nur Brüche mit endlicher Dezimaldarstellung */
function liesBruch([, vz, g, z, nn], max, min, stellen) {
  const ganze = g ? Number(g) : 0, zaehler = Number(z), nenner = Number(nn);
  if (nenner === 0) return { fehler: 'Durch 0 kann man nicht teilen.' };
  const bruch = { negativ: vz === '-', ganze, zaehler, nenner };
  const betrag = (ganze * nenner + zaehler) * EINHEIT / nenner;
  if (!Number.isInteger(betrag) || betrag % 10 ** (STELLEN - stellen) !== 0) {
    return { fehler: `${bruchText(bruch)} lässt sich nicht als Dezimalzahl mit höchstens ${stellen} Nachkommastellen schreiben.` };
  }
  const r = imBereich((bruch.negativ ? -1 : 1) * betrag, max, min);
  return r.fehler ? r : { n: r.n, bruch };
}

/** Bruch als Text, z. B. „−1 3/4“ */
export function bruchText(b) {
  return `${b.negativ ? MINUS : ''}${b.ganze ? b.ganze + ' ' : ''}${b.zaehler}/${b.nenner}`;
}

/** Liegt n im erlaubten Bereich? Ergebnis { n } oder { fehler } */
function imBereich(n, max, min) {
  if (min < 0 && (n < min || n > max)) {
    return { fehler: `Die Zahl muss zwischen ${alsText(min)} und ${alsText(max)} liegen.` };
  }
  if (n < min) return { fehler: 'Negative Zahlen gibt es nur am Zahlenstrahl.' };
  if (n > max) return { fehler: `Die Zahl ist zu groß: Es gibt nur ${max / EINHEIT} ${max === EINHEIT ? 'Quadrat' : 'Quadrate'}.` };
  return { n };
}

/** Je Stufe 1 … 4: in wie viele Spalten und Zeilen das Elternteil geteilt wird */
export const EINTEILUNGEN = {
  rechtecke: [[5, 2], [2, 5], [5, 2], [2, 5]],
  streifen: [[10, 1], [1, 10], [10, 1], [1, 10]],
};

/** Größe eines Teils der Stufe k (1 … 4) im Quadrat: Breite und Höhe */
export function teilGroesse(k, art = 'streifen') {
  let w = 1, h = 1;
  for (let j = 0; j < k; j++) { w /= EINTEILUNGEN[art][j][0]; h /= EINTEILUNGEN[art][j][1]; }
  return { w, h };
}

/** Lage des Teils Nummer i (0 … 9) der Stufe k innerhalb seines Elternteils (links oben x0, y0) */
function teil(k, i, x0, y0, art) {
  const { w, h } = teilGroesse(k, art);
  const spalten = EINTEILUNGEN[art][k - 1][0];
  return { x: x0 + (i % spalten) * w, y: y0 + Math.floor(i / spalten) * h, w, h };
}

/**
 * Gefärbte Flächen für die Zahl n: Rechtecke in Quadrat-Koordinaten mit Stufe (0 = ganzes Quadrat).
 * quadrat: Nummer des Quadrats (0, 1, 2, …), x und y innerhalb dieses Quadrats.
 */
export function flaechen(n, art = 'streifen') {
  const { ganze, nach } = ziffern(n);
  const liste = [];
  for (let q = 0; q < ganze; q++) liste.push({ quadrat: q, stufe: 0, x: 0, y: 0, w: 1, h: 1 });
  if (nach.every(d => d === 0)) return liste;
  let x0 = 0, y0 = 0;
  nach.forEach((d, j) => {
    const k = j + 1;
    for (let i = 0; i < d; i++) liste.push({ quadrat: ganze, stufe: k, ...teil(k, i, x0, y0, art) });
    if (d < 10) ({ x: x0, y: y0 } = teil(k, d, x0, y0, art));   // im nächsten Teil geht es feiner weiter
  });
  return liste;
}

/**
 * Antippen: Punkt (x, y) im Quadrat Nummer q, feinste Stufe k.
 * Ergebnis: die Zahl, bei der die Färbung genau bis einschließlich dieses Teils reicht.
 * Ist genau dieses Teil das letzte gefärbte (bisher n), wird es wieder weggenommen.
 */
export function zahlBeiPunkt(q, x, y, k, bisher, art = 'streifen') {
  const nach = [];
  let x0 = 0, y0 = 0;
  for (let s = 1; s <= k; s++) {
    const { w, h } = teilGroesse(s, art);
    const [spalten, zeilen] = EINTEILUNGEN[art][s - 1];
    const sp = Math.min(spalten - 1, Math.max(0, Math.floor((x - x0) / w)));
    const ze = Math.min(zeilen - 1, Math.max(0, Math.floor((y - y0) / h)));
    const i = ze * spalten + sp;
    nach.push(i);
    ({ x: x0, y: y0 } = teil(s, i, x0, y0, art));
  }
  nach[k - 1] += 1;                               // bis einschließlich des angetippten Teils
  while (nach.length < STELLEN) nach.push(0);
  const n = q * EINHEIT + nach.reduce((s, d, j) => s + d * 10 ** (STELLEN - 1 - j), 0);
  if (n === bisher) return n - 10 ** (STELLEN - k);
  return n;
}

/** Zerlegung in Stellenwerte, z. B. „3 Zehntel + 4 Hundertstel + 7 Tausendstel“ (negativ: „−(…)“) */
export function zerlegung(n) {
  if (n < 0) return `${MINUS}(${zerlegung(-n)})`;
  const { ganze, nach } = ziffern(n);
  const teile = [];
  if (ganze > 0) teile.push(`${ganze} ${ganze === 1 ? 'Ganzes' : 'Ganze'}`);
  nach.forEach((d, j) => { if (d > 0) teile.push(`${d} ${STUFEN[j + 1].name}`); });
  return teile.length ? teile.join(' + ') : '0';
}

/** Die Zahl in der feinsten nötigen Einheit, z. B. „347 Tausendstel“ (null, wenn ganzzahlig) */
export function inKleinsterEinheit(n) {
  const k = nachkommastellen(n);
  if (k === 0) return null;
  const anzahl = Math.abs(n) / 10 ** (STELLEN - k);
  return `${n < 0 ? MINUS : ''}${anzahl} ${STUFEN[k].name}`;
}
