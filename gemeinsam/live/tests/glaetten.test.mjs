import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Glaetter, zwischen, VERZOEGERUNG } from '../glaetten.js';

const zustand = (theta, extra = {}) => ({ swing: { theta, dragging: false }, view: { position: [theta, 0, 0] }, range: 3, ...extra });

test('zwischen mittelt nur die angegebenen Größen', () => {
  const a = zustand(0, { range: 3 }), b = zustand(1, { range: 10 });
  const m = zwischen(a, b, 0.25, [['swing', 'theta'], ['view', 'position']]);
  assert.equal(m.swing.theta, 0.25);
  assert.deepEqual(m.view.position, [0.25, 0, 0]);
  assert.equal(m.range, 3);   // Einstellung aus dem älteren Zustand, nicht gemittelt
  assert.equal(a.swing.theta, 0);   // Eingaben bleiben unverändert
});

test('gleichmäßige Anzeige trotz paarweiser Ankunft', () => {
  const g = new Glaetter(['swing.theta']);
  // Sender rechnet alle 33 ms (theta = Sendezeit in s), das iPad schickt immer zwei auf einmal
  for (let i = 0; i < 20; i += 2) {
    const ankunft = 1000 + (i + 1) * 33 + 5;
    g.empfangen(i * 33, zustand(i * 33 / 1000), ankunft);
    g.empfangen((i + 1) * 33, zustand((i + 1) * 33 / 1000), ankunft);
  }
  // Versatz: schnellster Weg 1005 ms; angezeigt wird Sendezeit = jetzt − 1005 − VERZOEGERUNG
  for (const jetzt of [1300, 1316, 1333, 1350]) {
    const sollZeit = jetzt - 1005 - VERZOEGERUNG;
    assert.ok(Math.abs(g.anzeigen(jetzt).swing.theta - sollZeit / 1000) < 1e-9, `bei ${jetzt}`);
  }
});

test('ohne neue Zustände bleibt der letzte stehen', () => {
  const g = new Glaetter(['swing.theta']);
  g.empfangen(0, zustand(0), 10);
  g.empfangen(33, zustand(1), 43);
  assert.equal(g.anzeigen(10_000).swing.theta, 1);
});

test('überholte Zustände werden ignoriert, Neustart des Senders setzt zurück', () => {
  const g = new Glaetter(['swing.theta']);
  g.empfangen(5000, zustand(1), 100);
  g.empfangen(5033, zustand(2), 133);
  g.empfangen(5010, zustand(9), 140);   // kommt zu spät
  assert.equal(g.puffer.length, 2);
  g.empfangen(20, zustand(7), 200);     // Sender neu geladen: Uhr fängt bei 0 an
  assert.equal(g.puffer.length, 1);
  assert.equal(g.anzeigen(200).swing.theta, 7);
});
