// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { B_FIELD, LOOP_AREA } from '../js/config.js';
import {
  rotor, needle, emf, sideEmf, stepPhysics, resetPhysics, startCrank, crankTo, endCrank,
} from '../js/physik.js';

const TWO_PI = 2 * Math.PI;

function spin(speed, seconds) {
  Object.assign(state, { drive: 'speed', speed, northUp: true, range: 10 });
  resetPhysics();
  let max = -Infinity, min = Infinity;
  for (let i = 0; i < seconds * 600; i++) {
    stepPhysics(1 / 600);
    if (i > 600) { max = Math.max(max, emf()); min = Math.min(min, emf()); }   // nach dem Anlaufen
  }
  return { max, min };
}

test('ruhende Schleife: keine Spannung', () => {
  const r = spin(0, 2);
  assert.ok(Math.abs(r.max) < 1e-15 && Math.abs(r.min) < 1e-15);
});

test('gleichmäßige Drehung: Wechselspannung mit Scheitelwert B·A·ω', () => {
  const r = spin(1, 4);
  const peak = B_FIELD * LOOP_AREA * TWO_PI;        // 0,1 T · 0,008 m² · 2π/s ≈ 5 mV
  assert.ok(Math.abs(r.max - peak) < 0.01 * peak, `${r.max} vs. ${peak}`);
  assert.ok(Math.abs(r.min + peak) < 0.01 * peak);
  // doppelte Drehzahl → doppelte Spannung
  const fast = spin(2, 4);
  assert.ok(Math.abs(fast.max - 2 * peak) < 0.02 * peak);
});

test('Spannung zwischen den Ringen folgt −B·A·ω·sin φ; Längsseiten tragen gleich viel bei', async () => {
  Object.assign(state, { drive: 'speed', speed: 1, northUp: true });
  resetPhysics();
  for (let i = 0; i < 1200; i++) stepPhysics(1 / 600);
  const { ringVoltage } = await import('../js/physik.js');
  const expected = -B_FIELD * LOOP_AREA * rotor.omega * Math.sin(rotor.phi);
  assert.ok(Math.abs(ringVoltage() - expected) < 1e-9);
  assert.ok(Math.abs(sideEmf(0) - sideEmf(1)) < 1e-12);
  // Schleife senkrecht zum Feld (φ = 0): Längsseiten bewegen sich längs der Feldlinien → U = 0
  rotor.phi = 0;
  assert.ok(Math.abs(emf()) < 1e-12);
});

test('Magnet umdrehen bzw. Drehrichtung umkehren kehrt die Spannung um', () => {
  Object.assign(state, { drive: 'speed', speed: 1, northUp: true });
  resetPhysics();
  for (let i = 0; i < 700; i++) stepPhysics(1 / 600);
  const u = emf();
  state.northUp = false;
  assert.ok(Math.abs(emf() + u) < 1e-12);
  state.northUp = true;
  rotor.omega = -rotor.omega;
  assert.ok(Math.abs(emf() + u) < 1e-12);
});

test('Kurbel: Schleife folgt dem Finger über mehrere Umdrehungen und läuft nach dem Loslassen aus', () => {
  Object.assign(state, { drive: 'crank', northUp: true });
  resetPhysics();
  startCrank(0);
  // eine gute Umdrehung in 1 s, in kleinen Schritten (Winkel springt bei ±π – darf nicht zurückdrehen)
  for (let i = 1; i <= 60; i++) {
    crankTo(Math.atan2(Math.sin(i * 0.12), Math.cos(i * 0.12)));
    stepPhysics(1 / 60);
  }
  assert.ok(rotor.phi > 6.5, `über eine Umdrehung: ${rotor.phi}`);
  assert.ok(rotor.omega > 5);
  endCrank();
  const released = rotor.omega;
  for (let i = 0; i < 60; i++) stepPhysics(1 / 60);
  assert.ok(rotor.omega > 0 && rotor.omega < released, 'läuft aus');
  for (let i = 0; i < 60 * 30; i++) stepPhysics(1 / 60);
  assert.equal(rotor.omega, 0, 'bleibt irgendwann stehen');
});

test('Zeiger: pendelt bei langsamer Drehung mit (Anschlag bei Überlast), bei schneller zittert er nur', () => {
  Object.assign(state, { drive: 'speed', speed: 3, northUp: true, range: 10 });   // 3 Hz, Scheitel ≈ 15 mV
  resetPhysics();
  let fastMax = 0;
  for (let i = 0; i < 3000; i++) { stepPhysics(1 / 600); if (i > 1200) fastMax = Math.max(fastMax, Math.abs(needle.pos)); }
  assert.ok(fastMax < 0.5, `träger Zeiger folgt 3 Hz nicht: ${fastMax}`);
  Object.assign(state, { speed: 0.8, range: 3 });   // 0,8 Hz, Scheitel ≈ 4 mV > 3 mV
  resetPhysics();
  let maxPos = 0, minPos = 0;
  for (let i = 0; i < 1800; i++) { stepPhysics(1 / 600); maxPos = Math.max(maxPos, needle.pos); minPos = Math.min(minPos, needle.pos); }
  assert.ok(maxPos <= 1.08 + 1e-9 && minPos >= -1.08 - 1e-9);
  assert.ok(maxPos > 1 && minPos < -1, 'schlägt in beide Richtungen an');
});

test('Festhalten: Schleife bleibt stehen, folgt Kurbel bzw. Regler und bleibt beim Loslassen stehen', async () => {
  const { setHold, holdTo } = await import('../js/physik.js');
  Object.assign(state, { drive: 'speed', speed: 1, northUp: true, hold: false });
  resetPhysics();
  for (let i = 0; i < 300; i++) stepPhysics(1 / 600);
  setHold(true);
  const held = rotor.phi;
  for (let i = 0; i < 600; i++) stepPhysics(1 / 600);
  assert.equal(rotor.phi, held, 'dreht nicht weiter, obwohl der Drehzahl-Regler auf 1 U/s steht');
  assert.ok(Math.abs(emf()) < 1e-15);
  // Regler auf 90°: Schleife senkrecht
  holdTo(Math.PI / 2);
  for (let i = 0; i < 300; i++) stepPhysics(1 / 600);
  assert.ok(Math.abs(Math.sin(rotor.phi) - 1) < 1e-6 && rotor.omega === rotor.omega);
  // Kurbel: folgt, bleibt beim Loslassen stehen
  startCrank(rotor.phi);
  for (let i = 1; i <= 30; i++) { crankTo(Math.PI / 2 + i * 0.05); stepPhysics(1 / 60); }
  endCrank();
  const released = rotor.phi;
  for (let i = 0; i < 120; i++) stepPhysics(1 / 60);
  assert.equal(rotor.phi, released);
  setHold(false);
});

test('Erklärmodus: Elektronen pendeln im Takt der Spannung entlang der Längsseiten', async () => {
  const { electrons, electronForce, sideVelocity } = await import('../js/physik.js');
  const { EXPLAIN } = await import('../js/config.js');
  Object.assign(state, { drive: 'speed', speed: 0.5, northUp: true, hold: false, explain: true });
  resetPhysics();
  const { meterReading } = await import('../js/physik.js');
  let min = 0, max = 0, sameSign = 0, samples = 0;
  for (let i = 0; i < 6000; i++) {
    stepPhysics(1 / 600);
    min = Math.min(min, electrons.shift); max = Math.max(max, electrons.shift);
    if (i > 1200 && Math.abs(meterReading()) > 1) { samples++; if (Math.sign(electrons.shift) === Math.sign(meterReading())) sameSign++; }
    // Kraft auf das Elektron steht senkrecht auf v und B
    const F = electronForce(0), v = sideVelocity(0);
    assert.ok(Math.abs(F.x * v.x + F.y * v.y + F.z * v.z) < 1e-12);
  }
  assert.ok(max > 0.5 && min < -0.5, `pendeln in beide Richtungen: ${min}, ${max}`);
  assert.ok(max <= EXPLAIN.ELECTRON_MAX + 1e-9 && min >= -EXPLAIN.ELECTRON_MAX - 1e-9, 'bleiben in der Längsseite');
  // Wo sich die Elektronen sammeln, ist der Minuspol: Verschiebung in Laufrichtung (zu Ende B / Ring 2) ↔
  // Ring 2 wird Minuspol ↔ das Messgerät (rot an Ring 1) zeigt positiv
  assert.ok(sameSign / samples > 0.9, `${sameSign}/${samples}`);
  state.explain = false;
  resetPhysics();
  for (let i = 0; i < 600; i++) stepPhysics(1 / 600);
  assert.equal(electrons.shift, 0, 'ohne Erklärmodus bleiben sie in Ruhe');
});

test('Antrieb Wind (vereinfacht): Drehzahl proportional zum Wind, mit Trägheit', async () => {
  const { turbineTargetRpm, park, stepPark } = await import('../js/physik.js');
  assert.equal(turbineTargetRpm(2), 0, 'unter 3 m/s steht der Rotor');
  assert.ok(Math.abs(turbineTargetRpm(3) - 3.5) < 1e-9);
  assert.ok(Math.abs(turbineTargetRpm(12) - 14) < 1e-9, 'bei 12 m/s wie im Windpark');
  assert.ok(Math.abs(turbineTargetRpm(20) / turbineTargetRpm(10) - 2) < 1e-9, 'doppelter Wind, doppelte Drehzahl');
  park.rpm = 0;
  state.wind = 12;
  stepPark(1);
  assert.ok(park.rpm > 6 && park.rpm < 11, `läuft träge an: ${park.rpm}`);
  for (let i = 0; i < 300; i++) stepPark(0.1);
  assert.ok(Math.abs(park.rpm - 14) < 0.01);
  state.wind = 0;
  for (let i = 0; i < 600; i++) stepPark(0.1);
  assert.equal(park.rpm, 0, 'kommt zum Stehen');
  state.wind = 8;
});

test('Antrieb Wind: Schleife dreht so schnell wie der Rotor im Windpark', async () => {
  const { park, stepPark } = await import('../js/physik.js');
  Object.assign(state, { drive: 'wind', wind: 12, hold: false, northUp: true });
  resetPhysics();
  park.rpm = 14;
  for (let i = 0; i < 600; i++) { stepPark(1 / 600); stepPhysics(1 / 600); }
  assert.ok(Math.abs(rotor.omega - 2 * Math.PI * 14 / 60) < 1e-6, 'gleiche Drehzahl (direkt angetrieben)');
  // Scheitelwert bei 14 U/min: B·A·ω ≈ 1,2 mV
  const peak = 0.1 * 0.008 * 2 * Math.PI * 14 / 60;
  let max = 0;
  for (let i = 0; i < 600 * 5; i++) { stepPark(1 / 600); stepPhysics(1 / 600); max = Math.max(max, emf()); }
  assert.ok(Math.abs(max - peak) < 0.02 * peak, `${max} vs. ${peak}`);
  Object.assign(state, { drive: 'speed', wind: 8 });
});

test('Laufrichtung passt zur Verdrahtung: Seite A von rechts nach links, Weg von Ende A zu Ende B', async () => {
  const { pathPoint, PATH_LENGTH, SINGLE_REST, sideDirection } = await import('../js/physik.js');
  const { LOOP } = await import('../js/config.js');
  assert.equal(sideDirection(0), -1);
  const a0 = pathPoint(SINGLE_REST - 1), a1 = pathPoint(SINGLE_REST + 1);
  assert.ok(Math.abs(a0.z - LOOP.RADIUS) < 1e-9 && a1.x < a0.x, 'Seite A wird in −x durchlaufen');
  assert.ok(Math.abs(pathPoint(SINGLE_REST).x) < 1e-9, 'einzelnes Elektron in der Mitte von Seite A');
  assert.ok(pathPoint(0).z > 0 && pathPoint(PATH_LENGTH).z < 0, 'Ende A vorne, Ende B hinten');
});

test('viele Elektronen: drängen sich am einen Ende zusammen, am anderen bleibt Mangel – im Takt der Spannung', async () => {
  const { electrons, manyPositions, PATH_LENGTH, meterReading } = await import('../js/physik.js');
  const { EXPLAIN } = await import('../js/config.js');
  Object.assign(state, { drive: 'speed', speed: 1, northUp: true, hold: false, explain: true, showManyElectrons: true });
  resetPhysics();
  let checked = 0;
  for (let i = 0; i < 3000; i++) {
    stepPhysics(1 / 600);
    if (i < 600 || Math.abs(meterReading()) < 4) continue;   // nahe dem Scheitelwert
    const p = manyPositions();
    const nearA = p.filter(s => s < PATH_LENGTH / 4).length, nearB = p.filter(s => s > 3 * PATH_LENGTH / 4).length;
    // Messgerät positiv ⇔ Ring 2 (Ende B) Minuspol ⇔ Elektronen bei Ende B
    if (meterReading() > 0) assert.ok(nearB > nearA + 6, `bei B gedrängt: A ${nearA}, B ${nearB}`);
    else assert.ok(nearA > nearB + 6, `bei A gedrängt: A ${nearA}, B ${nearB}`);
    for (let k = 1; k < p.length; k++) assert.ok(p[k] - p[k - 1] >= EXPLAIN.MANY_PACK - 1e-9);
    checked++;
  }
  assert.ok(checked > 50);
  Object.assign(state, { explain: false, showManyElectrons: false });
});

test('Spule mit COIL.TURNS Windungen: Spannung COIL.TURNS-mal so groß; bei 0,5 U/s passen beide in ±15 mV', async () => {
  const { COIL } = await import('../js/config.js');
  state.coil = false;
  const schleife = spin(0.5, 4);
  state.coil = true;
  const spule = spin(0.5, 4);
  state.coil = false;
  assert.ok(Math.abs(spule.max - COIL.TURNS * schleife.max) < 0.01 * spule.max, `${spule.max} vs. ${schleife.max}`);
  const anteil = u => 1000 * u / 15;   // Anteil der U-Achse im Messbereich ±15 mV
  assert.ok(anteil(schleife.max) > 0.15 && anteil(spule.max) < 0.9, `${anteil(schleife.max)} / ${anteil(spule.max)}`);
});
