// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { MAGNET, COIL, MULTIMETER, STRENGTHS } from '../js/config.js';
import { linienInSpule } from '../js/feldlinienModell.js';
import {
  bodies, needle, multimeter, fluxPerTurn, coilVoltage, pointerVoltage, collides, stepPhysics, resetPhysics,
  startDrag, dragTo, endDrag, turnTo, fluxChanged, connection, multimeterRefresh, needleTarget,
} from '../js/physik.js';

const near = (a, b, tol, text) => assert.ok(Math.abs(a - b) <= tol, `${text ?? ''} ${a} vs. ${b}`);
const DT = 1 / 120;
const magnet = (x, extra = {}) => ({ x, angle: 0, north: 1, B: 0.3, ...extra });
const coil = (x, angle = 0, extra = {}) => ({ x, angle, ...extra });

// Teil (magnet oder coil) mit gleichmäßiger Geschwindigkeit v (cm/s) von seiner Lage nach x1 ziehen; liefert die
// kleinste und größte Spannung an der Spule während der Bewegung
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

function start(xMagnet, xCoil, setup = {}) {
  Object.assign(state, {
    northRight: true, strength: 'medium', turns: 600, freeMove: false, lineModel: false, meter: 'pointer', multiMode: 'off',
    range: 0.3, ...setup,
  });
  state.plugs = { red: null, black: null, ...setup.plugs };
  resetPhysics();
  Object.assign(bodies.magnet, { x: xMagnet, target: xMagnet });
  Object.assign(bodies.coil, { x: xCoil, target: xCoil });
  stepPhysics(DT);   // Fluss für die Ausgangslage merken
}

// Vergleich: Polmodell für Magnet und Spule auf einer Achse (Raumwinkel der Pole, dazu der Fluss im Magneten,
// wenn die Windung ihn umschließt) – stimmt für eine dünne Dipolkette genau
function polmodell(xCoil, xMagnet) {
  const p = 0.3 * (MAGNET.WIDTH / 100) ** 2, R = COIL.R_WIND, half = MAGNET.LENGTH / 2;
  const pol = (q, d) => (d === 0 ? 0 : q / 2 * Math.sign(d) * (1 - Math.abs(d) / Math.hypot(d, R)));
  let summe = 0;
  for (let i = 0; i < 48; i++) {
    const x = xCoil + COIL.LENGTH * ((i + 0.5) / 48 - 0.5);
    summe += pol(p, x - xMagnet - half) + pol(-p, x - xMagnet + half) + (Math.abs(x - xMagnet) < half ? p : 0);
  }
  return summe / 48;
}

test('Fluss auf der Achse wie im Polmodell, am größten mit dem Magneten mittendrin', () => {
  for (const x of [-30, -12, -4, 0, 4, 8, 14]) near(fluxPerTurn(magnet(x), coil(8)), polmodell(8, x), 2e-3 * polmodell(8, 8), `Magnet bei ${x}`);
  const mitte = fluxPerTurn(magnet(8), coil(8));
  assert.ok(fluxPerTurn(magnet(2), coil(8)) < mitte && fluxPerTurn(magnet(14), coil(8)) < mitte);
  near(fluxPerTurn(magnet(8, { north: -1 }), coil(8)), -mitte, 1e-12, 'umgedreht');
});

test('Fluss: Magnet quer zur Spulenachse – auf der Achse null; Spule mitgedreht wie Magnet gedreht', () => {
  near(fluxPerTurn(magnet(-6, { angle: Math.PI / 2 }), coil(8)), 0, 1e-12);
  // alles um die Spulenmitte gedreht ändert nichts: Magnet bei 0° links, Spule 180° gedreht ≙ Magnet umgedreht
  near(fluxPerTurn(magnet(-6), coil(8, Math.PI)), -fluxPerTurn(magnet(-6), coil(8)), 1e-12);
});

test('Kollision: gerade durch die Bohrung ja, schräg in der Spule oder quer am Flansch nicht', () => {
  assert.equal(collides(magnet(8), coil(8)), false);
  assert.equal(collides(magnet(8, { angle: 0.3 }), coil(8)), true);
  assert.equal(collides(magnet(-6, { angle: Math.PI / 2 }), coil(8)), false);
  assert.equal(collides(magnet(3, { angle: Math.PI / 2 }), coil(8)), true);
});

test('Drehen in der Spule wird gestoppt, außerhalb nicht', () => {
  start(8, 8);
  turnTo('magnet', Math.PI / 4);
  for (let i = 0; i < 60; i++) stepPhysics(DT);
  assert.ok(bodies.magnet.angle < 0.15, `${bodies.magnet.angle}`);
  start(-17, 8);
  turnTo('magnet', Math.PI / 4);
  for (let i = 0; i < 240; i++) stepPhysics(DT);
  near(bodies.magnet.angle, Math.PI / 4, 1e-4);
});

test('Magnet dicht vor der Spule drehen erzeugt eine Spannung', () => {
  start(-3, 8);
  turnTo('magnet', Math.PI / 2);
  let max = 0;
  for (let i = 0; i < 60; i++) {
    stepPhysics(DT);
    max = Math.max(max, Math.abs(coilVoltage()));
  }
  assert.ok(max > 0.005, `${max}`);
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

test('Schneller, mehr Windungen, stärkerer Magnet: größere Spannung; umgedreht: umgekehrt', () => {
  const spitze = setup => {
    start(-20, 8, setup);
    const { min, max } = ziehe('magnet', 8, setup.v ?? 15);
    return -min > max ? min : max;   // größter Ausschlag mit Vorzeichen
  };
  const basis = spitze({});
  near(spitze({ v: 30 }), 2 * basis, 0.1 * -basis, 'doppelt so schnell');
  near(spitze({ turns: 1200 }), 2 * basis, 0.05 * -basis, 'doppelte Windungszahl');
  near(spitze({ strength: 'strong' }), 2 * basis, 0.05 * -basis, 'doppelt so stark');
  near(spitze({ northRight: false }), -basis, 0.05 * -basis, 'umgedreht');
});

test('Stärke oder Windungszahl in Ruhe ändern gibt keinen Spannungsstoß', () => {
  start(8, 8);
  state.turns = 1200;
  state.strength = 'strong';
  fluxChanged();
  stepPhysics(DT);
  near(coilVoltage(), 0, 1e-12);
});

test('Zeigermessgerät: nur angesteckt zeigt es etwas, vertauscht in die andere Richtung', () => {
  start(-20, 8);
  ziehe('magnet', 0, 20);
  assert.equal(pointerVoltage(), 0);
  near(needle.pos, 0, 1e-12, 'Zeiger bleibt in Ruhe');
  start(-20, 8, { plugs: { red: 'plus', black: 'minus' } });
  startDrag('magnet', -20);
  dragTo('magnet', -10);
  stepPhysics(DT);
  stepPhysics(DT);
  const u = pointerVoltage();
  assert.ok(u < 0 && u === coilVoltage());
  state.plugs = { red: 'minus', black: 'plus' };
  assert.equal(connection('plus', 'minus'), -1);
  near(pointerVoltage(), -u, 1e-12);
  endDrag('magnet');
});

// Multimeter: Magnet hineinschieben und den ersten Messwert während der Bewegung lesen
function multiWert(setup) {
  start(-20, 8, { meter: 'multi', ...setup });
  startDrag('magnet', -20);
  dragTo('magnet', -5);
  for (let i = 0; i < 6; i++) stepPhysics(DT);
  multimeterRefresh();
  stepPhysics(DT);
  const u = coilVoltage();
  endDrag('magnet');
  return { wert: multimeter.reading, u };
}

test('Multimeter: aus zeigt nichts, nur die passenden Buchsen messen, Vorzeichen nach Polung', () => {
  assert.equal(multiWert({ multiMode: 'off', plugs: { red: 'v', black: 'com' } }).wert, null);
  const v = multiWert({ multiMode: 'vdc', plugs: { red: 'v', black: 'com' } });
  assert.ok(v.wert < 0, `V⎓ ${v.wert}`);
  near(multiWert({ multiMode: 'vdc', plugs: { red: 'com', black: 'v' } }).wert, -v.wert, 1e-9, 'vertauscht');
  assert.equal(multiWert({ multiMode: 'vdc', plugs: { red: 'ma', black: 'com' } }).wert, 0, 'V⎓, rot in mA');
  assert.equal(multiWert({ multiMode: 'ma', plugs: { red: 'v', black: 'com' } }).wert, 0, 'mA, rot in V');
  const ma = multiWert({ multiMode: 'ma', plugs: { red: 'ma', black: 'com' } });
  near(ma.wert, v.wert / (6 + MULTIMETER.SHUNT_MA) * 1000, 1e-6, 'Strom durch Spule und Messgerät in mA');
  assert.ok(multiWert({ multiMode: 'vac', plugs: { red: 'v', black: 'com' } }).wert > 0, 'V~ ohne Vorzeichen');
});

test('Multimeter zeigt nur alle INTERVAL Sekunden einen neuen Wert', () => {
  start(-20, 8, { meter: 'multi', multiMode: 'vdc', plugs: { red: 'v', black: 'com' } });
  stepPhysics(MULTIMETER.INTERVAL * 1.5);   // erster Messwert ist genommen
  const vorher = multimeter.reading;
  startDrag('magnet', -20);
  dragTo('magnet', -10);
  stepPhysics(MULTIMETER.INTERVAL * 0.3);   // Bewegung, aber noch kein neuer Messwert fällig
  assert.notEqual(coilVoltage(), 0);
  assert.equal(multimeter.reading, vorher);
  endDrag('magnet');
});

// ---------------- Leiterschleife (Windungszahl 1)

test('Leiterschleife: Fluss wie im Polmodell für eine Windung; Spannung um 0,5 mV (Spule 600 Windungen: einige 0,1 V)', () => {
  const R = COIL.R_WIND, half = MAGNET.LENGTH / 2, p = 0.3 * (MAGNET.WIDTH / 100) ** 2;
  const pol = (q, d) => (d === 0 ? 0 : q / 2 * Math.sign(d) * (1 - Math.abs(d) / Math.hypot(d, R)));
  for (const x of [-20, -6, 0, 5, 8]) {
    const d = 8 - x;
    const erwartet = pol(p, d - half) + pol(-p, d + half) + (Math.abs(d) < half ? p : 0);
    near(fluxPerTurn(magnet(x), coil(8, 0, { loop: true })), erwartet, 2e-3 * p, `Magnet bei ${x}`);
  }
  start(-20, 8, { turns: 1 });
  const schleife = ziehe('magnet', 8, 20);
  start(-20, 8, { turns: 600 });
  const spule = ziehe('magnet', 8, 20);
  assert.ok(schleife.min < -1e-4 && schleife.min > -1e-3, `Leiterschleife ${schleife.min} V`);
  // eine Windung an einer Stelle: schärferer Ausschlag als der Mittelwert über die 9 cm lange Spule
  const verhaeltnis = schleife.min * 600 / spule.min;
  assert.ok(verhaeltnis > 1 && verhaeltnis < 4, `Verhältnis ${verhaeltnis}`);
});

test('Leiterschleife: Magnet geht gerade hindurch, quer gedreht stößt er an', () => {
  const loop = { loop: true };
  assert.equal(collides(magnet(8), coil(8, 0, loop)), false);
  assert.equal(collides(magnet(8, { angle: Math.PI / 2 }), coil(8, 0, loop)), true);
  assert.equal(collides(magnet(8, { y: 3.5 }), coil(8, 0, loop)), true, 'an den Zuleitungen');
  assert.equal(collides(magnet(8, { y: -6 }), coil(8, 0, loop)), false, 'darunter vorbei');
  start(-20, 8, { turns: 1 });
  ziehe('magnet', 8, 20);
  assert.ok(bodies.magnet.x > 7, `durch den Ring geschoben bis x = ${bodies.magnet.x}`);
});

// ---------------- nach oben und unten

test('Nach oben und unten nur mit freeMove; nahe der Achse rastet y auf 0 ein', () => {
  start(-20, 8);
  startDrag('magnet', -20, 0);
  dragTo('magnet', -20, 5);
  for (let i = 0; i < 30; i++) stepPhysics(DT);
  near(bodies.magnet.y, 0, 1e-12, 'ohne freeMove');
  endDrag('magnet');
  state.freeMove = true;
  startDrag('magnet', -20, 0);
  dragTo('magnet', -20, 5);
  for (let i = 0; i < 30; i++) stepPhysics(DT);
  near(bodies.magnet.y, 5, 0.01, 'mit freeMove');
  dragTo('magnet', -20, 0.3);
  for (let i = 0; i < 30; i++) stepPhysics(DT);
  assert.equal(bodies.magnet.yTarget, 0, 'eingerastet');
  endDrag('magnet');
});

test('Magnet quer an der Spule vorbei nach oben bewegen erzeugt eine Spannung, gleich weit oben und unten gleich', () => {
  near(fluxPerTurn(magnet(-6, { y: 3 }), coil(8)), fluxPerTurn(magnet(-6, { y: -3 }), coil(8)), 1e-12, 'symmetrisch');
  start(-3, 8, { freeMove: true });
  startDrag('magnet', -3, 0);
  let max = 0;
  for (let i = 0; i < 60; i++) {
    dragTo('magnet', -3, 8 * i / 60);
    stepPhysics(DT);
    max = Math.max(max, Math.abs(coilVoltage()));
  }
  endDrag('magnet');
  assert.ok(max > 0.005, `${max}`);
});

test('Schräg von oben gegen die Spule: der Magnet gleitet oben entlang, statt stehen zu bleiben', () => {
  start(0, 8, { freeMove: true });
  Object.assign(bodies.magnet, { y: 6, yTarget: 6 });
  startDrag('magnet', 0, 6);
  for (let i = 0; i <= 120; i++) {
    dragTo('magnet', 15 * i / 120, 6 - 4 * i / 120);   // nach rechts und nach unten, in die Spule hinein
    stepPhysics(DT);
  }
  for (let i = 0; i < 30; i++) stepPhysics(DT);
  endDrag('magnet');
  assert.equal(collides(bodies.magnet, bodies.coil), false);
  assert.ok(bodies.magnet.x > 14 && bodies.magnet.y > 4, `bis x = ${bodies.magnet.x}, y = ${bodies.magnet.y}`);
});

// ---------------- Feldlinienmodell

test('Feldlinienmodell: Magnet mittendrin – alle gezeigten Linien gehen durch die Spule, weit weg keine', () => {
  const spule = { x: 8, y: 0, angle: 0, loop: false };
  for (const staerke of Object.keys(STRENGTHS)) {
    near(linienInSpule({ x: 8, y: 0, angle: 0, north: 1 }, spule, staerke), 2 * STRENGTHS[staerke].lines.length, 1e-9, staerke);
  }
  near(linienInSpule({ x: 8, y: 0, angle: 0, north: -1 }, spule, 'medium'), -12, 1e-9, 'umgedreht: gegen die Achse');
  assert.equal(linienInSpule({ x: -25, y: 0, angle: 0, north: 1 }, spule, 'medium'), 0);
});

test('Feldlinienmodell: ändert sich stetig (Linien werden an den Spulenrändern abgeschnitten)', () => {
  const spule = { x: 8, y: 0, angle: 0, loop: false };
  let vorher = linienInSpule({ x: -14, y: 0, angle: 0, north: 1 }, spule, 'medium'), groesster = 0;
  for (let x = -14; x <= 8; x += 0.01) {
    const jetzt = linienInSpule({ x, y: 0, angle: 0, north: 1 }, spule, 'medium');
    groesster = Math.max(groesster, Math.abs(jetzt - vorher));
    vorher = jetzt;
  }
  assert.ok(groesster < 0.05, `größter Sprung ${groesster} Linien je 0,1 mm`);
});

test('Feldlinienmodell: weit weg bewegt – keine Spannung (im echten Feld eine kleine)', () => {
  start(-28, 8);
  const echt = ziehe('magnet', -16, 20);
  start(-28, 8, { lineModel: true });
  const linien = ziehe('magnet', -16, 20);
  assert.ok(echt.min < -1e-4, `echt ${echt.min}`);
  assert.equal(linien.min, 0);
  assert.equal(linien.max, 0);
});

test('Feldlinienmodell: hineinschieben gibt Spannung wie im echten Modell, in Ruhe keine', () => {
  start(-20, 8);
  const echt = ziehe('magnet', 8, 20);
  start(-20, 8, { lineModel: true });
  const linien = ziehe('magnet', 8, 20);
  assert.ok(linien.min < 0.3 * echt.min && linien.max < 1e-3, `Feldlinien ${linien.min} … ${linien.max}, echt ${echt.min}`);
  for (let i = 0; i < 60; i++) stepPhysics(DT);
  near(coilVoltage(), 0, 1e-12, 'in Ruhe');
});

test('Feldlinienmodell ein- und ausschalten gibt keinen Spannungsstoß', () => {
  start(0, 8);
  state.lineModel = true;
  fluxChanged();
  stepPhysics(DT);
  near(coilVoltage(), 0, 1e-12);
});

// ---------------- Zeigermessgerät ohne Skala

// Magnet mit 20 cm/s in Spule bzw. Leiterschleife schieben; größter Zeigerausschlag (Ziel, ohne Trägheit)
function qualAusschlag(setup) {
  start(-20, 8, { meter: 'qual', plugs: { red: 'plus', black: 'minus' }, ...setup });
  startDrag('magnet', -20);
  let max = 0;
  for (let t = 0; t <= 1.4; t += DT) {
    dragTo('magnet', -20 + 20 * t);
    stepPhysics(DT);
    max = Math.max(max, Math.abs(needleTarget()));
  }
  endDrag('magnet');
  return max;
}

test('Zeiger ohne Skala: Leiterschleife sichtbar, Spule deutlich, mehr Windungen mehr – nie über den Anschlag', () => {
  const schleife = qualAusschlag({ turns: 1 }), spule = qualAusschlag({ turns: 600 }), viele = qualAusschlag({ turns: 1200 });
  assert.ok(schleife > 0.15 && schleife < 0.45, `Leiterschleife ${schleife}`);
  assert.ok(spule > 0.6 && spule < 1, `Spule ${spule}`);
  assert.ok(viele > spule && viele <= 1, `1200 Windungen ${viele}`);
});

test('Zeiger ohne Skala: nur angeschlossen, vertauscht in die andere Richtung', () => {
  start(-20, 8, { meter: 'qual', turns: 1 });
  startDrag('magnet', -20);
  dragTo('magnet', -2);
  for (let i = 0; i < 20; i++) stepPhysics(DT);
  assert.equal(needleTarget(), 0);
  state.plugs = { red: 'plus', black: 'minus' };
  const richtig = needleTarget();
  state.plugs = { red: 'minus', black: 'plus' };
  assert.ok(richtig !== 0);
  near(needleTarget(), -richtig, 1e-12);
  endDrag('magnet');
});
