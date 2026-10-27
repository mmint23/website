import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packen, entpacken, pruefen, getroffen, GRENZEN } from '../striche.js';

const frei = { k: 'free', c: '#c62828', p: [{ x: 10, y: 20, pr: 0.5 }, { x: 30.04, y: 40, pr: 0.333 }] };
const pfeil = { k: 'arrow', c: '#1565c0', a: { x: 0, y: 0 }, b: { x: 100, y: 50 } };

test('packen und entpacken ergeben dieselben Striche (gerundet)', () => {
  const zurueck = entpacken(packen([frei, pfeil]));
  assert.deepEqual(zurueck, [
    { k: 'free', c: '#c62828', p: [{ x: 10, y: 20, pr: 0.5 }, { x: 30, y: 40, pr: 0.33 }] },
    pfeil,
  ]);
});

test('Striche auf weiteren Seiten behalten ihre Seite', () => {
  const zurueck = entpacken(packen([{ ...pfeil, s: 1 }, frei]));
  assert.equal(zurueck[0].s, 1);
  assert.ok(!('s' in zurueck[1]));
  assert.equal(pruefen(packen([{ ...pfeil, s: 1 }])), null);
  assert.equal(pruefen([{ k: 'a', c: '#000000', p: [0, 0, 1, 1], s: 1.5 }]), 'Ungültige Seite');
  assert.equal(pruefen([{ k: 'a', c: '#000000', p: [0, 0, 1, 1], s: GRENZEN.SEITEN }]), 'Ungültige Seite');
});

test('gültige Abgabe wird angenommen', () => {
  assert.equal(pruefen(packen([frei, pfeil])), null);
  assert.equal(pruefen([]), null);
});

test('ungültige Abgaben werden abgewiesen', () => {
  assert.equal(pruefen(null), 'Striche fehlen');
  assert.equal(pruefen([{ k: 'f', c: 'rot', p: [1, 2, 0.5] }]), 'Ungültige Farbe');
  assert.equal(pruefen([{ k: 'a', c: '#000000', p: [1, 2, 3] }]), 'Ungültiger Pfeil');
  assert.equal(pruefen([{ k: 'f', c: '#000000', p: [1, 2] }]), 'Ungültiger Strich');
  assert.equal(pruefen([{ k: 'x', c: '#000000', p: [1, 2, 3] }]), 'Ungültiger Strich');
  assert.equal(pruefen([{ k: 'f', c: '#000000', p: [1, 'zwei', 0.5] }]), 'Ungültige Koordinaten');
  assert.equal(pruefen([{ k: 'f', c: '#000000', p: [1, 1e9, 0.5] }]), 'Ungültige Koordinaten');
});

test('Grenzen für Anzahl der Striche und Punkte', () => {
  const strich = { k: 'a', c: '#000000', p: [0, 0, 1, 1] };
  assert.equal(pruefen(Array(GRENZEN.STRICHE + 1).fill(strich)), 'Zu viele Striche');
  const lang = { k: 'f', c: '#000000', p: Array(3 * (GRENZEN.PUNKTE + 1)).fill(1) };
  assert.equal(pruefen([lang]), 'Zeichnung zu groß');
});

test('Radierer trifft Striche in der Nähe', () => {
  assert.ok(getroffen(pfeil, { x: 50, y: 30 }, 18));
  assert.ok(!getroffen(pfeil, { x: 50, y: 80 }, 18));
  assert.ok(getroffen(frei, { x: 20, y: 30 }, 5));
});
