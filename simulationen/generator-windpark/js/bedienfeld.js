// ------------------------------------------------------------------
// Bedienfeld: Wind und Uhrzeit im Windpark, Knöpfe im Wohnzimmer. Das Generator-Modell ist eine eigene Simulation
// (generator-leiterschleife); „Direkt zum Generator-Modell“ und der Knopf im Wohnzimmer wechseln dorthin.
// ------------------------------------------------------------------
import { WIND_MAX } from './config.js';
import { state } from './state.js';
import { park } from './physik.js';
import { controls, camera, applyViewSettings } from './szene.js';
import { parkView } from './landschaft.js';
import { onEnterRoom, onBackToPark, transitionActive, zurSimulation } from './uebergang.js';
import { raumView } from './raum.js';
import { formatNumber } from './hilfen.js';
import { uhrText } from './tageszeit.js';

const $ = id => document.getElementById(id);

// Startansicht: im Windpark über die Landschaft, im Wohnzimmer vom Eingang aus
const resetView = () => {
  if (state.view === 'park') parkView(camera, controls);
  else raumView(camera, controls);
};

// Windstärke nach Beaufort (Obergrenzen in m/s)
const BEAUFORT = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
const beaufort = v => BEAUFORT.findIndex(limit => v < limit + 1e-9);

// Bedienhinweis je Ansicht (ohne Überschrift und Erklärtext)
const HINWEISE = {
  park: 'Ziehen: Ansicht drehen · Mausrad/zwei Finger: zoomen · Rechte Maustaste: verschieben',
  room: 'Ziehen: umschauen · Mausrad/zwei Finger: näher heran',
};

function updateUi() {
  $('hintText').textContent = HINWEISE[state.view];
  $('parkPanel').hidden = state.view !== 'park';
  $('roomPanel').hidden = state.view !== 'room';
  $('windOut').textContent = `${formatNumber(state.wind, 1).replace(',0', '')} m/s`;
  $('beaufortStatus').textContent = `Windstärke ${beaufort(state.wind)} (Beaufort)`;
  $('timeOut').textContent = uhrText(state.time);
}

// Ansicht wechseln: Windpark ↔ Wohnzimmer (eigene Szenen, Kamera stellt sich passend ein)
function setView(view) {
  state.view = view;
  applyViewSettings(view);
  resetView();
  updateUi();
}

// Drehzahl der Windräder (jedes Bild)
export function updateParkStatus() {
  if (state.view !== 'park') return;
  $('rotorStatus').textContent = park.rpm < 0.05 ? 'Der Rotor steht – zu wenig Wind (unter 3 m/s).'
    : `Rotor: ${formatNumber(park.rpm, 1)} Umdrehungen pro Minute`;
}

export function initUi() {
  const wind = $('windSlider');
  Object.assign(wind, { min: 0, max: WIND_MAX, step: 0.5, value: state.wind });
  wind.addEventListener('input', () => { state.wind = Number(wind.value); updateUi(); });
  const time = $('timeSlider');
  time.value = state.time;
  time.addEventListener('input', () => { state.time = Number(time.value); updateUi(); });
  // Generator-Modell: eigene Simulation
  $('toModelBtn').addEventListener('click', () => { if (!transitionActive()) zurSimulation('generator-leiterschleife'); });
  $('roomToModelBtn').addEventListener('click', () => zurSimulation('generator-leiterschleife'));
  // Haus im Dorf: hinein (nach der Kamerafahrt) und wieder hinaus
  onEnterRoom(() => setView('room'));
  onBackToPark(() => setView('park'));   // Zurück-Taste des Browsers von einer anderen Simulation
  $('roomToParkBtn').addEventListener('click', () => setView('park'));
  $('resetView').addEventListener('click', resetView);

  applyViewSettings(state.view);
  resetView();
  updateUi();
}
