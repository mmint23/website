// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { SWING } from '../js/config.js';
import {
  swing, needle, emf, meterReading, swingLimits, collides, stepPhysics, resetPhysics, pushSwing, startDrag, dragTo, endDrag,
} from '../js/physik.js';

const rad = deg => deg * Math.PI / 180;

// Versuch einstellen, Schaukel aus der Auslenkung loslassen und laufen lassen; gibt Extremwerte der Spannung zurück
function run(settings = {}, { seconds = 3, start = 10 } = {}) {
  Object.assign(state, { northUp: true, angle: 0, meterMode: 'U', range: 3, brakeBoost: false }, settings);
  state.magnetAngle = state.angle;
  resetPhysics();
  swing.theta = Math.min(rad(start), swingLimits()[1]);
  let max = -Infinity, min = Infinity, firstSign = 0, maxTheta = 0;
  for (let i = 0; i < seconds * 600; i++) {
    stepPhysics(1 / 600);
    const u = emf();
    max = Math.max(max, u);
    min = Math.min(min, u);
    if (!firstSign && Math.abs(u) > 1e-4) firstSign = Math.sign(u);
    if (i > seconds * 300) maxTheta = Math.max(maxTheta, Math.abs(swing.theta));
  }
  return { max, min, firstSign, maxTheta };
}

test('ruhende Schaukel: keine Spannung', () => {
  const r = run({}, { start: 0 });
  assert.equal(r.max, 0);
  assert.equal(r.min, 0);
});

test('schwingende Schaukel: Wechselspannung in der Größenordnung U = B·l·v', () => {
  const r = run();
  // v_max = sqrt(2 g L (1 − cos 10°)) ≈ 0,26 m/s → U ≈ 0,1 T · 0,06 m · 0,26 m/s ≈ 1,5 mV
  assert.ok(r.max > 1.2e-3 && r.max < 1.8e-3, `U_max = ${r.max}`);
  assert.ok(r.min < -1.2e-3, 'Spannung wechselt das Vorzeichen');
});

test('Magnet umdrehen kehrt die Spannung um', () => {
  assert.equal(run().firstSign, -run({ northUp: false }).firstSign);
});

test('Feld parallel zur Bewegung (α = 90°): praktisch keine Spannung', () => {
  const normal = run({}, { start: 8 }), parallel = run({ angle: 90 }, { start: 8 });
  assert.ok(parallel.max < 0.1 * normal.max, `${parallel.max} vs. ${normal.max}`);
  const half = run({ angle: 60 }, { start: 8 });
  assert.ok(Math.abs(half.max / normal.max - 0.5) < 0.08, 'U ∼ cos α');
});

test('Schaukel dringt nie in den Magneten ein', () => {
  for (const angle of [0, 30, 60, 90]) {
    Object.assign(state, { angle, magnetAngle: angle });
    const [lo, hi] = swingLimits();
    assert.ok(lo < 0 && hi > 0);
    assert.ok(!collides(lo, angle) && !collides(hi, angle));
    resetPhysics();
    startDrag(rad(SWING.MAX_ANGLE));
    for (let i = 0; i < 300; i++) stepPhysics(1 / 60);
    assert.ok(swing.theta <= hi + 1e-9);
    dragTo(-rad(SWING.MAX_ANGLE));
    for (let i = 0; i < 300; i++) stepPhysics(1 / 60);
    assert.ok(swing.theta >= lo - 1e-9);
    endDrag();
  }
  // α = 90°: die Schenkel stehen vor und hinter dem Stab und begrenzen die Auslenkung
  assert.ok(swingLimits(90)[1] < rad(15));
});

test('Strommessung ohne Verstärkung: Bremsung kaum merklich, mit Verstärkung deutlich (Lenz)', () => {
  const voltage = run({}, { seconds: 6 }).maxTheta;
  const current = run({ meterMode: 'I' }, { seconds: 6 }).maxTheta;
  const boosted = run({ meterMode: 'I', brakeBoost: true }, { seconds: 6 }).maxTheta;
  assert.ok(Math.abs(current - voltage) < 0.01 * voltage);
  assert.ok(boosted < 0.5 * voltage, `${boosted} vs. ${voltage}`);
});

test('Zeiger folgt dem Messwert und bleibt am Anschlag', () => {
  Object.assign(state, { angle: 0, magnetAngle: 0, meterMode: 'U', range: 1 });
  resetPhysics();
  // Schaukel mit der Hand hin und her führen (1 Hz, ±12°): U_max ≈ 1,7 mV, also über dem Messbereich ±1 mV
  startDrag(0);
  let maxPos = 0;
  for (let i = 0; i < 180; i++) {
    dragTo(rad(12) * Math.sin(2 * Math.PI * i / 60));
    stepPhysics(1 / 60);
    maxPos = Math.max(maxPos, Math.abs(needle.pos));
  }
  assert.ok(maxPos > 1 && maxPos <= 1.08 + 1e-9, `Anschlag ${maxPos}`);
  endDrag();
  resetPhysics();
  assert.equal(meterReading(), 0);
  pushSwing();
  assert.ok(swing.theta > 0);
});

// ---------------- Magnet auf dem Tisch

import { magnetMotion, startMagnetDrag, dragMagnetTo, endMagnetDrag, stopSwing } from '../js/physik.js';

function tisch() {
  Object.assign(state, { setup: 'tisch', northUp: true, angle: 0, magnetAngle: 0, meterMode: 'U', range: 3, brakeBoost: false });
  resetPhysics();
}

test('Tisch: Magnet bewegen statt Schaukel – gleiche Relativbewegung, gleiche Spannung', () => {
  // Schaukel ruht, Magnet wird nach hinten gezogen (Stab bewegt sich relativ nach vorne)
  tisch();
  startMagnetDrag(0);
  let magnetU = 0;
  for (let i = 0; i < 30; i++) { dragMagnetTo(-0.5 * (i + 1)); stepPhysics(1 / 60); magnetU = Math.max(magnetU, emf()); }
  endMagnetDrag();
  assert.equal(swing.theta, 0, 'Schaukel bleibt in Ruhe');
  // Schaukel wird nach vorne gezogen, Magnet ruht
  tisch();
  startDrag(0);
  let swingU = 0;
  for (let i = 0; i < 30; i++) { dragTo(Math.asin(0.5 * (i + 1) / SWING.LENGTH)); stepPhysics(1 / 60); swingU = Math.max(swingU, emf()); }
  endDrag();
  assert.ok(magnetU > 0 && swingU > 0, 'gleiches Vorzeichen');
  assert.ok(Math.abs(magnetU / swingU - 1) < 0.15, `${magnetU} vs. ${swingU}`);
});

test('Tisch: Magnet nach vorne schieben – der Bogen schiebt die Schaukel mit, ohne einzudringen', () => {
  tisch();
  startMagnetDrag(0);
  for (let i = 0; i < 120; i++) {
    dragMagnetTo(0.25 * (i + 1));
    stepPhysics(1 / 60);
    assert.ok(!collides(swing.theta, 0, magnetMotion.z), `Schritt ${i}`);
  }
  endMagnetDrag();
  assert.ok(swing.theta > rad(10), 'Schaukel wurde nach vorne gedrückt');
  for (let i = 0; i < 120; i++) {
    stepPhysics(1 / 60);
    assert.ok(!collides(swing.theta, 0, magnetMotion.z));
  }
  stopSwing();
  assert.ok(!collides(swing.theta, 0, magnetMotion.z), 'Anhalten: Schaukel lehnt am Magneten');
  state.setup = 'drehbar';
});

test('Anhalten: Zeiger springt sofort auf 0', () => {
  Object.assign(state, { setup: 'drehbar', angle: 0, magnetAngle: 0, meterMode: 'U', range: 3 });
  resetPhysics();
  pushSwing();
  for (let i = 0; i < 20; i++) stepPhysics(1 / 60);
  assert.ok(Math.abs(needle.pos) > 0.05);
  stopSwing();
  assert.equal(needle.pos, 0);
  stepPhysics(1 / 60);
  assert.equal(needle.pos, 0);
});

test('langer Magnet: Schaukel schwingt weit aus, ohne anzustoßen', () => {
  for (const setup of ['drehbar', 'tisch']) {
    Object.assign(state, { setup, longMagnet: true, angle: 0, magnetAngle: 0, meterMode: 'U', range: 3, brakeBoost: false });
    resetPhysics();
    swing.theta = rad(30);
    let maxTheta = 0, minTheta = 0;
    for (let i = 0; i < 1200; i++) {
      stepPhysics(1 / 600);
      maxTheta = Math.max(maxTheta, swing.theta);
      minTheta = Math.min(minTheta, swing.theta);
    }
    // ungestörte Schwingung: nahezu dieselbe Amplitude auf beiden Seiten (nur Luftdämpfung)
    assert.ok(minTheta < -rad(29), `${setup}: ${minTheta}`);
    assert.ok(maxTheta < rad(30.2), `${setup}: ${maxTheta}`);
  }
  // kurzer Magnet zum Vergleich: stößt hinten an den Bogen
  Object.assign(state, { setup: 'drehbar', longMagnet: false });
  assert.ok(swingLimits(0)[0] > -rad(30));
  // drehbar bis 90°: der Bogen des langen Magneten bleibt über dem Tisch (Achse 26 cm, Bogen bis 24 cm)
  state.longMagnet = true;
  assert.ok(swingLimits(90)[1] > 0);
  state.longMagnet = false;
});

// ---------------- Erklärmodus

import { electron, electronForce, resetElectron } from '../js/physik.js';

test('Erklärmodus: Elektron wandert entgegen der Kraft auf positive Ladungen und kehrt beim Zurückschwingen um', () => {
  Object.assign(state, { setup: 'drehbar', longMagnet: false, northUp: true, angle: 0, magnetAngle: 0, explain: true });
  resetPhysics();
  // Stab nach vorne (+z), Feld nach unten (−y): v × B zeigt nach +x, Kraft auf das Elektron nach −x
  startDrag(0);
  for (let i = 0; i < 20; i++) { dragTo(rad(0.5 * (i + 1))); stepPhysics(1 / 60); }
  assert.ok(electronForce().x < 0 || electron.x < 0);
  assert.ok(electron.x < -0.1, `nach links: ${electron.x}`);
  assert.ok(emf() > 0, 'zugleich: rechtes Ende ist Pluspol');
  const left = electron.x;
  for (let i = 20; i > -20; i--) { dragTo(rad(0.5 * i)); stepPhysics(1 / 60); }
  endDrag();
  assert.ok(electron.x > left, 'zurück nach rechts');
  // Elektron bleibt im Stab
  startDrag(0);
  for (let i = 0; i < 600; i++) { dragTo(rad(12) * Math.sin(i / 10)); stepPhysics(1 / 60); assert.ok(Math.abs(electron.x) <= 6.5); }
  endDrag();
  resetElectron();
  assert.equal(electron.x, 0);
  // ohne Erklärmodus bleibt das Elektron in Ruhe
  state.explain = false;
  pushSwing();
  for (let i = 0; i < 60; i++) stepPhysics(1 / 60);
  assert.equal(electron.x, 0);
});

test('Festhalten: Leiter pendelt nicht, folgt Regler bzw. Finger und bleibt beim Loslassen stehen', async () => {
  const { setHold, holdTo } = await import('../js/physik.js');
  Object.assign(state, { setup: 'drehbar', longMagnet: false, northUp: true, angle: 0, magnetAngle: 0, explain: true });
  resetPhysics();
  swing.theta = rad(10);
  setHold(true);
  for (let i = 0; i < 120; i++) stepPhysics(1 / 60);
  assert.equal(swing.theta, rad(10), 'pendelt nicht zurück');
  assert.equal(emf(), 0);
  // Regler langsam nach hinten schieben: Leiter folgt, Spannung und wanderndes Elektron
  resetElectron();
  for (let i = 1; i <= 60; i++) { holdTo(rad(10 - i / 3)); stepPhysics(1 / 60); }
  assert.ok(Math.abs(swing.theta - rad(-10)) < rad(1.5), 'folgt dem Regler');
  assert.ok(emf() < 0 && electron.x > 0, 'nach hinten: Elektron wandert nach rechts');
  // Regler losgelassen: Leiter kommt binnen 0,2 s an der Reglerposition zur Ruhe und bleibt dort
  for (let i = 0; i < 12; i++) stepPhysics(1 / 60);
  assert.ok(Math.abs(swing.theta - rad(-10)) < rad(0.05));
  const stopped = swing.theta;
  for (let i = 0; i < 60; i++) stepPhysics(1 / 60);
  assert.ok(Math.abs(swing.theta - stopped) < rad(0.05), 'Leiter steht');
  // Ziehen: folgt dem Finger, bleibt beim Loslassen stehen
  startDrag(swing.theta);
  for (let i = 0; i < 30; i++) { dragTo(rad(-10 + i * 0.5)); stepPhysics(1 / 60); }
  endDrag();
  const released = swing.theta;
  for (let i = 0; i < 60; i++) stepPhysics(1 / 60);
  assert.equal(swing.theta, released);
  setHold(false);
  state.explain = false;
});

test('Viele Elektronen: drängen sich am einen Ende (Überschuss), am anderen bleibt Mangel', async () => {
  const { electronPositions, electronRestPositions, manyDriftLimit } = await import('../js/physik.js');
  const { EXPLAIN } = await import('../js/config.js');
  Object.assign(state, { setup: 'drehbar', longMagnet: true, northUp: true, angle: 0, magnetAngle: 0, explain: true, manyElectrons: true });
  resetPhysics();
  const rest = electronRestPositions();
  assert.deepEqual(electronPositions(0), rest, 'zu Beginn gleichmäßig verteilt');
  // Stab lange nach vorne bewegen: Kraft auf die Elektronen nach links
  startDrag(0);
  for (let i = 0; i < 240; i++) { dragTo(rad(25) * Math.min(1, i / 120)); stepPhysics(1 / 60); }
  endDrag();
  const p = electronPositions();
  const left = p.filter(x => x < 0).length, right = p.filter(x => x > 0).length;
  assert.ok(left > right + 4, `links ${left}, rechts ${right}`);
  for (let i = 1; i < p.length; i++) assert.ok(p[i] - p[i - 1] >= EXPLAIN.MANY.PACK - 1e-9, 'Mindestabstand');
  assert.ok(p[0] >= -(7.5 - EXPLAIN.ELECTRON_MARGIN) - 1e-9, 'bleiben im Stab');
  assert.ok(Math.abs(electron.x) <= manyDriftLimit() + 1e-9);
  // ganz zurück: wieder gleichmäßig verteilt
  assert.deepEqual(electronPositions(0), rest);
  state.manyElectrons = false;
  state.longMagnet = false;
  state.explain = false;
});

test('LED (Gedankenexperiment): leuchtet nur in Durchlassrichtung und oberhalb der Schwelle', async () => {
  const { ledBrightness } = await import('../js/physik.js');
  Object.assign(state, { setup: 'drehbar', longMagnet: false, northUp: true, angle: 0, magnetAngle: 0, explain: false, display: 'led', meterMode: 'I', brakeBoost: true });
  resetPhysics();
  assert.equal(ledBrightness(), 0, 'in Ruhe dunkel');
  swing.theta = rad(15);
  let lit = 0, dark = 0, maxB = 0;
  for (let i = 0; i < 1200; i++) {
    stepPhysics(1 / 600);
    const b = ledBrightness();
    maxB = Math.max(maxB, b);
    if (b > 0) { lit++; assert.ok(emf() > 1e-3, 'nur oberhalb der Schwelle, nur bei U > 0'); }
    else if (emf() < -1e-3) dark++;
  }
  assert.ok(lit > 0 && dark > 0, 'leuchtet in einer Richtung, in der anderen nicht');
  assert.ok(maxB > 0.3, `deutlich hell: ${maxB}`);
  // keine Bremswirkung im LED-Modus, auch wenn vorher Strommessung mit Verstärkung gewählt war
  const { inducedCurrent } = await import('../js/physik.js');
  assert.equal(inducedCurrent(), 0);
  Object.assign(state, { display: 'meter', meterMode: 'U', brakeBoost: false });
});

test('Kabel vertauschen: Zeiger und LED reagieren umgekehrt', async () => {
  const { ledBrightness } = await import('../js/physik.js');
  Object.assign(state, { setup: 'drehbar', longMagnet: false, northUp: true, angle: 0, magnetAngle: 0, explain: false, meterMode: 'U', display: 'meter', cablesSwapped: false });
  resetPhysics();
  // Stab nach vorne: rechtes Stabende ist Pluspol
  swing.theta = 0; swing.omega = 1.5;
  const normal = meterReading();
  state.cablesSwapped = true;
  assert.ok(normal > 0 && Math.abs(meterReading() + normal) < 1e-12, 'Zeiger andersherum');
  assert.equal(ledBrightness(), 0, 'LED in Sperrrichtung');
  swing.omega = -1.5;
  assert.ok(ledBrightness() > 0, 'LED leuchtet bei der anderen Halbschwingung');
  state.cablesSwapped = false;
  assert.equal(ledBrightness(), 0);
});

test('Glühlampe (Gedankenexperiment): glüht in beiden Richtungen, erst oberhalb der Schwelle, mit Nachglühen', async () => {
  const { lamp, lampGlow } = await import('../js/physik.js');
  Object.assign(state, { setup: 'drehbar', longMagnet: true, northUp: true, angle: 0, magnetAngle: 0, explain: false, display: 'lamp', cablesSwapped: false });
  resetPhysics();
  assert.equal(lampGlow(), 0);
  swing.theta = rad(25);
  let glowPos = 0, glowNeg = 0;
  for (let i = 0; i < 1200; i++) {
    stepPhysics(1 / 600);
    if (emf() > 0) glowPos = Math.max(glowPos, lampGlow());
    else glowNeg = Math.max(glowNeg, lampGlow());
  }
  assert.ok(glowPos > 0.2 && glowNeg > 0.2, `beide Richtungen: ${glowPos}, ${glowNeg}`);
  // kleine Schwingung: unter der Schwelle bleibt sie dunkel
  resetPhysics();
  swing.theta = rad(4);
  let maxGlow = 0;
  for (let i = 0; i < 1200; i++) { stepPhysics(1 / 600); maxGlow = Math.max(maxGlow, lampGlow()); }
  assert.equal(maxGlow, 0, 'zu wenig Spannung');
  // Nachglühen: nach dem Anhalten kühlt der Draht ab
  lamp.heat = 1;
  swing.omega = 0; swing.theta = 0;
  stepPhysics(1 / 60);
  assert.ok(lampGlow() > 0 && lampGlow() < 1, 'kühlt allmählich ab');
  for (let i = 0; i < 60; i++) stepPhysics(1 / 60);
  assert.equal(lampGlow(), 0);
  Object.assign(state, { display: 'meter', longMagnet: false });
});
