// ------------------------------------------------------------------
// Bedienfeld: ganz oben reale Physik statt Feldlinienmodell, Feldlinien und ihre Färbung im Spuleninneren, Magnet
// festhalten (mit Drehwinkel-Regler) und Zeitlupe;
// Aufbau (eine oder zwei Spulen), Antrieb, Anzeigen, Messbereich
// ------------------------------------------------------------------
import { METER, SPEED_MAX } from './config.js';
import { state } from './state.js';
import { endCrank, setHold, holdTo, rotor, frequency } from './physik.js';
import { updateMeterFace } from './messgeraet.js';
import { onCrankGrab } from './ziehen.js';
import { fitView, controls } from './szene.js';
import { formatNumber } from './hilfen.js';
import { showLink } from '../../../gemeinsam/link.js';

const $ = id => document.getElementById(id);
const DRIVES = [['driveSpeedBtn', 'speed'], ['driveCrankBtn', 'crank']];
const COILS = [['oneCoilBtn', 1], ['twoCoilsBtn', 2]];
const WIRING = [['wiringOkBtn', false], ['wiringSwapBtn', true]];
const CHECKS = [['fieldCheck', 'showField'], ['insideCheck', 'colorInside'], ['bCheck', 'showB'], ['plotCheck', 'showPlot'], ['slopeCheck', 'showSlope']];

const segment = (id, active) => {
  $(id).classList.toggle('active', active);
  $(id).setAttribute('aria-pressed', String(active));
};

function updateUi() {
  for (const [id, n] of COILS) segment(id, state.coils === n);
  for (const [id, reversed] of WIRING) segment(id, state.reversed === reversed);
  $('wiringBox').hidden = state.coils === 1;
  $('wiringStatus').textContent = state.reversed
    ? 'E von Spule 1 ist mit A von Spule 2 verbunden.'
    : 'E von Spule 1 ist mit E von Spule 2 verbunden.';
  for (const [id, drive] of DRIVES) segment(id, state.drive === drive);
  $('speedBox').hidden = state.drive !== 'speed' || state.hold;
  $('crankInfo').hidden = state.drive !== 'crank' || state.hold;
  $('speedOut').textContent = (state.speed < 0 ? '−' : '') + formatNumber(Math.abs(state.speed), 1) + ' U/s';
  $('holdBtn').setAttribute('aria-pressed', String(state.hold));
  $('slowBtn').setAttribute('aria-pressed', String(state.slowMotion));
  $('holdBox').hidden = !state.hold;
  for (const button of $('rangeButtons').children) segment(button.id, Number(button.dataset.range) === state.range);
  for (const [id, key] of CHECKS) $(id).checked = state[key];
  $('slopeCheck').disabled = !state.showPlot;
  $('insideCheck').disabled = !state.showField;   // färben geht nur bei eingeblendeten Feldlinien
  $('lineModelBtn').setAttribute('aria-pressed', String(!state.lineModel));   // gedrückt: reale Physik
  $('lineModelInfo').hidden = !state.lineModel;
  $('realInfo').hidden = state.lineModel;
  updateMeterFace();
}

// ---------------- Startansicht

// Modell mit Kabeln und Messgerät (Bildebene, cm)
const INHALT = { x: 7.5, y: -0.5, w: 62, h: 50 };
let verschoben = false;   // hat jemand die Ansicht gedreht oder gezoomt? Dann beim Größenwechsel nicht neu einpassen

// Freie Fläche zwischen Überschrift, Bedienfeld, Diagrammen und Hinweis. Neben den Diagrammen (Querformat) oder
// über ihnen (Hochformat) – je nachdem, wo das Modell größer erscheint.
function freieFlaeche() {
  const W = innerWidth, H = innerHeight;
  const rect = el => el.getBoundingClientRect();
  const kopf = rect(document.querySelector('.header')), panel = rect($('panel'));
  const plot = state.showPlot ? rect($('plotBox')) : null;
  const hint = document.querySelector('.hint');
  const top = kopf.bottom + 8;
  const flaeche = (left, right, bottom) => ({ x: left, y: top, w: Math.max(120, right - left), h: Math.max(120, bottom - top) });
  if (W <= 700) return flaeche(16, W - 16, (plot ? plot.top : panel.top) - 8);
  const right = panel.left - 12;
  const unten = hint.offsetParent ? rect(hint).top - 8 : H - 16;
  if (!plot) return flaeche(16, right, unten);
  const groesse = f => Math.min(f.w / INHALT.w, f.h / INHALT.h);
  const daneben = flaeche(plot.right + 12, right, unten), darueber = flaeche(16, right, plot.top - 8);
  return groesse(darueber) > groesse(daneben) ? darueber : daneben;
}

function resetView() {
  verschoben = false;
  fitView(freieFlaeche(), INHALT);
}

// Jedes Bild: Drehwinkel-Regler folgt dem Magneten (solange man ihn nicht selbst bedient), Frequenz
let holdSliderActive = false;
export function updateReadout() {
  const deg = ((rotor.phi * 180 / Math.PI) % 360 + 360) % 360;
  if (state.hold) {
    if (!holdSliderActive) $('holdSlider').value = deg.toFixed(0);
    $('holdOut').textContent = Math.round(deg) % 360 + '°';
  }
  const f = frequency();
  $('freqOut').textContent = f < 0.005 ? '–' : formatNumber(f, 2) + ' Hz';
}

export function initUi() {
  for (const range of METER.RANGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'range' + String(range).replace('.', '_');
    button.dataset.range = range;
    button.textContent = `±${formatNumber(range, range < 1 ? 1 : 0)} V`;
    button.addEventListener('click', () => { state.range = range; updateUi(); });
    $('rangeButtons').append(button);
  }
  for (const [id, n] of COILS) $(id).addEventListener('click', () => { state.coils = n; updateUi(); });
  for (const [id, reversed] of WIRING) $(id).addEventListener('click', () => { state.reversed = reversed; updateUi(); });
  for (const [id, drive] of DRIVES) {
    $(id).addEventListener('click', () => {
      endCrank();
      state.drive = drive;
      updateUi();
    });
  }
  const speed = $('speedSlider');
  Object.assign(speed, { min: -SPEED_MAX, max: SPEED_MAX, step: 0.05, value: state.speed });
  speed.addEventListener('input', () => { state.speed = Number(speed.value); updateUi(); });
  $('stopBtn').addEventListener('click', () => {
    state.speed = 0;
    speed.value = 0;
    updateUi();
  });
  $('holdBtn').addEventListener('click', () => { setHold(!state.hold); updateUi(); });
  $('slowBtn').addEventListener('click', () => { state.slowMotion = !state.slowMotion; updateUi(); });
  const holdSlider = $('holdSlider');
  holdSlider.addEventListener('input', () => holdTo(Number(holdSlider.value) * Math.PI / 180));
  holdSlider.addEventListener('pointerdown', () => { holdSliderActive = true; });
  holdSlider.addEventListener('focus', () => { holdSliderActive = true; });
  holdSlider.addEventListener('blur', () => { holdSliderActive = false; });
  window.addEventListener('pointerup', () => { if (document.activeElement !== holdSlider) holdSliderActive = false; });
  for (const [id, key] of CHECKS) {
    $(id).addEventListener('change', e => {
      state[key] = e.target.checked;
      updateUi();
      if (key === 'showPlot' && !verschoben) resetView();   // mehr bzw. weniger Platz für das Modell
    });
  }
  // Knopf „Reale Physik“: wechselt zwischen Feldlinienmodell (Standard) und cos-Modell. Ob die Feldlinien zu sehen
  // sind, bleibt davon unberührt.
  $('lineModelBtn').addEventListener('click', () => {
    state.lineModel = !state.lineModel;
    updateUi();
  });
  $('resetView').addEventListener('click', resetView);
  $('linkBtn').addEventListener('click', () => showLink());
  // Aus dem Windpark gekommen (?von=windpark): Knopf zurück, mit Wind und Uhrzeit, damit der Windpark wieder so aussieht
  const parameter = new URLSearchParams(location.search);
  if (parameter.get('von') === 'windpark') {
    const zurueck = new URLSearchParams();
    for (const name of ['wind', 'zeit']) if (parameter.has(name)) zurueck.set(name, parameter.get(name));
    $('windparkLink').href = '../generator-windpark/' + (zurueck.size ? '?' + zurueck : '');
    $('windparkLink').hidden = false;
  }
  onCrankGrab(updateUi);
  controls.addEventListener('start', () => { verschoben = true; });
  window.addEventListener('resize', () => { if (!verschoben) resetView(); });

  resetView();
  updateUi();
}
