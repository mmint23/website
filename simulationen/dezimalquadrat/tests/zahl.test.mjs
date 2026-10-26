import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ziffern, alsText, lies, flaechen, zahlBeiPunkt, zerlegung, inKleinsterEinheit, teilGroesse, EINHEIT } from '../js/zahl.js';

test('Ziffern und Text', () => {
  assert.deepEqual(ziffern(3470), { ganze: 0, nach: [3, 4, 7, 0], negativ: false });
  assert.deepEqual(ziffern(12505), { ganze: 1, nach: [2, 5, 0, 5], negativ: false });
  assert.equal(alsText(3470), '0,347');
  assert.equal(alsText(0), '0');
  assert.equal(alsText(20000), '2');
  assert.equal(alsText(5000, 2), '0,50');
});

test('Einlesen', () => {
  assert.deepEqual(lies('0,347', EINHEIT), { n: 3470 });
  assert.deepEqual(lies('0.5', EINHEIT), { n: 5000 });
  assert.deepEqual(lies(',25', EINHEIT), { n: 2500 });
  assert.deepEqual(lies('2,5000', 3 * EINHEIT), { n: 25000 });
  assert.deepEqual(lies('1', EINHEIT), { n: 10000 });
  assert.ok(lies('1,2', EINHEIT).fehler);              // nur ein Quadrat
  assert.ok(lies('0,12345', EINHEIT).fehler);          // zu viele Stellen
  assert.ok(lies('abc', EINHEIT).fehler);
  assert.ok(lies('', EINHEIT).fehler);
});

test('Flächen: 0,347 = 3 Streifen, 4 Hundertstel, 7 Tausendstel', () => {
  const f = flaechen(3470);
  const zahl = k => f.filter(r => r.stufe === k).length;
  assert.equal(zahl(1), 3);
  assert.equal(zahl(2), 4);
  assert.equal(zahl(3), 7);
  // Gesamtfläche = Zahlwert
  const summe = f.reduce((s, r) => s + r.w * r.h, 0);
  assert.ok(Math.abs(summe - 0.347) < 1e-12);
  // Hundertstel liegen im vierten Streifen (x = 0,3), von oben nach unten
  const h = f.filter(r => r.stufe === 2);
  assert.ok(h.every(r => Math.abs(r.x - 0.3) < 1e-12));
  assert.ok(Math.abs(h[3].y - 0.3) < 1e-12);
});

test('Flächen über mehrere Quadrate', () => {
  const f = flaechen(21234);
  assert.equal(f.filter(r => r.stufe === 0).length, 2);
  assert.ok(f.filter(r => r.stufe > 0).every(r => r.quadrat === 2));
  const summe = f.reduce((s, r) => s + r.w * r.h, 0);
  assert.ok(Math.abs(summe - 2.1234) < 1e-12);
});

test('Antippen färbt bis einschließlich des Teils, nochmal Antippen nimmt es weg', () => {
  // 4. Streifen, 5. Quadrat von oben (Hundertstel) → 0,35
  assert.equal(zahlBeiPunkt(0, 0.35, 0.45, 2, 0), 3500);
  assert.equal(zahlBeiPunkt(0, 0.35, 0.45, 2, 3500), 3400);
  // Zehntausendstel
  assert.equal(zahlBeiPunkt(0, 0.305, 0.405, 4, 0), 3401);
  // zweites Quadrat
  assert.equal(zahlBeiPunkt(1, 0.05, 0.05, 2, 0), 10100);
});

test('Zerlegung und kleinste Einheit', () => {
  assert.equal(zerlegung(3470), '3 Zehntel + 4 Hundertstel + 7 Tausendstel');
  assert.equal(zerlegung(15000), '1 Ganzes + 5 Zehntel');
  assert.equal(zerlegung(10500), '1 Ganzes + 5 Hundertstel');
  assert.equal(inKleinsterEinheit(3470), '347 Tausendstel');
  assert.equal(inKleinsterEinheit(12345), '12345 Zehntausendstel');
  assert.equal(inKleinsterEinheit(20000), null);
});

test('Rechtecke (Zehnerfeld): Größen, Fläche, Lage', () => {
  const g = k => teilGroesse(k, 'rechtecke');
  assert.deepEqual([g(1).w, g(1).h].map(v => +v.toFixed(6)), [0.2, 0.5]);
  assert.deepEqual([g(2).w, g(2).h].map(v => +v.toFixed(6)), [0.1, 0.1]);   // Hundertstel sind Quadrate
  assert.deepEqual([g(3).w, g(3).h].map(v => +v.toFixed(6)), [0.02, 0.05]);
  assert.deepEqual([g(4).w, g(4).h].map(v => +v.toFixed(6)), [0.01, 0.01]);
  const f = flaechen(3470, 'rechtecke');
  assert.ok(Math.abs(f.reduce((s, r) => s + r.w * r.h, 0) - 0.347) < 1e-12);
  // Zehntel zeilenweise: das vierte liegt oben bei x = 0,6
  const z = f.filter(r => r.stufe === 1);
  assert.ok(Math.abs(z[2].x - 0.4) < 1e-12 && z[2].y === 0);
  // 6. Zehntel liegt unten links
  const g6 = flaechen(6000, 'rechtecke').filter(r => r.stufe === 1)[5];
  assert.ok(g6.x === 0 && Math.abs(g6.y - 0.5) < 1e-12);
  // Hundertstel im 4. Zehntel (x 0,6 … 0,8, y 0 … 0,5), zeilenweise 2 nebeneinander
  const h = f.filter(r => r.stufe === 2);
  assert.ok(h.every(r => r.x >= 0.6 - 1e-12 && r.x < 0.8 && r.y < 0.5));
  assert.ok(Math.abs(h[2].y - 0.1) < 1e-12);
});

test('Rechtecke: Antippen', () => {
  // 4. Zehntel (oben, x 0,6 … 0,8), darin 3. Hundertstel (zweite Zeile links) → 0,33
  assert.equal(zahlBeiPunkt(0, 0.65, 0.15, 2, 0, 'rechtecke'), 3300);
  // ein Tausendstel im ersten Hundertstel
  assert.equal(zahlBeiPunkt(0, 0.005, 0.01, 3, 0, 'rechtecke'), 10);
});

test('Negative Zahlen (Zahlenstrahl von −3 bis 3, bis Tausendstel)', () => {
  assert.deepEqual(ziffern(-13500), { ganze: 1, nach: [3, 5, 0, 0], negativ: true });
  assert.equal(alsText(-13500), '−1,35');
  assert.equal(alsText(-30000), '−3');
  assert.deepEqual(lies('-1,35', 30000, -30000, 3), { n: -13500 });
  assert.deepEqual(lies('−0,5', 30000, -30000, 3), { n: -5000 });
  assert.deepEqual(lies('2,999', 30000, -30000, 3), { n: 29990 });
  assert.ok(lies('-3,1', 30000, -30000, 3).fehler);
  assert.ok(lies('0,1234', 30000, -30000, 3).fehler);     // nur bis Tausendstel
  assert.ok(lies('-0,5', EINHEIT).fehler);                // am Quadrat keine negativen Zahlen
  assert.equal(zerlegung(-13500), '−(1 Ganzes + 3 Zehntel + 5 Hundertstel)');
  assert.equal(inKleinsterEinheit(-13500), '−135 Hundertstel');
});

test('Brüche eingeben', async () => {
  const { bruchText } = await import('../js/zahl.js');
  const r = lies('1/10', 30000, -30000, 3);
  assert.equal(r.n, 1000);
  assert.deepEqual(r.bruch, { negativ: false, ganze: 0, zaehler: 1, nenner: 10 });
  assert.equal(lies('-3/4', 30000, -30000, 3).n, -7500);
  assert.equal(lies('− 3 / 4', 30000, -30000, 3).n, -7500);
  assert.equal(lies('1 1/2', 30000, -30000, 3).n, 15000);
  assert.equal(lies('7/4', 30000, -30000, 3).n, 17500);
  assert.equal(bruchText(lies('-1 3/8', 30000, -30000, 3).bruch), '−1 3/8');
  assert.ok(lies('1/3', 30000, -30000, 3).fehler);          // keine endliche Dezimalzahl
  assert.ok(lies('1/16', 30000, -30000, 3).fehler);         // 0,0625: zu viele Stellen am Zahlenstrahl
  assert.equal(lies('1/16', EINHEIT).n, 625);               // am Quadrat bis Zehntausendstel
  assert.ok(lies('1/0', 30000, -30000, 3).fehler);
  assert.ok(lies('7/2', 30000, -30000, 3).fehler);          // 3,5 > 3
  assert.ok(lies('-1/2', EINHEIT).fehler);                  // am Quadrat nicht negativ
});
