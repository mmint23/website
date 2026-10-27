// ------------------------------------------------------------------
// Bedienfeld: Antrieb, Magnet, Messbereich, Anzeigen
// ------------------------------------------------------------------
import { METER, SPEED_MAX, WIND_MAX } from './config.js';
import { state } from './state.js';
import { endCrank, setHold, holdTo, rotor, electrons, park } from './physik.js';
import { applyMagnetPoles, setRingsInstant } from './modell.js';
import { updateMeterFace, setMeterVisible } from './messgeraet.js';
import { onCrankGrab } from './ziehen.js';
import { explainView } from './erklaerung.js';
import { resetView as resetModelView, controls, camera, applyViewSettings } from './szene.js';
import { parkView } from './landschaft.js';
import { onEnterModel, onEnterRoom, transitionActive } from './uebergang.js';
import { raumView } from './raum.js';
import { formatNumber } from './hilfen.js';
import { uhrText } from './tageszeit.js';

const $ = id => document.getElementById(id);
const DRIVES = [['driveWindBtn', 'wind'], ['driveSpeedBtn', 'speed'], ['driveCrankBtn', 'crank']];
// Schalter (aria-pressed) und ihr Zustand; Festhalten gibt es rechts und im Erklär-Bedienfeld
const TOGGLES = [['showBBtn', 'showB'], ['showVBtn', 'showV'], ['showFBtn', 'showF'], ['showElectronBtn', 'showElectron'],
  ['showManyBtn', 'showManyElectrons'], ['showRingsBtn', 'showRings'],
  ['pauseBtn', 'paused'], ['explainSlowBtn', 'slowMotion'], ['explainHoldBtn', 'hold'], ['holdBtn', 'hold']];

// Startansicht: im Windpark über die Landschaft, im Erklärmodus nah an der Schleife
const resetView = () => {
  if (state.view === 'park') parkView(camera, controls);
  else if (state.view === 'room') raumView(camera, controls);
  else if (state.explain) explainView(controls);
  else resetModelView();
};

// Windstärke nach Beaufort (Obergrenzen in m/s)
const BEAUFORT = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
const beaufort = v => BEAUFORT.findIndex(limit => v < limit + 1e-9);

const TEXTS = {
  park: ['Windpark', 'Der Wind dreht die Rotoren – in der Gondel sitzt der Generator.',
    'Ziehen: Ansicht drehen · Mausrad/zwei Finger: zoomen · Rechte Maustaste: verschieben'],
  room: ['Im Haus', 'Woher kommt die elektrische Energie für die Lampe?',
    'Ziehen: umschauen · Mausrad/zwei Finger: näher heran'],
  model: ['Generator: Leiterschleife im Magnetfeld', 'Dreht sich die Leiterschleife im Magnetfeld, entsteht eine Wechselspannung.',
    'Kurbel ziehen: drehen · daneben ziehen: Ansicht drehen · Mausrad/zwei Finger: zoomen'],
};

function updateUi() {
  const inPark = state.view === 'park', inRoom = state.view === 'room';
  [$('title').textContent, $('subtitle').textContent, $('hintText').textContent] = TEXTS[state.view];
  $('parkPanel').hidden = !inPark;
  $('roomPanel').hidden = !inRoom;
  $('modelPanel').hidden = state.view !== 'model';
  $('windOut').textContent = `${formatNumber(state.wind, 1).replace(',0', '')} m/s`;
  $('beaufortStatus').textContent = `Windstärke ${beaufort(state.wind)} (Beaufort)`;
  $('timeOut').textContent = uhrText(state.time);
  $('explainBtn').textContent = state.explain ? 'Zurück zum Modell' : 'Erklärung: Elektronen in der Schleife';
  $('explainBtn').classList.toggle('active', state.explain);
  $('explainPanel').hidden = !state.explain || state.view !== 'model';
  $('meterSection').hidden = state.explain;
  for (const [id, key] of TOGGLES) $(id).setAttribute('aria-pressed', String(state[key]));
  $('pauseBtn').textContent = state.paused ? 'Weiter' : 'Pause';
  $('holdBox').hidden = !state.hold;
  for (const [id, drive] of DRIVES) {
    $(id).classList.toggle('active', state.drive === drive);
    $(id).setAttribute('aria-pressed', String(state.drive === drive));
  }
  $('speedBox').hidden = state.drive !== 'speed' || state.hold;
  $('windBox').hidden = state.drive !== 'wind' || state.hold;
  $('modelWindOut').textContent = $('windOut').textContent;
  $('modelWindSlider').value = state.wind;
  $('crankInfo').hidden = state.drive !== 'crank' || state.hold;
  $('speedOut').textContent = (state.speed < 0 ? '−' : '') + formatNumber(Math.abs(state.speed), 1) + ' U/s';
  $('magnetStatus').textContent = state.northUp ? 'Nordpol (rot) oben, Südpol (grün) unten' : 'Südpol (grün) oben, Nordpol (rot) unten';
  for (const button of $('rangeButtons').children) {
    const active = Number(button.dataset.range) === state.range;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('plotCheck').checked = state.showPlot;
  $('slowCheck').checked = state.slowMotion;
  updateMeterFace();
}

// Ansicht wechseln: Windpark ↔ Generator-Modell (eigene Szenen, Kamera stellt sich passend ein)
function setView(view) {
  endCrank();
  state.view = view;
  applyViewSettings(view);
  resetView();
  updateUi();
}

// Drehzahl der Windräder (jedes Bild; im Windpark und beim Antrieb „Wind“ im Modell)
export function updateParkStatus() {
  const text = park.rpm < 0.05 ? 'Der Rotor steht – zu wenig Wind (unter 3 m/s).'
    : `Rotor: ${formatNumber(park.rpm, 1)} Umdrehungen pro Minute`;
  if (state.view === 'park') $('rotorStatus').textContent = text;
  else if (state.drive === 'wind') $('modelRotorStatus').textContent = text;
}

// Erklärmodus ein/aus: Messgerät und Kabel weg, dicke durchsichtige Schleife, Größen zu Beginn aus,
// Kamera näher an die Schleife
function setExplain(on) {
  endCrank();
  state.explain = on;
  state.paused = false;
  if (on) Object.assign(state, { showB: false, showV: false, showF: false, showElectron: false, showManyElectrons: false, showRings: false });
  setRingsInstant();
  electrons.shift = 0;
  setMeterVisible(!on);
  resetView();
  updateUi();
}

// Regler „Drehwinkel“ folgt der Schleife, solange man ihn nicht selbst bedient (Anzeige 0° … 360°)
let holdSliderActive = false;
export function updateHoldSlider() {
  if (!state.hold) return;
  const deg = ((rotor.phi * 180 / Math.PI) % 360 + 360) % 360;
  if (!holdSliderActive) $('holdSlider').value = deg.toFixed(0);
  $('holdOut').textContent = Math.round(deg) % 360 + '°';
}

export function initUi() {
  for (const range of METER.RANGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.range = range;
    button.textContent = `±${range} mV`;
    button.addEventListener('click', () => { state.range = range; updateUi(); });
    $('rangeButtons').append(button);
  }
  const speed = $('speedSlider');
  Object.assign(speed, { min: -SPEED_MAX, max: SPEED_MAX, step: 0.1, value: state.speed });
  speed.addEventListener('input', () => { state.speed = Number(speed.value); updateUi(); });

  for (const [id, drive] of DRIVES) {
    $(id).addEventListener('click', () => {
      endCrank();
      state.drive = drive;
      updateUi();
    });
  }
  $('stopBtn').addEventListener('click', () => {   // Drehzahl-Regler auf 0
    state.speed = 0;
    speed.value = 0;
    updateUi();
  });
  $('flipBtn').addEventListener('click', () => {
    state.northUp = !state.northUp;
    applyMagnetPoles();
    updateUi();
  });
  $('plotCheck').addEventListener('change', e => { state.showPlot = e.target.checked; });
  $('explainBtn').addEventListener('click', () => setExplain(!state.explain));
  $('toModelBtn').addEventListener('click', () => { if (!transitionActive()) setView('model'); });
  $('toParkBtn').addEventListener('click', () => setView('park'));
  const wind = $('windSlider');
  Object.assign(wind, { min: 0, max: WIND_MAX, step: 0.5, value: state.wind });
  wind.addEventListener('input', () => { state.wind = Number(wind.value); updateUi(); });
  const time = $('timeSlider');
  time.value = state.time;
  time.addEventListener('input', () => { state.time = Number(time.value); updateUi(); });
  const modelWind = $('modelWindSlider');
  Object.assign(modelWind, { min: 0, max: WIND_MAX, step: 0.5, value: state.wind });
  modelWind.addEventListener('input', () => { state.wind = Number(modelWind.value); wind.value = state.wind; updateUi(); });
  // Haus im Dorf: hinein (nach der Kamerafahrt) und wieder hinaus bzw. weiter zum Generator-Modell
  onEnterRoom(() => setView('room'));
  $('roomToParkBtn').addEventListener('click', () => setView('park'));
  $('roomToModelBtn').addEventListener('click', () => {
    state.drive = 'wind';
    if (state.hold) setHold(false);
    setView('model');
  });
  // Nach der Kamerafahrt ins Windrad: Modell mit Antrieb „Wind“
  onEnterModel(() => {
    state.drive = 'wind';
    if (state.hold) setHold(false);
    setView('model');
  });
  for (const [id, key] of TOGGLES) {
    $(id).addEventListener('click', () => {
      if (key === 'hold') setHold(!state.hold);
      else {
        if (key === 'paused') endCrank();
        state[key] = !state[key];
      }
      updateUi();
    });
  }
  const holdSlider = $('holdSlider');
  holdSlider.addEventListener('input', () => holdTo(Number(holdSlider.value) * Math.PI / 180));
  holdSlider.addEventListener('pointerdown', () => { holdSliderActive = true; });
  holdSlider.addEventListener('focus', () => { holdSliderActive = true; });
  holdSlider.addEventListener('blur', () => { holdSliderActive = false; });
  window.addEventListener('pointerup', () => { if (document.activeElement !== holdSlider) holdSliderActive = false; });
  $('slowCheck').addEventListener('change', e => { state.slowMotion = e.target.checked; updateUi(); });
  $('resetView').addEventListener('click', resetView);
  onCrankGrab(updateUi);

  applyMagnetPoles();
  applyViewSettings(state.view);
  resetView();
  updateUi();
}
