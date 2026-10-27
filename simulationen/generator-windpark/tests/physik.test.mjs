// Tests der Windrad-Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
// (Das Generator-Modell wird in simulationen/generator-leiterschleife/tests getestet.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { turbineTargetRpm, park, stepPark } from '../js/physik.js';

test('Windpark: Drehzahl der Windräder hängt vom Wind ab, mit Trägheit', () => {
  assert.equal(turbineTargetRpm(2), 0, 'unter 3 m/s stehen sie');
  assert.equal(turbineTargetRpm(3), 6);
  assert.ok(turbineTargetRpm(8) > 6 && turbineTargetRpm(8) < 14);
  assert.equal(turbineTargetRpm(12), 14);
  assert.equal(turbineTargetRpm(20), 14, 'Nenndrehzahl');
  park.rpm = 0;
  state.wind = 12;
  stepPark(1);
  assert.ok(park.rpm > 3 && park.rpm < 6, `läuft träge an: ${park.rpm}`);
  for (let i = 0; i < 300; i++) stepPark(0.1);
  assert.ok(Math.abs(park.rpm - 14) < 0.01);
  state.wind = 0;
  for (let i = 0; i < 600; i++) stepPark(0.1);
  assert.equal(park.rpm, 0, 'kommt zum Stehen');
  state.wind = 8;
});
