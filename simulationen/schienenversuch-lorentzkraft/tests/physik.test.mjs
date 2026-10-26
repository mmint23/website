// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { barMotion, lukasMotion, lorentzForceMagnitude, lorentzForceX, stepPhysics, resetMotion } from '../js/physik.js';

// Versuch einstellen und für eine gewisse Zeit laufen lassen
function run(settings, seconds = 5) {
  Object.assign(state, {
    mode: 'basic', powerOn: true, current: 4, polarity: 1, northUp: true, fieldScale: 1, angle: 90, friction: true,
  }, settings);
  state.magnetAngle = state.angle;
  resetMotion();
  for (let i = 0; i < seconds * 60; i++) stepPhysics(1 / 60);
  return { x: barMotion.x, left: lukasMotion[0].max, right: lukasMotion[1].max };
}

for (const mode of ['basic', 'angle']) {
  test(`${mode}: Richtung der Kraft folgt Polung und Magnet (Drei-Finger-Regel)`, () => {
    // Plus vorne, Nordpol oben: Strom −z, Feld −y → Kraft −x (nach links)
    assert.ok(run({ mode }).x < -20, 'Startzustand: nach links');
    assert.ok(run({ mode, polarity: -1 }).x > 10, 'Polung umgekehrt: nach rechts');
    assert.ok(run({ mode, northUp: false }).x > 10, 'Magnet umgedreht: nach rechts');
    assert.ok(run({ mode, polarity: -1, northUp: false }).x < -20, 'beides umgekehrt: nach links');
  });

  test(`${mode}: ohne Strom bewegt sich nichts`, () => {
    const result = run({ mode, powerOn: false });
    assert.equal(result.x, 0);
    assert.equal(result.left + result.right, 0);
  });

  test(`${mode}: Kraftmesser zeigt auf der richtigen Seite und steigt mit der Stromstärke`, () => {
    let previous = 0;
    for (const current of [2, 4, 6, 8, 10]) {
      const { left, right } = run({ mode, current });
      assert.equal(right, 0, 'rechter Kraftmesser bleibt in Ruhe');
      assert.ok(left > previous, `${current} A höher als vorher (${left.toFixed(1)} > ${previous.toFixed(1)})`);
      previous = left;
    }
    assert.ok(run({ mode, polarity: -1 }).right > 0, 'bei umgekehrter Polung zeigt der rechte Kraftmesser');
  });
}

test('Kraft ist proportional zur Magnetfeldstärke', () => {
  Object.assign(state, { mode: 'basic', powerOn: true, current: 4, magnetAngle: 90, fieldScale: 1 });
  const full = lorentzForceMagnitude();
  assert.ok(Math.abs(full - 0.032) < 1e-9, 'F = I · l · B = 4 A · 0,08 m · 0,1 T = 32 mN');
  state.fieldScale = 2;
  assert.ok(Math.abs(lorentzForceMagnitude() - 2 * full) < 1e-12, 'doppeltes Feld, doppelte Kraft');
  state.fieldScale = 0;
  assert.equal(lorentzForceMagnitude(), 0, 'ohne Feld keine Kraft');
  state.fieldScale = 1;
});

for (const mode of ['basic', 'angle']) {
  test(`${mode}: Kraftmesser steigt mit der Magnetfeldstärke, ohne Feld passiert nichts`, () => {
    const heights = [0.5, 1, 1.5].map(fieldScale => run({ mode, fieldScale }).left);
    assert.ok(heights[0] < heights[1] && heights[1] < heights[2], `50 % < 100 % < 150 % (${heights.map(h => h.toFixed(1))})`);
    const noField = run({ mode, fieldScale: 0 });
    assert.equal(noField.x, 0);
    assert.equal(noField.left + noField.right, 0);
  });
}

test('Kraft ist proportional zu sin α', () => {
  Object.assign(state, { mode: 'angle', powerOn: true, current: 4, fieldScale: 1 });
  const forceAt = alpha => { state.magnetAngle = alpha; return lorentzForceMagnitude(); };
  assert.ok(Math.abs(forceAt(90) - 0.032) < 1e-9, 'F = I · l · B = 4 A · 0,2 m · 0,04 T = 32 mN');
  assert.ok(Math.abs(forceAt(150) - forceAt(90) / 2) < 1e-9, 'bei 150° halbe Kraft');
  assert.ok(forceAt(180) < 1e-12, 'bei 180° keine Kraft');
});

test('Drehbarer Magnet: Kraft bei α und 180° − α gleich (Betrag und Richtung)', () => {
  Object.assign(state, { mode: 'angle', powerOn: true, current: 4 });
  for (const polarity of [1, -1]) {
    for (const northUp of [true, false]) {
      Object.assign(state, { polarity, northUp });
      for (let alpha = 0; alpha <= 90; alpha += 15) {
        state.magnetAngle = alpha;
        const before = lorentzForceX(0);
        state.magnetAngle = 180 - alpha;
        assert.ok(Math.abs(lorentzForceX(0) - before) < 1e-12, `α = ${alpha}°`);
      }
    }
  }
});

test('Drehbarer Magnet: Kraftmesser steigt mit dem Winkel, bei 180° passiert nichts', () => {
  const heights = [150, 120, 90].map(angle => run({ mode: 'angle', current: 10, angle }).left);
  assert.ok(heights[0] < heights[1] && heights[1] < heights[2], `150° < 120° < 90° (${heights.map(h => h.toFixed(1))})`);
  const parallel = run({ mode: 'angle', current: 10, angle: 180 });
  assert.equal(parallel.x, 0);
  assert.equal(parallel.left + parallel.right, 0);
});

test('Haftreibung: sehr kleiner Strom bewegt die Stange nur ohne Reibung', () => {
  assert.equal(run({ current: 0.3 }).x, 0);
  assert.ok(run({ current: 0.3, friction: false }).x < -1);
});
