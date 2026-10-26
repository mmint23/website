import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zufall, erzeugeElementarmagnete, feldVonPolen, schritt, hammerschlag, magnetisierung, stabmagnetPole } from '../js/modell.js';

const neu = (seed = 1) => erzeugeElementarmagnete(14, 3, 14, 2.4, zufall(seed));

/** Stabmagnet (Nordpol unten) knapp über dem Stück von links nach rechts ziehen */
function streichen(magnete, material, unten = 'N', rnd = zufall(9)) {
  for (let x = -9; x <= 9; x += 0.05) {
    const pole = stabmagnetPole(x, 1.2 + 3 + 0.2, 6, unten);
    schritt(magnete, (px, py) => feldVonPolen(pole, px, py), 1 / 60, material, rnd);
  }
  // Magnet weit weg, etwas Zeit vergehen lassen
  for (let k = 0; k < 120; k++) schritt(magnete, () => ({ bx: 0, by: 0 }), 1 / 60, material, rnd);
}

test('ungeordnet am Anfang', () => {
  assert.ok(magnetisierung(neu()).ordnung < 0.3);
});

test('Streichen mit dem Nordpol nach rechts: Südpol am Ende des Strichs (rechts), Stahl bleibt magnetisch', () => {
  const m = neu();
  for (let k = 0; k < 3; k++) streichen(m, 'stahl');
  const { mx, ordnung } = magnetisierung(m);
  assert.ok(ordnung > 0.5, `Ordnung ${ordnung}`);
  assert.ok(mx < 0, 'Nordpole der Elementarmagnete zeigen nach links → rechts Südpol');
});

test('Streichen mit dem Südpol: umgekehrt', () => {
  const m = neu();
  for (let k = 0; k < 4; k++) streichen(m, 'stahl', 'S');
  assert.ok(magnetisierung(m).mx > 0.4);
});

test('Weicheisen verliert die Ordnung wieder', () => {
  const m = neu();
  const rnd = zufall(3);
  for (const e of m) e.theta = 0;                       // ganz geordnet
  for (let k = 0; k < 600; k++) schritt(m, () => ({ bx: 0, by: 0 }), 1 / 60, 'weicheisen', rnd);
  assert.ok(magnetisierung(m).ordnung < 0.3);
});

test('Hammerschläge zerstören die Ordnung', () => {
  const m = neu();
  for (const e of m) e.theta = 0;
  const rnd = zufall(5);
  for (let k = 0; k < 8; k++) hammerschlag(m, rnd);
  assert.ok(magnetisierung(m).ordnung < 0.35);
});

test('Spulenfeld: Weicheisen richtet sich aus, Stahl bei schwachem Feld nicht', () => {
  const feld = () => ({ bx: 0.5, by: 0 });
  const w = neu(), s = neu();
  const rnd = zufall(7);
  for (let k = 0; k < 300; k++) { schritt(w, feld, 1 / 60, 'weicheisen', rnd); schritt(s, feld, 1 / 60, 'stahl', rnd); }
  assert.ok(magnetisierung(w).mx > 0.8);
  assert.ok(magnetisierung(s).mx < 0.4);
});
