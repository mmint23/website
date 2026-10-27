// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { MAGNET, MULTIMETER } from '../js/config.js';
import {
  bodies, multimeter, loopFlux, coilFlux, coilVoltage, stepPhysics, resetPhysics, startDrag, dragTo, endDrag, fluxChanged,
} from '../js/physik.js';

const near = (a, b, tol, text) => assert.ok(Math.abs(a - b) <= tol, `${text ?? ''} ${a} vs. ${b}`);
const DT = 1 / 120;

// Teil (magnet oder coil) mit gleichmäßiger Geschwindigkeit v (cm/s) von seiner Lage nach x1 ziehen; liefert die
// kleinste und größte Spannung während der Bewegung
function ziehe(name, x1, v) {
  const x0 = bodies[name].x;
  startDrag(name, x0);
  let min = 0, max = 0;
  const dauer = Math.abs(x1 - x0) / v;
  for (let t = 0; t <= dauer; t += DT) {
    dragTo(name, x0 + (x1 - x0) * t / dauer);
    stepPhysics(DT);
    min = Math.min(min, coilVoltage());
    max = Math.max(max, coilVoltage());
  }
  endDrag(name);
  return { min, max };
}

function start(magnet, coil, northRight = true) {
  state.northRight = northRight;
  resetPhysics();
  Object.assign(bodies.magnet, { x: magnet, target: magnet });
  Object.assign(bodies.coil, { x: coil, target: coil });
  stepPhysics(DT);   // Fluss für die Ausgangslage merken
}

test('Fluss durch eine Windung ändert sich stetig, auch an der Stirnfläche des Magneten', () => {
  const face = MAGNET.LENGTH / 2;
  near(loopFlux(face - 1e-6, 0, true), loopFlux(face + 1e-6, 0, true), 1e-9, 'Nordpol');
  near(loopFlux(-face - 1e-6, 0, true), loopFlux(-face + 1e-6, 0, true), 1e-9, 'Südpol');
});

test('Fluss in der Spule: am größten, wenn der Magnet mittendrin steckt, weit weg fast null', () => {
  const mitte = coilFlux(0, 0, true);
  assert.ok(mitte > 0, 'Nordpol rechts: Feld im Inneren nach rechts');
  assert.ok(coilFlux(0, -6, true) < mitte && coilFlux(0, 6, true) < mitte);
  near(coilFlux(0, -60, true), 0, mitte * 0.01, 'weit weg');
  near(coilFlux(0, 0, false), -mitte, 1e-12, 'umgedrehter Magnet');
});

test('ruhender Magnet in der Spule: keine Spannung, obwohl das Feld groß ist', () => {
  start(8, 8);
  for (let i = 0; i < 120; i++) stepPhysics(DT);
  near(coilVoltage(), 0, 1e-12);
});

test('Hineinschieben und Herausziehen geben Spannungen mit entgegengesetztem Vorzeichen', () => {
  start(-20, 8);
  const hinein = ziehe('magnet', 8, 20);
  for (let i = 0; i < 60; i++) stepPhysics(DT);
  const heraus = ziehe('magnet', -20, 20);
  assert.ok(hinein.min < -0.01 && hinein.max < 1e-3, `hinein ${hinein.min} … ${hinein.max}`);
  assert.ok(heraus.max > 0.01 && heraus.min > -1e-3, `heraus ${heraus.min} … ${heraus.max}`);
  near(-hinein.min, heraus.max, 0.1 * heraus.max, 'gleich groß');
});

test('Es kommt nur auf die Relativbewegung an: Spule über den Magneten ziehen wirkt wie Magnet in die Spule', () => {
  start(-20, 8);
  const magnetBewegt = ziehe('magnet', 8, 20);
  start(-20, 8);
  const spuleBewegt = ziehe('coil', -20, 20);
  near(spuleBewegt.min, magnetBewegt.min, 0.05 * Math.abs(magnetBewegt.min));
});

test('Schneller bewegt: größere Spannung; Magnet umgedreht: Vorzeichen umgekehrt', () => {
  start(-20, 8);
  const langsam = ziehe('magnet', 8, 10);
  start(-20, 8);
  const schnell = ziehe('magnet', 8, 30);
  assert.ok(-schnell.min > 2 * -langsam.min, `${schnell.min} vs. ${langsam.min}`);
  start(-20, 8, false);
  const umgedreht = ziehe('magnet', 8, 30);
  near(umgedreht.max, -schnell.min, 0.05 * umgedreht.max);
});

test('Magnet umdrehen in Ruhe gibt keinen Spannungsstoß', () => {
  start(8, 8);
  state.northRight = false;
  fluxChanged();
  stepPhysics(DT);
  near(coilVoltage(), 0, 1e-12);
});

test('Multimeter zeigt nur alle INTERVAL Sekunden einen neuen Wert', () => {
  start(-20, 8);
  stepPhysics(MULTIMETER.INTERVAL * 1.5);   // erster Messwert ist genommen
  const vorher = multimeter.reading;
  startDrag('magnet', -20);
  dragTo('magnet', -10);
  stepPhysics(MULTIMETER.INTERVAL * 0.3);   // Bewegung, aber noch kein neuer Messwert fällig
  assert.notEqual(coilVoltage(), 0);
  assert.equal(multimeter.reading, vorher);
  endDrag('magnet');
});
