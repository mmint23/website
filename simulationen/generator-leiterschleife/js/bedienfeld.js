// ------------------------------------------------------------------
// Bedienfeld: Antrieb, Magnet, Messbereich, Anzeigen, Erklärmodus. Aus dem Windpark gekommen (?von=windpark):
// Knopf „Zurück zum Windpark“ (mit Wind und Uhrzeit) und kurz der Hinweis „Vereinfachtes Modell des Generators“.
// Schülermodus (Knopf, bzw. fest mit ?schueler): Erklärmodus ohne den Knopf F_L; „QR-Code für den
// Schülermodus“ zeigt die Adresse dafür (über den Abgabe-Server mit Raumcode, damit Geteiltes bei der Lehrkraft
// ankommt). Ist er an, öffnet auch „Steuerung abgeben“ (Live-Steuerung, live.js) das Schülergerät im Schülermodus.
// ------------------------------------------------------------------
import { METER, SPEED_MAX, WIND_MAX, COIL, inVolt } from './config.js';
import { state, ausWindpark, modus } from './state.js';
import { endCrank, setHold, holdTo, rotor, electrons, park } from './physik.js';
import { applyMagnetPoles, setRingsInstant } from './modell.js';
import { updateMeterFace, setMeterVisible, setDisplay, setMeterToo } from './messgeraet.js';
import { onCrankGrab } from './ziehen.js';
import { aufTausch, bauteilEinbauen, tauschLaeuft, NAMEN } from './bauteile.js';
import { explainView, sideView } from './erklaerung.js';
import { resetView as resetModelView, controls, setTable, setBildVersatz } from './szene.js';
import { formatNumber } from './hilfen.js';
import { showLink } from '../../../gemeinsam/link.js';
import { adresseFuer, raum } from '../../../gemeinsam/verbindung.js';

const $ = id => document.getElementById(id);
const DRIVES = [['driveWindBtn', 'wind'], ['driveSpeedBtn', 'speed'], ['driveCrankBtn', 'crank']];
// Angeschlossen statt der Bürstenkabel ans Messgerät: LED (Gedankenexperiment) oder Glühlampe, zu der sich das
// Messgerät parallel anschließen lässt (siehe README)
const DISPLAYS = [['displayMeterBtn', 'meter'], ['displayLedBtn', 'led'], ['displayLampBtn', 'lamp']];
// Schalter (aria-pressed) und ihr Zustand; Festhalten gibt es rechts und im Erklär-Bedienfeld
const TOGGLES = [['showBBtn', 'showB'], ['showVBtn', 'showV'], ['showFBtn', 'showF'], ['showElectronBtn', 'showElectron'], ['showTwoBtn', 'showTwoElectrons'],
  ['showManyBtn', 'showManyElectrons'], ['showRingsBtn', 'showRings'], ['magnetGlassBtn', 'magnetGlass'], ['plotBtn', 'showPlot'], ['explainPlotBtn', 'showPlot'],
  ['pauseBtn', 'paused'], ['explainSlowBtn', 'slowMotion'], ['slowBtn', 'slowMotion'], ['explainHoldBtn', 'hold'], ['holdBtn', 'hold']];

// Startansicht: im Erklärmodus nah an der Schleife (schräg von vorne oder von rechts)
const resetView = () => {
  if (state.explain) (state.sideView ? sideView : explainView)(controls);
  else resetModelView();
};

// Nur ein Bedienfeld (links) im Erklärmodus und im Schülermodus. Diese Bedienelemente wandern dann aus dem rechten
// Bedienfeld nach links (Ziel: Element im linken Feld) und wieder an ihren Platz zurück (Merkzeichen an der alten Stelle)
const UMZUG = [['windparkLink', 'obenPlatz'], ['linkBtn', 'obenPlatz'], ['laserBtn', 'obenPlatz'], ['schuelerModusBtn', 'obenPlatz'],
  ['schuelerQrBtn', 'obenPlatz'], ['explainBtn', 'obenPlatz'],
  ['driveButtons', 'antriebPlatz'], ['windBox', 'antriebPlatz'], ['speedBox', 'antriebPlatz'], ['crankInfo', 'antriebPlatz'],
  ['flipBtn', 'magnetPlatz']];
const merkzeichen = new Map();
const nurLinks = () => state.explain || modus.schueler;
function bedienfeldUmhaengen() {
  const linksAn = nurLinks();
  for (const [id, ziel] of UMZUG) {
    const element = $(id);
    if (!merkzeichen.has(id)) {
      merkzeichen.set(id, document.createComment(id));
      element.before(merkzeichen.get(id));
    }
    const links = $(ziel).contains(element);
    if (linksAn && !links) $(ziel).append(element);
    if (!linksAn && links) merkzeichen.get(id).after(element);
  }
  $('explainPanel').hidden = !linksAn;
  $('modelPanel').hidden = linksAn;
  $('stopBtn').hidden = linksAn;   // links gibt es Pause bzw. den Regler in der Mitte
  for (const element of document.querySelectorAll('.nur-erklaerung')) element.hidden = !state.explain;
  document.body.classList.toggle('links-feld', linksAn);
  requestAnimationFrame(bildVersetzen);
}

// Nur das linke Bedienfeld: Modell in die Mitte der freien Fläche rechts daneben (nicht in schmalen Fenstern, dort
// liegt das Bedienfeld oben)
function bildVersetzen() {
  const feld = $('explainPanel').getBoundingClientRect();
  const frei = nurLinks() && innerWidth > 700 && !$('explainPanel').hidden;
  setBildVersatz(frei ? (feld.right + 12 + innerWidth - 16) / 2 - innerWidth / 2 : 0);
}

export function updateUi() {
  bedienfeldUmhaengen();
  document.body.classList.toggle('schueler-modus', modus.schueler);
  $('schuelerModusBtn').setAttribute('aria-pressed', String(modus.schueler));
  for (const id of ['coilBtn', 'explainCoilBtn']) $(id).setAttribute('aria-pressed', String(state.coil));
  $('coilStatus').textContent = (state.coil
    ? `${COIL.TURNS} Windungen hintereinander.`
    : 'Einzelne Leiterschleife (1 Windung).') + ' Zum Vergleich im U-t-Diagramm: Messbereich ±15 mV.';
  // Bauteil auf der Welle (bauteile.js, wie der Rotor im Gleichstrommotor): Auswahl, während des Tauschs gesperrt.
  // Die Spule mit 5 Windungen gibt es nur, solange die Leiterschleife eingebaut ist.
  const tausch = tauschLaeuft();
  for (const button of document.querySelectorAll('[data-bauteil]')) {
    const an = button.dataset.bauteil === state.bauteil;
    button.classList.toggle('active', an);
    button.setAttribute('aria-pressed', String(an));
    button.disabled = tausch;
  }
  // Ablage und Auswahl erst per Knopf; ist eine Spule eingebaut, steht das auch bei ausgeblendeter Ablage darunter
  $('bauteileBtn').setAttribute('aria-pressed', String(state.bauteileZeigen));
  $('bauteileBtn').disabled = tausch;
  $('bauteilAuswahl').hidden = !state.bauteileZeigen;
  $('bauteilStatus').hidden = !state.bauteileZeigen && state.bauteil === 'schleife' && !tausch;
  $('bauteilStatus').textContent = tausch ? 'Bauteil wird getauscht …' : `Eingebaut: ${NAMEN[state.bauteil]}`;
  $('coilBtn').disabled = tausch || state.bauteil !== 'schleife';
  $('coilStatus').hidden = state.bauteil !== 'schleife';
  $('explainBtn').disabled = tausch;
  $('showManyBtn').disabled = state.coil;   // „viele e⁻“ nur bei der Leiterschleife (Kette von Ende zu Ende)
  $('explainBtn').textContent = state.explain ? 'Zurück zum Modell' : 'Erklärung: Elektronen in der Schleife';
  $('explainBtn').classList.toggle('active', state.explain);
  $('meterSection').hidden = state.explain;
  for (const [id, key] of TOGGLES) $(id).setAttribute('aria-pressed', String(state[key]));
  $('pauseBtn').textContent = state.paused ? 'Weiter' : 'Pause';
  $('sideViewBtn').setAttribute('aria-pressed', String(state.sideView));
  $('holdBox').hidden = !state.hold;
  // Drehwinkel-Regler dort, wo man festhält: im Erklärmodus links unter „Festhalten“, sonst rechts unter
  // „Leiterschleife festhalten“ (derselbe Regler, nur umgehängt)
  const festhalten = $(state.explain ? 'explainHoldBtn' : 'holdBtn');
  if (festhalten.nextElementSibling !== $('holdBox')) festhalten.after($('holdBox'));
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
  $('magnetStatus').textContent = state.northLeft ? 'Nordpol (rot) links, Südpol (grün) rechts' : 'Südpol (grün) links, Nordpol (rot) rechts';
  $('meterTooBtn').hidden = state.display !== 'lamp';
  $('meterTooBtn').setAttribute('aria-pressed', String(state.meterToo));
  // Messbereich: Einheit mV oder V, darunter die Bereiche dieser Einheit
  const volt = inVolt(state.range);
  for (const [id, an] of [['unitMvBtn', !volt], ['unitVBtn', volt]]) {
    $(id).classList.toggle('active', an);
    $(id).setAttribute('aria-pressed', String(an));
  }
  for (const button of $('rangeButtons').children) {
    const range = Number(button.dataset.range);
    button.hidden = inVolt(range) !== volt;
    button.classList.toggle('active', range === state.range);
    button.setAttribute('aria-pressed', String(range === state.range));
  }
  $('plotUnit').textContent = volt ? 'U in V' : 'U in mV';
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
    button.textContent = '±' + (inVolt(range) ? formatNumber(range / 1000, range < 1000 ? 1 : 0) : range);
    button.addEventListener('click', () => {
      state.range = range;
      zuletzt[inVolt(range) ? 'volt' : 'milli'] = range;
      updateUi();
    });
    $('rangeButtons').append(button);
  }
  // Einheit umschalten: zurück zum zuletzt gewählten Bereich dieser Einheit
  const zuletzt = { milli: inVolt(state.range) ? 15 : state.range, volt: inVolt(state.range) ? state.range : 300 };
  $('unitMvBtn').addEventListener('click', () => { state.range = zuletzt.milli; updateUi(); });
  $('unitVBtn').addEventListener('click', () => { state.range = zuletzt.volt; updateUi(); });
  $('meterTooBtn').addEventListener('click', () => {
    setMeterToo(!state.meterToo);
    updateUi();
  });
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
    state.northLeft = !state.northLeft;
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
    showLink(url, 'Schülermodus: Erklärmodus ohne F_L' + (raum ? ' – Geteiltes kommt in diesem Raum an.' : '.'));
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
      // Lehrerseite: Rolle und Raumcode (steht inzwischen in der Adresse) mit zurück, damit der nächste Wechsel
      // wieder als Lehrerseite im selben Raum ankommt
      const hier = new URLSearchParams(location.search);
      const lehrer = hier.has('lehrer') ? 'lehrer&' + (hier.get('raum') ? `raum=${hier.get('raum')}&` : '') : '';
      location.href = '../generator-windpark/?' + lehrer + zurueck;
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
  $('resetView').addEventListener('click', resetView);
  // Ansicht von vorne (entlang der Welle) ein/aus; dreht man die Ansicht selbst, ist sie nicht mehr „von vorne“
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
  for (const button of document.querySelectorAll('[data-bauteil]')) {
    button.addEventListener('click', () => {
      endCrank();
      if (bauteilEinbauen(button.dataset.bauteil)) updateUi();
    });
  }
  $('bauteileBtn').addEventListener('click', () => {
    state.bauteileZeigen = !state.bauteileZeigen;
    updateUi();
  });
  aufTausch(updateUi);
  window.addEventListener('resize', () => requestAnimationFrame(bildVersetzen));   // Schülermodus: Modell neben dem Feld
  onCrankGrab(updateUi);

  applyMagnetPoles();
  document.body.classList.toggle('schueler-geraet', modus.festgelegt);
  if (modus.schueler) setExplain(true);   // Größen sind dabei aus (setExplain), F_L bleibt es
  else resetView();
  updateUi();
}
