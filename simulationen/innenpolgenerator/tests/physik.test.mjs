// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { B_MAX, TURNS, CORE_AREA } from '../js/config.js';
import {
  rotor, needle, coilField, coilFieldRate, coilVoltage, meterVoltage, frequency, stepPhysics, resetPhysics,
  startCrank, crankTo, endCrank, setHold, holdTo,
} from '../js/physik.js';

const TWO_PI = 2 * Math.PI;
const near = (a, b, tol, text) => assert.ok(Math.abs(a - b) <= tol, `${text ?? ''} ${a} vs. ${b}`);

// Gleichmäßig drehen und Höchst- und Tiefstwert der Messgerätspannung nach dem Anlaufen bestimmen
function spin(speed, seconds, setup = {}) {
  Object.assign(state, { coils: 1, reversed: false, drive: 'speed', hold: false, speed, range: 1, ...setup });
  resetPhysics();
  let max = -Infinity, min = Infinity;
  for (let i = 0; i < seconds * 600; i++) {
    stepPhysics(1 / 600);
    if (i > 1200) { max = Math.max(max, meterVoltage()); min = Math.min(min, meterVoltage()); }
  }
  return { max, min };
}

test('Feld im Kern: am größten, wenn ein Pol auf die Spule zeigt', () => {
  near(coilField(0, 0), B_MAX, 1e-12, 'Nordpol zu Spule 1');
  near(coilField(0, Math.PI), -B_MAX, 1e-12, 'Südpol zu Spule 1');
  near(coilField(0, Math.PI / 2), 0, 1e-12, 'Magnet quer');
  near(coilField(1, 0), -B_MAX, 1e-12, 'Spule 2 sieht dann den Südpol');
});

test('ruhender Magnet: keine Spannung, auch wenn B groß ist', () => {
  const r = spin(0, 3);
  near(r.max, 0, 1e-12);
  near(r.min, 0, 1e-12);
});

test('Induktionsgesetz: U = −N·A·dB/dt, größte Spannung beim Nulldurchgang von B', () => {
  const omega = TWO_PI;
  for (const phi of [0, 0.4, Math.PI / 2, 2, Math.PI, 4, 3 * Math.PI / 2]) {
    // dB/dt numerisch aus coilField
    const h = 1e-6;
    const rate = (coilField(0, phi + omega * h) - coilField(0, phi - omega * h)) / (2 * h);
    near(coilFieldRate(0, phi, omega), rate, 1e-6, `dB/dt bei φ = ${phi}`);
    near(coilVoltage(0, phi, omega), -TURNS * CORE_AREA * rate, 1e-6, `U bei φ = ${phi}`);
  }
  const peak = TURNS * CORE_AREA * B_MAX * omega;
  near(Math.abs(coilVoltage(0, Math.PI / 2, omega)), peak, 1e-12, 'B = 0: |U| am größten');
  near(coilVoltage(0, 0, omega), 0, 1e-12, 'B am größten: U = 0');
});

test('gleichmäßige Drehung: Wechselspannung, Scheitelwert ∝ Drehzahl', () => {
  const peak = TURNS * CORE_AREA * B_MAX * TWO_PI;   // bei 1 U/s ≈ 0,29 V
  const r = spin(1, 5);
  near(r.max, peak, 0.01 * peak);
  near(r.min, -peak, 0.01 * peak);
  const fast = spin(2, 5);
  near(fast.max, 2 * peak, 0.02 * peak);
});

test('zwei Spulen: richtig verbunden doppelte Spannung, vertauscht keine', () => {
  const single = spin(1, 5);
  const both = spin(1, 5, { coils: 2 });
  near(both.max, 2 * single.max, 0.01 * single.max);
  near(coilVoltage(1, 1, TWO_PI), -coilVoltage(0, 1, TWO_PI), 1e-12, 'U₂ = −U₁');
  const reversed = spin(1, 5, { coils: 2, reversed: true });
  near(reversed.max, 0, 1e-9);
  near(reversed.min, 0, 1e-9);
});

test('Frequenz = Drehzahl (ein Polpaar)', () => {
  spin(1.5, 4);
  near(frequency(), 1.5, 0.01);
});

test('Zeiger folgt langsamer Wechselspannung, zittert bei schneller nur', () => {
  Object.assign(state, { coils: 1, drive: 'speed', speed: 0.25, hold: false, range: 0.3 });
  resetPhysics();
  let slow = 0;
  for (let i = 0; i < 6000; i++) { stepPhysics(1 / 600); if (i > 2400) slow = Math.max(slow, Math.abs(needle.pos)); }
  Object.assign(state, { speed: 3, range: 3 });
  resetPhysics();
  let fast = 0;
  for (let i = 0; i < 6000; i++) { stepPhysics(1 / 600); if (i > 2400) fast = Math.max(fast, Math.abs(needle.pos)); }
  const expectedSlow = TURNS * CORE_AREA * B_MAX * TWO_PI * 0.25 / 0.3;
  assert.ok(slow > 0.6 * expectedSlow, `langsam: ${slow}`);
  const expectedFast = TURNS * CORE_AREA * B_MAX * TWO_PI * 3 / 3;
  assert.ok(fast < 0.3 * expectedFast, `schnell: ${fast}`);
});

test('Kurbel: Magnet folgt dem Finger, läuft nach dem Loslassen aus', () => {
  Object.assign(state, { coils: 1, drive: 'crank', hold: false });
  resetPhysics();
  startCrank(0);
  for (let k = 1; k <= 60; k++) {
    crankTo(k * 0.1);
    for (let i = 0; i < 10; i++) stepPhysics(1 / 600);
  }
  assert.ok(rotor.phi > 5, `gedreht: ${rotor.phi}`);
  endCrank();
  const omega = rotor.omega;
  for (let i = 0; i < 600; i++) stepPhysics(1 / 600);
  assert.ok(rotor.omega < omega && rotor.omega >= 0);
});

test('Festhalten: Magnet bleibt stehen, Drehwinkel lässt sich einstellen', () => {
  Object.assign(state, { coils: 1, drive: 'speed', speed: 2, hold: false });
  resetPhysics();
  for (let i = 0; i < 600; i++) stepPhysics(1 / 600);
  setHold(true);
  const phi = rotor.phi;
  for (let i = 0; i < 600; i++) stepPhysics(1 / 600);
  near(rotor.phi, phi, 1e-9);
  holdTo(phi + 1);
  for (let i = 0; i < 1200; i++) stepPhysics(1 / 600);
  near(rotor.phi, phi + 1, 1e-3);
  near(meterVoltage(), 0, 1e-3, 'steht wieder: keine Spannung');
  setHold(false);
});
