// ------------------------------------------------------------------
// Bedienfeld: Knöpfe, Regler und Anzeigen
// ------------------------------------------------------------------
import { METER, SWING } from './config.js';
import { state } from './state.js';
import { pushSwing, stopSwing, meterReading, resetPhysics, resetMagnet, resetElectron, setHold, holdTo, swing } from './physik.js';
import { applyMagnetPoles, setMagnetOpacity, applySetup, syncApparatus, syncFieldLines } from './aufbau.js';
import { updateMeterFace, buildCables, turnMeterTowards, applyDisplay } from './messgeraet.js';
import { explainView } from './erklaerung.js';
import { cancelDrag } from './ziehen.js';
import { resetView as resetSetupView, camera, controls, table } from './szene.js';
import { formatNumber } from './hilfen.js';

const $ = id => document.getElementById(id);
const DISPLAYS = [['displayMeterBtn', 'meter'], ['displayLedBtn', 'led'], ['displayLampBtn', 'lamp']];
const EXPLAIN_TOGGLES = [['explainSlowBtn', 'slowMotion'], ['pauseBtn', 'paused'], ['holdBtn', 'hold'],
  ['showElectronBtn', 'showElectron'], ['showVBtn', 'showV'], ['showBBtn', 'showB'], ['showFBtn', 'showF'], ['showHandBtn', 'showExplainHand']];

// Startansicht: im Erklärmodus nah am Stab, sonst die Ansicht des Versuchs
const resetView = () => (state.explain ? explainView(controls) : resetSetupView());
const unit = () => (state.meterMode === 'U' ? 'mV' : 'mA');

// Magnet umdrehen: ausblenden, Pole tauschen, wieder einblenden
const FLIP_DURATION = 0.8;
const flip = state.flip;

function updateUi() {
  const rotatable = state.setup === 'drehbar';
  $('explainBtn').textContent = state.explain ? 'Zurück zum Versuch' : 'Erklärung: Elektron im Leiter';
  $('explainBtn').classList.toggle('active', state.explain);
  $('explainBtn').setAttribute('aria-pressed', String(state.explain));
  $('explainPanel').hidden = !state.explain;
  $('explainHandInfo').hidden = !state.showExplainHand;
  $('pauseInfo').hidden = !state.paused;
  $('pauseBtn').textContent = $('runPauseBtn').textContent = state.paused ? 'Weiter' : 'Pause';
  $('runPauseBtn').setAttribute('aria-pressed', String(state.paused));
  $('holdBtn').textContent = state.hold ? 'Leiter loslassen' : 'Leiter festhalten';
  $('holdBox').hidden = !state.hold;
  $('manyBtn').setAttribute('aria-pressed', String(state.manyElectrons));
  $('manyLegend').hidden = $('manyInfo').hidden = !state.manyElectrons;
  for (const [id, key] of EXPLAIN_TOGGLES) $(id).setAttribute('aria-pressed', String(state[key]));
  syncFieldLines();
  $('meterSection').hidden = state.explain;
  for (const [id, display] of DISPLAYS) {
    $(id).classList.toggle('active', state.display === display);
    $(id).setAttribute('aria-pressed', String(state.display === display));
  }
  $('meterControls').hidden = state.display !== 'meter';
  $('slowCheck').checked = state.slowMotion;
  for (const [id, setup] of [['setupDrehbarBtn', 'drehbar'], ['setupTischBtn', 'tisch']]) {
    $(id).classList.toggle('active', state.setup === setup);
    $(id).setAttribute('aria-pressed', String(state.setup === setup));
  }
  $('angleControls').hidden = !rotatable;
  $('tableControls').hidden = rotatable;
  $('magnetStatus').textContent = (state.northUp
    ? 'Nordpol (rot) oben, Südpol (grün) unten'
    : 'Südpol (grün) oben, Nordpol (rot) unten') + (rotatable ? ' – bei α = 0°' : '');
  $('flipBtn').disabled = $('explainFlipBtn').disabled = flip.active;
  const device = state.display === 'led' ? ['Anode (+)', 'Kathode (−)'] : ['Plus-Buchse', 'Minus-Buchse'];
  const [redTo, blackTo] = state.cablesSwapped ? [device[1], device[0]] : device;
  $('cableStatus').textContent = state.display === 'lamp'
    ? 'Bei der Glühlampe spielt die Richtung keine Rolle.'
    : `Rotes Kabel (rechtes Stabende) an ${redTo}, schwarzes an ${blackTo}`;
  $('angleOut').textContent = state.angle + '°';
  for (const [id, mode] of [['modeUBtn', 'U'], ['modeIBtn', 'I']]) {
    $(id).classList.toggle('active', state.meterMode === mode);
    $(id).setAttribute('aria-pressed', String(state.meterMode === mode));
  }
  $('modeStatus').textContent = state.meterMode === 'U'
    ? 'Spannungsmessung: Das Messgerät ist hochohmig, es fließt praktisch kein Strom.'
    : 'Strommessung: Der Stromkreis ist über das Messgerät geschlossen (R ≈ 1 Ω). '
      + 'Der Induktionsstrom bremst die Schaukel – bei diesem Aufbau aber kaum merklich.';
  $('brakeBox').hidden = state.meterMode !== 'I';
  for (const button of $('rangeButtons').children) {
    const active = Number(button.dataset.range) === state.range;
    button.textContent = `±${button.dataset.range} ${unit()}`;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('valueOut').hidden = !state.showValue;
  $('longStatus').hidden = !state.longMagnet;
  updateMeterFace();
}

// Regler „Lage des Leiters“: zeigt das Ziel; die Anzeige daneben den aktuellen Winkel (vorne +, hinten −).
// Beim Ziehen des Leiters folgt der Regler dem Finger, solange man ihn nicht selbst bedient.
let holdSliderActive = false;
export function updateHoldSlider() {
  if (!state.hold) return;
  if (!holdSliderActive) $('holdSlider').value = (swing.holdTarget * 180 / Math.PI).toFixed(1);
  const deg = swing.theta * 180 / Math.PI;
  $('holdOut').textContent = (deg < -0.05 ? '−' : '') + formatNumber(Math.abs(deg), 1) + '°';
}


// Messwert als Zahl (nur sichtbar, wenn eingeschaltet)
export function updateValue() {
  if (!state.showValue) return;
  const value = meterReading();
  $('valueOut').textContent = (value < 0 ? '−' : '') + formatNumber(Math.abs(value), 2) + ' ' + unit();
}

export function animateFlip(dt) {
  if (!flip.active) return;
  flip.t = Math.min(flip.t + dt / FLIP_DURATION, 1);
  if (flip.t >= 0.5 && !flip.swapped) {
    state.northUp = !state.northUp;
    applyMagnetPoles();
    flip.swapped = true;
    updateUi();
  }
  setMagnetOpacity(Math.abs(1 - 2 * flip.t));
  if (flip.t >= 1) {
    flip.active = false;
    setMagnetOpacity(1);
    updateUi();
  }
}

// Laufendes Umdrehen des Magneten sofort abschließen
function finishFlip() {
  if (!flip.active) return;
  if (!flip.swapped) state.northUp = !state.northUp;
  flip.active = false;
  applyMagnetPoles();
  setMagnetOpacity(1);
}

// Erklärmodus ein/aus: Stative, Messgerät, Kabel und Tisch weg, Stab durchsichtig mit Elektron in der Mitte,
// Zeitlupe an, Kamera nah an den Stab
function setExplain(on) {
  cancelDrag();
  state.explain = on;
  state.paused = false;
  // zu Beginn: Elektron an, Pfeile, Feldlinien und Hand aus
  if (on) Object.assign(state, { showElectron: true, showV: false, showB: false, showF: false, showExplainHand: false });
  setHold(false);
  if (on) state.slowMotion = true;
  stopSwing();
  resetElectron();
  applyDisplay();
  table.visible = !on;
  applySetup();
  buildCables();
  resetView();
  updateUi();
}

// Kurzen oder langen Magneten einsetzen: Schaukel in Ruhe, Magnet in Grundlage; beim drehbaren Magneten
// ändert sich die Höhe der Drehachse, deshalb Querstange, Kabel und Ansicht neu
function setLongMagnet(long) {
  cancelDrag();
  finishFlip();
  state.longMagnet = long;
  resetPhysics();
  applySetup();
  buildCables();
  if (state.setup === 'drehbar') resetView();
  updateUi();
}

// Versuch wechseln: Magnet in Grundstellung, Schaukel in Ruhe, Querstange und Kabel neu, Startansicht
function setSetup(setup) {
  if (setup === state.setup) return;
  cancelDrag();
  finishFlip();
  state.setup = setup;
  state.angle = state.magnetAngle = 0;
  $('angleSlider').value = 0;
  resetPhysics();
  applySetup();
  buildCables();
  resetView();
  updateUi();
}

export function initUi() {
  for (const range of METER.RANGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.range = range;
    button.addEventListener('click', () => { state.range = range; updateUi(); });
    $('rangeButtons').append(button);
  }
  $('slowCheck').checked = state.slowMotion;
  $('brakeCheck').checked = state.brakeBoost;
  $('valueCheck').checked = state.showValue;
  $('longCheck').checked = state.longMagnet;
  $('angleSlider').value = state.angle;

  $('resetView').addEventListener('click', resetView);
  $('setupDrehbarBtn').addEventListener('click', () => setSetup('drehbar'));
  $('setupTischBtn').addEventListener('click', () => setSetup('tisch'));
  $('resetMagnetBtn').addEventListener('click', () => {
    cancelDrag();
    resetMagnet();
    stopSwing();
    syncApparatus();
  });
  $('pushBtn').addEventListener('click', () => {   // „loslassen“: Festhalten und Pause enden
    if (state.hold) setHold(false);
    state.paused = false;
    pushSwing();
    updateUi();
  });
  // Zurücksetzen: Schaukel in die Ruhelage, Zeiger auf 0; eine Pause endet
  $('stopBtn').addEventListener('click', () => {
    state.paused = false;
    stopSwing();
    updateUi();
  });
  // Pause im Versuch: friert alles im aktuellen Zustand ein (Schaukel, Magnet, Zeiger, LED, Glühlampe);
  // derselbe Zustand wie „Pause“ im Erklärmodus
  $('runPauseBtn').addEventListener('click', () => {
    cancelDrag();
    state.paused = !state.paused;
    updateUi();
  });
  $('meterTurnBtn').addEventListener('click', () => turnMeterTowards(camera.position));
  $('slowCheck').addEventListener('change', e => { state.slowMotion = e.target.checked; updateUi(); });
  const startFlip = () => {
    if (flip.active) return;
    Object.assign(flip, { active: true, t: 0, swapped: false });
    updateUi();
  };
  $('flipBtn').addEventListener('click', startFlip);
  $('explainFlipBtn').addEventListener('click', startFlip);
  $('swapCablesBtn').addEventListener('click', () => {
    state.cablesSwapped = !state.cablesSwapped;
    buildCables();
    updateUi();
  });
  $('longCheck').addEventListener('change', e => setLongMagnet(e.target.checked));
  $('explainBtn').addEventListener('click', () => setExplain(!state.explain));
  for (const [id, key] of EXPLAIN_TOGGLES) {
    $(id).addEventListener('click', () => {
      if (key === 'paused') cancelDrag();
      if (key === 'hold') setHold(!state.hold); else state[key] = !state[key];
      updateUi();
    });
  }
  const holdSlider = $('holdSlider');
  holdSlider.min = -SWING.MAX_ANGLE;
  holdSlider.max = SWING.MAX_ANGLE;
  holdSlider.addEventListener('input', () => holdTo(Number(holdSlider.value) * Math.PI / 180));
  // Der Leiter folgt dem Regler direkt und kommt beim Loslassen an der Reglerposition zur Ruhe.
  // Solange man den Regler bedient, wird er nicht vom Leiter nachgeführt.
  holdSlider.addEventListener('focus', () => { holdSliderActive = true; });
  holdSlider.addEventListener('blur', () => { holdSliderActive = false; });
  holdSlider.addEventListener('pointerdown', () => { holdSliderActive = true; });
  $('electronResetBtn').addEventListener('click', resetElectron);
  $('manyBtn').addEventListener('click', () => {   // Elektronen starten gleichmäßig verteilt
    state.manyElectrons = !state.manyElectrons;
    resetElectron();
    updateUi();
  });
  $('angleSlider').addEventListener('input', e => { state.angle = Number(e.target.value); updateUi(); });
  for (const [id, display] of DISPLAYS) {
    $(id).addEventListener('click', () => {
      if (state.display === display) return;
      cancelDrag();
      state.display = display;
      applyDisplay();
      buildCables();
      updateUi();
    });
  }
  $('modeUBtn').addEventListener('click', () => { state.meterMode = 'U'; updateUi(); });
  $('modeIBtn').addEventListener('click', () => { state.meterMode = 'I'; updateUi(); });
  $('brakeCheck').addEventListener('change', e => { state.brakeBoost = e.target.checked; });
  $('valueCheck').addEventListener('change', e => { state.showValue = e.target.checked; updateUi(); });

  applyMagnetPoles();
  applySetup();
  applyDisplay();
  buildCables();
  updateUi();
}
