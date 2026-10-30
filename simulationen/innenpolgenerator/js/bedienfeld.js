// ------------------------------------------------------------------
// Bedienfeld: Erklärmodus ein/aus (nur dort das Magnetfeld: Feldlinien und ihre Färbung im Spuleninneren, B im
// Spuleninneren; dann alle Bedienelemente links, mit Pause);
// nur im Modell: Rechnung (Feldlinienmodell / reale Physik) und Aufbau (Eisenkern, Verbindung der beiden Spulen);
// Antrieb mit Festhalten und Zeitlupe; Anzeige (Messgerät, LED oder Glühlampe)
// ------------------------------------------------------------------
import { METER, SPEED_MAX, WIND_MAX, TURBINE } from './config.js';
import { state, ausWindpark, imErklaermodusStarten } from './state.js';
import { endCrank, setHold, holdTo, rotor, frequency, park } from './physik.js';
import { updateMeterFace } from './messgeraet.js';
import { onCrankGrab } from './ziehen.js';
import { fitView, controls } from './szene.js';
import { formatNumber } from './hilfen.js';
import { showLink } from '../../../gemeinsam/link.js';
import { adresseFuer, netz, raum } from '../../../gemeinsam/verbindung.js';

const $ = id => document.getElementById(id);
const DRIVES = [['driveWindBtn', 'wind'], ['driveSpeedBtn', 'speed'], ['driveCrankBtn', 'crank']];
const IRON = [['airBtn', false], ['ironBtn', true]];
// Angeschlossen: Messgerät, LED oder Glühlampe (Gedankenexperiment, siehe README)
const DISPLAYS = [['displayMeterBtn', 'meter'], ['displayLedBtn', 'led'], ['displayLampBtn', 'lamp']];
const WIRING = [['wiringOkBtn', false], ['wiringSwapBtn', true]];
const CHECKS = [['fieldCheck', 'showField'], ['insideCheck', 'colorInside'], ['bCheck', 'showB'], ['plotCheck', 'showPlot']];

const segment = (id, active) => {
  $(id).classList.toggle('active', active);
  $(id).setAttribute('aria-pressed', String(active));
};

export function updateUi() {
  $('explainBtn').textContent = state.explain ? 'Zurück zum Modell' : 'Erklärung: Magnetfeld in den Spulen';
  $('explainBtn').classList.toggle('active', state.explain);
  $('explainBox').hidden = !state.explain;
  bedienfeldUmhaengen();
  $('panel').hidden = state.explain;   // im Erklärmodus nur ein Bedienfeld (links)
  document.body.classList.toggle('erklaer-an', state.explain);   // Live-Steuerung: Kasten dann rechts (CSS)
  requestAnimationFrame(erklaerLage);   // Höhe des Erklär-Bedienfelds (auch wenn der Erklärmodus live umschaltet)
  $('aufbauSection').hidden = state.explain;
  $('pauseBtn').setAttribute('aria-pressed', String(state.paused));
  $('pauseBtn').textContent = state.paused ? 'Weiter' : 'Pause';
  for (const [id, iron] of IRON) segment(id, state.iron === iron);
  for (const [id, display] of DISPLAYS) segment(id, state.display === display);
  $('displayButtons').hidden = state.explain;   // Auswahl nur im Modell
  for (const [id, reversed] of WIRING) segment(id, state.reversed === reversed);
  $('wiringStatus').textContent = state.reversed
    ? 'E von Spule 1 ist mit A von Spule 2 verbunden.'
    : 'E von Spule 1 ist mit E von Spule 2 verbunden.';
  for (const [id, drive] of DRIVES) segment(id, state.drive === drive);
  $('speedBox').hidden = state.drive !== 'speed' || state.hold;
  $('windBox').hidden = state.drive !== 'wind' || state.hold;
  $('windOut').textContent = `${formatNumber(state.wind, 1).replace(',0', '')} m/s`;
  $('windSlider').value = state.wind;
  $('crankInfo').hidden = state.drive !== 'crank' || state.hold;
  $('speedOut').textContent = (state.speed < 0 ? '−' : '') + formatNumber(Math.abs(state.speed), 1) + ' U/s';
  $('holdBtn').setAttribute('aria-pressed', String(state.hold));
  $('slowBtn').setAttribute('aria-pressed', String(state.slowMotion));
  $('holdBox').hidden = !state.hold;
  for (const button of $('rangeButtons').children) segment(button.id, Number(button.dataset.range) === state.range);
  for (const [id, key] of CHECKS) $(id).checked = state[key];
  $('insideCheck').disabled = !state.showField;   // färben geht nur bei eingeblendeten Feldlinien
  segment('lineModelBtn', state.lineModel);
  segment('realBtn', !state.lineModel);
  $('rechnungSection').hidden = state.explain;   // nur im Modell
  updateMeterFace();
}

// ---------------- Startansicht

// Modell mit Kabeln und Messgerät (Bildebene, cm)
const INHALT = { x: 9, y: -2, w: 66, h: 46 };
let verschoben = false;   // hat jemand die Ansicht gedreht oder gezoomt? Dann beim Größenwechsel nicht neu einpassen

// Erklärmodus: alle Bedienelemente links. Diese Abschnitte wandern dann aus dem rechten Bedienfeld ins Erklär-
// Bedienfeld (Ziel) und zurück an ihren Platz (Merkzeichen an der alten Stelle)
const UMZUG = [['startSection', 'startPlatz'], ['antriebSection', 'antriebPlatz'], ['anzeigeSection', 'anzeigePlatz']];
const merkzeichen = new Map();
function bedienfeldUmhaengen() {
  for (const [id, ziel] of UMZUG) {
    const abschnitt = $(id);
    if (!merkzeichen.has(id)) {
      merkzeichen.set(id, document.createComment(id));
      abschnitt.before(merkzeichen.get(id));
    }
    const links = $(ziel).contains(abschnitt);
    if (state.explain && !links) $(ziel).append(abschnitt);
    if (!state.explain && links) merkzeichen.get(id).after(abschnitt);
  }
}

// Freie Fläche zwischen Überschrift, Bedienfeld, Diagrammen, Hinweis und (im Erklärmodus) Erklär-Bedienfeld. Mehrere
// Möglichkeiten – neben oder über den Diagrammen, neben oder unter dem Erklär-Bedienfeld –, genommen wird die, in
// der das Modell am größten erscheint.
function freieFlaeche() {
  const W = innerWidth, H = innerHeight;
  const rect = el => el.getBoundingClientRect();
  const kopf = rect(document.querySelector('.header')), panel = rect($('panel'));
  const plot = state.showPlot ? rect($('plotBox')) : null;
  const hint = document.querySelector('.hint');
  const erklaer = state.explain ? rect($('explainBox')) : null;
  const flaeche = (left, top, right, bottom) => ({ x: left, y: top, w: Math.max(120, right - left), h: Math.max(120, bottom - top) });
  // Schmale Fenster: Erklär-Bedienfeld oben über die ganze Breite, Bedienfeld unten
  if (W <= 700) return flaeche(16, (erklaer ? erklaer.bottom : kopf.bottom) + 8, W - 16, (plot ? plot.top : $('panel').hidden ? H - 8 : panel.top) - 8);
  const top = kopf.bottom + 8, right = $('panel').hidden ? W - 16 : panel.left - 12;
  const unten = hint.offsetParent ? rect(hint).top - 8 : H - 16;
  const links = [plot, erklaer].filter(Boolean);   // was links im Weg ist
  const kandidaten = [flaeche(Math.max(16, ...links.map(r => r.right + 12)), top, right, unten)];
  if (plot) kandidaten.push(flaeche(erklaer ? erklaer.right + 12 : 16, top, right, plot.top - 8));
  if (erklaer) {
    kandidaten.push(flaeche(plot ? plot.right + 12 : 16, erklaer.bottom + 8, right, unten));
    if (plot) kandidaten.push(flaeche(16, erklaer.bottom + 8, right, plot.top - 8));
  }
  const groesse = f => Math.min(f.w / INHALT.w, f.h / INHALT.h);
  return kandidaten.reduce((a, b) => (groesse(b) > groesse(a) ? b : a));
}

// Erklär-Bedienfeld: unter der Überschrift, höchstens bis kurz über die Diagramme (scrollt sonst)
function erklaerLage() {
  const box = $('explainBox');
  if (box.hidden || innerWidth <= 700) {
    box.style.top = box.style.maxHeight = '';
    return;
  }
  const top = document.querySelector('.header').getBoundingClientRect().bottom + 12;
  const plot = state.showPlot ? $('plotBox').getBoundingClientRect() : null;
  const bottom = plot && !$('plotBox').hidden ? plot.top - 12 : innerHeight - 70;
  box.style.top = top + 'px';
  box.style.maxHeight = Math.max(120, bottom - top) + 'px';
}

// Nach einer Änderung der Diagramme: Ansicht neu einpassen (wenn niemand sie verschoben hat), Erklär-Bedienfeld anpassen
const neuEinpassen = () => (verschoben ? erklaerLage() : resetView());

function resetView() {
  erklaerLage();
  verschoben = false;
  fitView(freieFlaeche(), INHALT);
}

// Erklärmodus ein/aus: alles zum Magnetfeld zu Beginn aus (auch B im Spuleninneren). Die Bedienfelder ändern sich
// – die Ansicht passt sich an.
function setExplain(on) {
  state.explain = on;
  state.paused = false;
  Object.assign(state, { showB: false, showField: false, colorInside: false });   // Magnetfeld zu Beginn aus
  updateUi();
  requestAnimationFrame(neuEinpassen);   // erst, wenn der Diagrammkasten seine neue Größe hat
}

// Jedes Bild: Drehwinkel-Regler folgt dem Magneten (solange man ihn nicht selbst bedient), Frequenz
let holdSliderActive = false;
export function updateReadout() {
  const deg = ((rotor.phi * 180 / Math.PI) % 360 + 360) % 360;
  if (state.hold) {
    if (!holdSliderActive) $('holdSlider').value = deg.toFixed(0);
    $('holdOut').textContent = Math.round(deg) % 360 + '°';
  }
  if (state.drive === 'wind') {
    $('rotorStatus').textContent = park.rpm < 0.05 ? `Der Rotor steht – zu wenig Wind (unter ${TURBINE.CUT_IN} m/s).`
      : `Rotor: ${formatNumber(park.rpm, 1)} Umdrehungen pro Minute`;
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
  for (const [id, iron] of IRON) $(id).addEventListener('click', () => { state.iron = iron; updateUi(); });
  for (const [id, display] of DISPLAYS) $(id).addEventListener('click', () => { state.display = display; updateUi(); });
  for (const [id, reversed] of WIRING) $(id).addEventListener('click', () => { state.reversed = reversed; updateUi(); });
  for (const [id, drive] of DRIVES) {
    $(id).addEventListener('click', () => {
      endCrank();
      state.drive = drive;
      updateUi();
    });
  }
  const wind = $('windSlider');
  Object.assign(wind, { min: 0, max: WIND_MAX, step: 0.5, value: state.wind });
  wind.addEventListener('input', () => { state.wind = Number(wind.value); updateUi(); });
  const speed = $('speedSlider');
  Object.assign(speed, { min: -SPEED_MAX, max: SPEED_MAX, step: 0.05, value: state.speed });
  speed.addEventListener('input', () => { state.speed = Number(speed.value); updateUi(); });
  $('holdBtn').addEventListener('click', () => { setHold(!state.hold); updateUi(); });
  $('slowBtn').addEventListener('click', () => { state.slowMotion = !state.slowMotion; updateUi(); });
  $('pauseBtn').addEventListener('click', () => {
    endCrank();
    state.paused = !state.paused;
    updateUi();
  });
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
      if (key === 'showPlot') requestAnimationFrame(neuEinpassen);   // mehr bzw. weniger Platz für das Modell
    });
  }
  // Rechnung (nur im Modell): Feldlinienmodell (Standard) oder reale Physik (cos-Modell). Ob die Feldlinien zu sehen
  // sind, bleibt davon unberührt.
  for (const [id, lineModel] of [['lineModelBtn', true], ['realBtn', false]]) {
    $(id).addEventListener('click', () => { state.lineModel = lineModel; updateUi(); });
  }
  $('explainBtn').addEventListener('click', () => setExplain(!state.explain));
  $('resetView').addEventListener('click', resetView);
  $('linkBtn').addEventListener('click', () => showLink());
  // QR-Code, der immer in den Erklärmodus führt (?erklaerung); über den Abgabe-Server mit der Adresse des Laptops im
  // WLAN (adresseFuer), sonst diese Seite
  $('erklaerQrBtn').addEventListener('click', () => {
    const url = netz.adressen.length || raum ? adresseFuer({ erklaerung: '' }) : location.origin + location.pathname + '?erklaerung';
    showLink(url, 'Öffnet die Simulation gleich im Erklärmodus.');
  });
  // Aus dem Windpark gekommen (?von=windpark, Antrieb „Wind“ mit dem Wind von dort, state.js): Knopf zurück, mit dem
  // Wind wie hier eingestellt und der Uhrzeit, damit der Windpark wieder so aussieht
  if (ausWindpark) {
    const zeit = new URLSearchParams(location.search).get('zeit');
    $('windparkLink').hidden = false;
    $('windparkLink').addEventListener('click', event => {
      event.preventDefault();
      const zurueck = new URLSearchParams({ wind: state.wind });
      if (zeit !== null) zurueck.set('zeit', zeit);
      location.href = '../generator-windpark/?' + zurueck;
    });
  }
  onCrankGrab(updateUi);
  controls.addEventListener('start', () => { verschoben = true; });
  window.addEventListener('resize', () => { if (!verschoben) resetView(); else erklaerLage(); });

  if (imErklaermodusStarten) setExplain(true);
  else resetView();
  updateUi();
}
