// ------------------------------------------------------------------
// Bedienfeld: Wind und Uhrzeit im Windpark, Knöpfe im Wohnzimmer. Das Generator-Modell ist eine eigene Simulation
// (generator-leiterschleife); „Direkt zum Generator-Modell“ und der Knopf im Wohnzimmer wechseln dorthin.
// Kohlekraftwerk: ein- und ausblenden, beim Blick hinein Feuer an/aus und Anzeige von Dampf und Drehzahl.
// ------------------------------------------------------------------
import { WIND_MAX, KRAFTWERK } from './config.js';
import { state, KRAFTWERK_MERKEN } from './state.js';
import { park, kraftwerk } from './physik.js';
import { controls, camera, applyViewSettings } from './szene.js';
import { parkView } from './landschaft.js';
import { onEnterRoom, onEnterKraftwerk, onBackToPark, transitionActive, zurSimulation } from './uebergang.js';
import { kraftwerkView, revealKraftwerk, highlightKraftwerk } from './kraftwerk.js';
import { raumView } from './raum.js';
import { formatNumber } from './hilfen.js';
import { uhrText } from './tageszeit.js';

const $ = id => document.getElementById(id);

// Startansicht: im Windpark über die Landschaft, im Wohnzimmer vom Eingang aus, im Kraftwerk schräg von vorne
const resetView = () => {
  if (state.view === 'park') parkView(camera, controls);
  else if (state.view === 'kraftwerk') kraftwerkView(camera, controls);
  else raumView(camera, controls);
};

// Windstärke nach Beaufort (Obergrenzen in m/s)
const BEAUFORT = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
const beaufort = v => BEAUFORT.findIndex(limit => v < limit + 1e-9);

// Bedienhinweis je Ansicht (ohne Überschrift und Erklärtext)
const HINWEISE = {
  park: 'Ziehen: Ansicht drehen · Mausrad/zwei Finger: zoomen · Rechte Maustaste: verschieben',
  room: 'Ziehen: umschauen · Mausrad/zwei Finger: näher heran',
  kraftwerk: 'Ziehen: ums Kraftwerk herum · Mausrad/zwei Finger: näher heran · Rechte Maustaste: verschieben',
};

let frageZeigen = false;   // Leitfrage groß über der Landschaft (nur im Windpark)

// Leitfrage mit Finger oder Maus verschieben: Der Kasten folgt dem Zeiger und bleibt ganz im Fenster; ein kurzer Klick
// ohne Bewegung blendet ihn aus. Die Stelle bleibt, solange die Seite offen ist (auch beim erneuten Einblenden).
function frageZiehbar() {
  const kasten = $('frage').querySelector('p');
  let zug = null;
  const begrenzen = (links, oben) => {
    const { width, height } = kasten.getBoundingClientRect();
    kasten.style.left = `${Math.min(Math.max(links, 0), innerWidth - width)}px`;
    kasten.style.top = `${Math.min(Math.max(oben, 0), innerHeight - height)}px`;
  };
  kasten.addEventListener('pointerdown', event => {
    const { left, top } = kasten.getBoundingClientRect();
    zug = { id: event.pointerId, x: event.clientX, y: event.clientY, left, top, bewegt: false };
    kasten.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  kasten.addEventListener('pointermove', event => {
    if (!zug || event.pointerId !== zug.id) return;
    const dx = event.clientX - zug.x, dy = event.clientY - zug.y;
    if (!zug.bewegt && Math.hypot(dx, dy) < 6) return;
    if (!zug.bewegt && !kasten.classList.contains('frei')) {
      // beim ersten Ziehen aus der Mitte lösen, dabei die Breite behalten
      kasten.style.width = `${kasten.getBoundingClientRect().width}px`;
      kasten.classList.add('frei');
    }
    zug.bewegt = true;
    begrenzen(zug.left + dx, zug.top + dy);
  });
  kasten.addEventListener('pointerup', event => {
    if (!zug || event.pointerId !== zug.id) return;
    if (!zug.bewegt) { frageZeigen = false; updateUi(); }
    zug = null;
  });
  kasten.addEventListener('pointercancel', () => { zug = null; });
  addEventListener('resize', () => {
    if (kasten.classList.contains('frei')) begrenzen(parseFloat(kasten.style.left), parseFloat(kasten.style.top));
  });
}
function updateUi() {
  $('frage').hidden = !frageZeigen || state.view !== 'park';
  $('frageBtn').setAttribute('aria-pressed', String(frageZeigen));
  $('frageBtn').classList.toggle('active', frageZeigen);
  $('hintText').textContent = HINWEISE[state.view];
  $('parkPanel').hidden = state.view !== 'park';
  $('roomPanel').hidden = state.view !== 'room';
  $('kraftwerkPanel').hidden = state.view !== 'kraftwerk';
  $('kraftwerkBtn').textContent = state.kraftwerk ? 'Kohlekraftwerk ausblenden' : 'Kohlekraftwerk zeigen';
  $('kraftwerkHinweis').hidden = !state.kraftwerk;
  $('feuerBtn').textContent = kraftwerk.feuer ? 'Feuer ausmachen' : 'Feuer anzünden';
  $('feuerBtn').classList.toggle('on', kraftwerk.feuer);
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

// Drehzahl der Windräder bzw. Zustand im Kohlekraftwerk (jedes Bild)
const prozent = x => `${Math.round(100 * x)} %`;
export function updateParkStatus() {
  if (state.view === 'kraftwerk') {
    const { feuer, hitze, dampf, drehzahl } = kraftwerk;
    const rpm = Math.round(drehzahl * KRAFTWERK.NENNDREHZAHL / 10) * 10;
    $('kraftwerkStatus').innerHTML = [
      `Feuer: ${feuer ? 'brennt' : 'aus'} · Hitze im Kessel: ${prozent(hitze)}`,
      `Dampf: ${dampf < 0.01 ? 'keiner' : prozent(dampf)}`,
      `Turbine und Generator: ${rpm === 0 ? 'stehen' : `${rpm} Umdrehungen pro Minute`}`,
    ].join('<br>');
    return;
  }
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
  // Kohlekraftwerk: ein-/ausblenden (bleibt in diesem Tab so), hinein (nach der Kamerafahrt) und wieder hinaus
  $('kraftwerkBtn').addEventListener('click', () => {
    if (transitionActive()) return;
    state.kraftwerk = !state.kraftwerk;
    highlightKraftwerk(false);
    try { sessionStorage.setItem(KRAFTWERK_MERKEN, state.kraftwerk ? '1' : '0'); } catch { /* ohne Speicher */ }
    updateUi();
  });
  onEnterKraftwerk(() => setView('kraftwerk'));
  $('feuerBtn').addEventListener('click', () => { kraftwerk.feuer = !kraftwerk.feuer; updateUi(); });
  $('kraftwerkToParkBtn').addEventListener('click', () => {
    if (transitionActive()) return;
    revealKraftwerk(0);
    setView('park');
  });
  $('kraftwerkToGenBtn').addEventListener('click', () => zurSimulation('innenpolgenerator'));
  $('kraftwerkToModelBtn').addEventListener('click', () => zurSimulation('generator-leiterschleife'));
  $('resetView').addEventListener('click', resetView);
  // Leitfrage ein- und ausblenden (Knopf oder kurzer Klick auf die Frage); ziehen verschiebt sie
  $('frageBtn').addEventListener('click', () => { frageZeigen = !frageZeigen; updateUi(); });
  frageZiehbar();

  applyViewSettings(state.view);
  resetView();
  updateUi();
}
