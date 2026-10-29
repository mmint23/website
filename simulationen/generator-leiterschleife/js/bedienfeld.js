// ------------------------------------------------------------------
// Bedienfeld: Antrieb, Magnet, Messbereich, Anzeigen, Erklärmodus. Aus dem Windpark gekommen (?von=windpark):
// Knopf „Zurück zum Windpark“ (mit Wind und Uhrzeit) und kurz der Hinweis „Vereinfachtes Modell des Generators“.
// Schülermodus (Knopf, bzw. fest mit ?schueler): Erklärmodus ohne die Knöpfe B, v und F_L; „QR-Code für den
// Schülermodus“ zeigt die Adresse dafür (über den Abgabe-Server mit Raumcode, damit Geteiltes bei der Lehrkraft
// ankommt). Ist er an, öffnet auch „Steuerung abgeben“ (Live-Steuerung, live.js) das Schülergerät im Schülermodus.
// ------------------------------------------------------------------
import { METER, SPEED_MAX, WIND_MAX, COIL } from './config.js';
import { state, ausWindpark, modus } from './state.js';
import { endCrank, setHold, holdTo, rotor, electrons, park } from './physik.js';
import { applyMagnetPoles, setRingsInstant } from './modell.js';
import { updateMeterFace, setMeterVisible, setDisplay } from './messgeraet.js';
import { onCrankGrab } from './ziehen.js';
import { explainView, sideView } from './erklaerung.js';
import { resetView as resetModelView, controls, setTable } from './szene.js';
import { formatNumber } from './hilfen.js';
import { showLink } from '../../../gemeinsam/link.js';
import { adresseFuer, raum } from '../../../gemeinsam/verbindung.js';

const $ = id => document.getElementById(id);
const DRIVES = [['driveWindBtn', 'wind'], ['driveSpeedBtn', 'speed'], ['driveCrankBtn', 'crank']];
// Angeschlossen statt der Bürstenkabel ans Messgerät: LED oder Glühlampe (Gedankenexperiment, siehe README)
const DISPLAYS = [['displayMeterBtn', 'meter'], ['displayLedBtn', 'led'], ['displayLampBtn', 'lamp']];
// Schalter (aria-pressed) und ihr Zustand; Festhalten gibt es rechts und im Erklär-Bedienfeld
const TOGGLES = [['showBBtn', 'showB'], ['showVBtn', 'showV'], ['showFBtn', 'showF'], ['showElectronBtn', 'showElectron'], ['showTwoBtn', 'showTwoElectrons'],
  ['showManyBtn', 'showManyElectrons'], ['showRingsBtn', 'showRings'], ['magnetGlassBtn', 'magnetGlass'], ['plotBtn', 'showPlot'], ['explainPlotBtn', 'showPlot'],
  ['pauseBtn', 'paused'], ['explainSlowBtn', 'slowMotion'], ['explainHoldBtn', 'hold'], ['holdBtn', 'hold']];

// Startansicht: im Erklärmodus nah an der Schleife (schräg von vorne oder von rechts)
const resetView = () => {
  if (state.explain) (state.sideView ? sideView : explainView)(controls);
  else resetModelView();
};

export function updateUi() {
  document.body.classList.toggle('schueler-modus', modus.schueler);
  $('schuelerModusBtn').setAttribute('aria-pressed', String(modus.schueler));
  for (const id of ['coilBtn', 'explainCoilBtn']) $(id).setAttribute('aria-pressed', String(state.coil));
  $('coilStatus').textContent = (state.coil
    ? `${COIL.TURNS} Windungen hintereinander: ${COIL.TURNS}-fache Spannung.`
    : 'Einzelne Leiterschleife (1 Windung).') + ' Zum Vergleich im U-t-Diagramm: Messbereich ±15 mV.';
  $('showManyBtn').disabled = state.coil;   // „viele e⁻“ nur bei der Leiterschleife (Kette von Ende zu Ende)
  $('explainBtn').textContent = state.explain ? 'Zurück zum Modell' : 'Erklärung: Elektronen in der Schleife';
  $('explainBtn').classList.toggle('active', state.explain);
  $('explainPanel').hidden = !state.explain;
  $('meterSection').hidden = state.explain;
  for (const [id, key] of TOGGLES) $(id).setAttribute('aria-pressed', String(state[key]));
  $('pauseBtn').textContent = state.paused ? 'Weiter' : 'Pause';
  $('sideViewBtn').setAttribute('aria-pressed', String(state.sideView));
  $('holdBox').hidden = !state.hold;
  for (const [id, display] of DISPLAYS) {
    $(id).classList.toggle('active', state.display === display);
    $(id).setAttribute('aria-pressed', String(state.display === display));
  }
  for (const [id, drive] of DRIVES) {
    $(id).classList.toggle('active', state.drive === drive);
    $(id).setAttribute('aria-pressed', String(state.drive === drive));
  }
  $('speedBox').hidden = state.drive !== 'speed' || state.hold;
  $('windBox').hidden = state.drive !== 'wind' || state.hold;
  $('modelWindOut').textContent = `${formatNumber(state.wind, 1).replace(',0', '')} m/s`;
  $('modelWindSlider').value = state.wind;
  $('crankInfo').hidden = state.drive !== 'crank' || state.hold;
  $('speedOut').textContent = (state.speed < 0 ? '−' : '') + formatNumber(Math.abs(state.speed), 1) + ' U/s';
  $('magnetStatus').textContent = state.northUp ? 'Nordpol (rot) oben, Südpol (grün) unten' : 'Südpol (grün) oben, Nordpol (rot) unten';
  for (const button of $('rangeButtons').children) {
    const active = Number(button.dataset.range) === state.range;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('slowCheck').checked = state.slowMotion;
  updateMeterFace();
}

// Drehzahl des Rotors beim Antrieb „Wind“ (jedes Bild)
export function updateParkStatus() {
  if (state.drive !== 'wind') return;
  $('modelRotorStatus').textContent = park.rpm < 0.05 ? 'Der Rotor steht – zu wenig Wind (unter 3 m/s).'
    : `Rotor: ${formatNumber(park.rpm, 1)} Umdrehungen pro Minute`;
}

// Erklärmodus ein/aus: Messgerät und Kabel weg, dicke durchsichtige Schleife, Größen zu Beginn aus,
// Kamera näher an die Schleife
export function setExplain(on) {
  endCrank();
  state.explain = on;
  state.paused = false;
  state.sideView = false;
  if (on) Object.assign(state, { showB: false, showV: false, showF: false, showElectron: false, showTwoElectrons: false, showManyElectrons: false, showRings: false, magnetGlass: false });
  setRingsInstant();
  electrons.shift = 0;
  setMeterVisible(!on);
  setTable(!on);
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
    button.textContent = `±${range}`;
    button.addEventListener('click', () => { state.range = range; updateUi(); });
    $('rangeButtons').append(button);
  }
  const speed = $('speedSlider');
  Object.assign(speed, { min: -SPEED_MAX, max: SPEED_MAX, step: 0.1, value: state.speed });
  speed.addEventListener('input', () => { state.speed = Number(speed.value); updateUi(); });

  for (const [id, display] of DISPLAYS) {
    $(id).addEventListener('click', () => {
      setDisplay(display);
      updateUi();
    });
  }
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
  $('plotCloseBtn').addEventListener('click', () => { state.showPlot = false; updateUi(); });
  $('explainBtn').addEventListener('click', () => setExplain(!state.explain));
  const modelWind = $('modelWindSlider');
  Object.assign(modelWind, { min: 0, max: WIND_MAX, step: 0.5, value: state.wind });
  modelWind.addEventListener('input', () => { state.wind = Number(modelWind.value); updateUi(); });
  $('linkBtn').addEventListener('click', () => showLink());
  // QR-Code für den Schülermodus; mit Abgabe-Server (Raumcode vorhanden) im selben Raum wie diese Seite
  $('schuelerQrBtn').addEventListener('click', () => {
    const url = raum ? adresseFuer({ schueler: '' }) : location.origin + location.pathname + '?schueler';
    showLink(url, 'Schülermodus: Erklärmodus ohne B, v und F_L' + (raum ? ' – Geteiltes kommt in diesem Raum an.' : '.'));
  });
  // Schülermodus ein/aus (Lehrkraft, z. B. am Beamer): ein → gleich in den Erklärmodus, B, v und F_L aus
  $('schuelerModusBtn').addEventListener('click', () => {
    modus.schueler = !modus.schueler;
    if (modus.schueler) setExplain(true);
    updateUi();
  });
  // Aus dem Windpark gekommen: zurück mit Wind (wie hier eingestellt) und Uhrzeit; kurz „Vereinfachtes Modell“
  if (ausWindpark) {
    const zeit = new URLSearchParams(location.search).get('zeit');
    $('windparkLink').hidden = false;
    $('windparkLink').addEventListener('click', event => {
      event.preventDefault();
      const zurueck = new URLSearchParams({ wind: state.wind });
      if (zeit !== null) zurueck.set('zeit', zeit);
      location.href = '../generator-windpark/?' + zurueck;
    });
    $('modelBadge').classList.add('show');
    setTimeout(() => $('modelBadge').classList.remove('show'), 2500);
  }
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
  // Ansicht von rechts ein/aus; dreht man die Ansicht selbst, ist sie nicht mehr „von rechts“
  $('sideViewBtn').addEventListener('click', () => {
    state.sideView = !state.sideView;
    resetView();
    updateUi();
  });
  controls.addEventListener('start', () => {
    if (!state.sideView) return;
    state.sideView = false;
    updateUi();
  });
  // Leiterschleife ↔ Spule: Messbereich und U-Achse bleiben, wie sie sind – so sieht man im Diagramm direkt, dass die
  // Spannung mit der Windungszahl wächst (die Kurve von davor bleibt stehen)
  for (const id of ['coilBtn', 'explainCoilBtn']) {
    $(id).addEventListener('click', () => {
      state.coil = !state.coil;
      if (state.coil) state.showManyElectrons = false;
      updateUi();
    });
  }
  onCrankGrab(updateUi);

  applyMagnetPoles();
  document.body.classList.toggle('schueler-geraet', modus.festgelegt);
  if (modus.schueler) setExplain(true);   // Größen B, v, F_L sind dabei aus (setExplain) und bleiben es
  else resetView();
  updateUi();
}
