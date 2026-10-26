// ------------------------------------------------------------------
// Bedienfeld: Knöpfe, Regler und Anzeigen
// ------------------------------------------------------------------
import { state, currentSetup } from './state.js';
import { barMotion, stopwatch, fieldStrength, lorentzForceMagnitude, resetMotion } from './physik.js';
import { buildApparatus, syncApparatus, applyMagnetPoles, setMagnetOpacity } from './aufbau.js';
import { updateSupply, buildCables } from './netzgeraet.js';
import { resetView } from './szene.js';
import { formatNumber, formatAmpere } from './hilfen.js';

const $ = id => document.getElementById(id);
const ui = {
  subtitle: $('subtitle'),
  resetView: $('resetView'),
  modeBasicBtn: $('modeBasicBtn'),
  modeAngleBtn: $('modeAngleBtn'),
  powerBtn: $('powerBtn'),
  currentSlider: $('currentSlider'),
  currentOut: $('currentOut'),
  polarityBtn: $('polarityBtn'),
  polarityStatus: $('polarityStatus'),
  flipBtn: $('flipBtn'),
  magnetStatus: $('magnetStatus'),
  fieldSlider: $('fieldSlider'),
  fieldOut: $('fieldOut'),
  angleControls: $('angleControls'),
  angleSlider: $('angleSlider'),
  angleOut: $('angleOut'),
  resetBarBtn: $('resetBarBtn'),
  frictionCheck: $('frictionCheck'),
  handBtn: $('handBtn'),
  handInfo: $('handInfo'),
  solutionBtn: $('solutionBtn'),
  handStatus: $('handStatus'),
  lukasBtn: $('lukasBtn'),
  lukasInfo: $('lukasInfo'),
  readoutBtn: $('readoutBtn'),
  readoutTable: $('readoutTable'),
  forceOut: $('forceOut'),
  speedOut: $('speedOut'),
  timeOut: $('timeOut'),
};

// Magnet umdrehen: ausblenden, Pole tauschen, wieder einblenden
const FLIP_DURATION = 0.8;
const flip = { active: false, t: 0, swapped: false };

export function updateUi() {
  const setup = currentSetup();
  ui.subtitle.textContent = setup.title;
  ui.modeBasicBtn.classList.toggle('active', state.mode === 'basic');
  ui.modeAngleBtn.classList.toggle('active', state.mode === 'angle');
  ui.modeBasicBtn.setAttribute('aria-pressed', state.mode === 'basic');
  ui.modeAngleBtn.setAttribute('aria-pressed', state.mode === 'angle');
  ui.angleControls.hidden = !setup.rotatable;
  ui.powerBtn.textContent = state.powerOn ? 'Strom ausschalten' : 'Strom einschalten';
  ui.powerBtn.classList.toggle('on', state.powerOn);
  ui.currentOut.textContent = formatAmpere(state.current);
  ui.polarityStatus.textContent = state.polarity > 0
    ? 'Plus (rot) an vorderer Schiene, Minus (blau) an hinterer Schiene'
    : 'Plus (rot) an hinterer Schiene, Minus (blau) an vorderer Schiene';
  ui.magnetStatus.textContent = (state.northUp
    ? 'Nordpol (rot) oben, Südpol (grün) unten'
    : 'Südpol (grün) oben, Nordpol (rot) unten') + (setup.rotatable && state.angle > 90 ? ' – bei α = 90°' : '');
  ui.flipBtn.disabled = flip.active;
  ui.fieldOut.textContent = formatNumber(fieldStrength() * 1000, 0) + ' mT';
  ui.angleOut.textContent = state.angle + '°';
  ui.handStatus.textContent = !setup.rotatable ? 'Die Lösungshand links neben dem Aufbau passt sich an Polung und Magnet an.'
    : state.angle === 180 ? 'α = 180°: Feld parallel zur Stange – es wirkt keine Kraft, die Lösungshand wird ausgeblendet.'
    : 'Lösungshand: Der Zeigefinger zeigt in Richtung des Feldanteils senkrecht zur Stange.';
}

// Messwerte (nur sichtbar, wenn eingeblendet)
export function updateReadout() {
  if (ui.readoutTable.hidden) return;
  ui.forceOut.textContent = formatNumber(lorentzForceMagnitude() * 1000, 1) + ' mN';
  ui.speedOut.textContent = formatNumber(Math.abs(barMotion.v) * 100, 1) + ' cm/s';
  ui.timeOut.textContent = stopwatch.state === 'idle' ? '–'
    : formatNumber(stopwatch.t, 2) + ' s' + (stopwatch.state === 'running' ? ' …' : '');
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

// Versuch wechseln: Aufbau neu erzeugen, Stange und Winkel zurücksetzen
function setMode(mode) {
  if (mode === state.mode) return;
  if (flip.active) {   // laufendes Umdrehen sofort abschließen
    if (!flip.swapped) state.northUp = !state.northUp;
    flip.active = false;
  }
  state.mode = mode;
  state.angle = state.magnetAngle = 90;
  ui.angleSlider.value = 90;
  resetMotion();
  buildApparatus();
  setMagnetOpacity(1);
  buildCables();
  resetView();
  updateUi();
}

// Startwerte aus den Bedienelementen übernehmen und Ereignisse verbinden
export function initUi() {
  state.current = Number(ui.currentSlider.value);
  state.fieldScale = Number(ui.fieldSlider.value);
  state.angle = state.magnetAngle = Number(ui.angleSlider.value);
  state.friction = ui.frictionCheck.checked;

  ui.resetView.addEventListener('click', resetView);
  ui.modeBasicBtn.addEventListener('click', () => setMode('basic'));
  ui.modeAngleBtn.addEventListener('click', () => setMode('angle'));
  ui.powerBtn.addEventListener('click', () => {
    state.powerOn = !state.powerOn;
    updateSupply();
    updateUi();
  });
  ui.currentSlider.addEventListener('input', () => {
    state.current = Number(ui.currentSlider.value);
    updateSupply();
    updateUi();
  });
  ui.polarityBtn.addEventListener('click', () => {
    state.polarity = -state.polarity;
    buildCables();
    updateUi();
  });
  ui.flipBtn.addEventListener('click', () => {
    if (flip.active) return;
    Object.assign(flip, { active: true, t: 0, swapped: false });
    updateUi();
  });
  ui.fieldSlider.addEventListener('input', () => {
    state.fieldScale = Number(ui.fieldSlider.value);
    updateUi();
  });
  ui.angleSlider.addEventListener('input', () => {
    state.angle = Number(ui.angleSlider.value);
    updateUi();
  });
  ui.resetBarBtn.addEventListener('click', () => {
    resetMotion();
    syncApparatus();
  });
  ui.frictionCheck.addEventListener('change', () => {
    state.friction = ui.frictionCheck.checked;
  });
  ui.lukasBtn.addEventListener('click', () => {
    state.showLukas = !state.showLukas;
    ui.lukasInfo.hidden = !state.showLukas;
    ui.lukasBtn.textContent = state.showLukas ? 'Kraftmesser ausblenden' : 'Kraftmesser anzeigen';
    ui.lukasBtn.setAttribute('aria-expanded', state.showLukas);
    syncApparatus();
  });
  ui.handBtn.addEventListener('click', () => {
    state.showHand = !state.showHand;
    ui.handInfo.hidden = !state.showHand;
    ui.handBtn.textContent = state.showHand ? 'Hand ausblenden' : 'Hand anzeigen';
    ui.handBtn.setAttribute('aria-expanded', state.showHand);
  });
  ui.solutionBtn.addEventListener('click', () => {
    state.showSolution = !state.showSolution;
    ui.handStatus.hidden = !state.showSolution;
    ui.solutionBtn.textContent = state.showSolution ? 'Lösung ausblenden' : 'Lösung anzeigen';
    ui.solutionBtn.setAttribute('aria-expanded', state.showSolution);
  });
  ui.readoutBtn.addEventListener('click', () => {
    const show = ui.readoutTable.hidden;
    ui.readoutTable.hidden = !show;
    ui.readoutBtn.textContent = show ? 'Messwerte ausblenden' : 'Messwerte anzeigen';
    ui.readoutBtn.setAttribute('aria-expanded', show);
  });

  updateUi();
}
