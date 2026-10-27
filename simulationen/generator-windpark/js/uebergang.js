// ------------------------------------------------------------------
// Übergänge im Windpark:
//  · Haus mit Schild antippen (eingaenge in landschaft.js) → Kamerafahrt vor die Haustür → Überblendung in den Raum
//    (raum.js) bzw. ins Generator-Modell (Antrieb „Wind“, Hinweis „Vereinfachtes Modell“). Antippen während der
//    Fahrt springt direkt zur Überblendung.
//  · Windrad antippen → Kamerafahrt zur Gondel → Gondel wird durchsichtig (Welle und Generator) → die Ansicht
//    bleibt stehen, bis noch einmal getippt wird → Ausblenden und Wechsel zur Simulation Innenpolgenerator (eigene
//    Seite; Wind und Uhrzeit gehen in der Adresse mit, dort führt „Zurück zum Windpark“ wieder her). Antippen
//    während der Fahrt springt zum Blick in die Gondel.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { TRANSITION } from './config.js';
import { state } from './state.js';
import { turbines, highlightTurbine, revealNacelle, eingaenge, highlightHouse } from './landschaft.js';
import { renderer, camera, controls } from './szene.js';

const canvas = renderer.domElement;
const fade = document.getElementById('fade');
const badge = document.getElementById('modelBadge');
const hint = document.getElementById('hintText');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Ablauf Haus: idle → fly → fadeOut → (Ansicht wechseln) → fadeIn → idle
// Ablauf Windrad: idle → fly → reveal → fadeOut → (Seite Innenpolgenerator)
const run = { phase: 'idle', t: 0, turbine: null, house: null, fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(),
  toPos: new THREE.Vector3(), toTarget: new THREE.Vector3() };
let enterModel = () => {};
let enterRoom = () => {};
let badgeTimer = 0;

export const transitionActive = () => run.phase !== 'idle';

// Welches Windrad liegt unter dem Finger?
function turbineAt(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  let best = null, bestDistance = Infinity;
  for (const t of turbines) {
    const hit = raycaster.intersectObject(t.group, true)[0];
    if (hit && hit.distance < bestDistance) { best = t; bestDistance = hit.distance; }
  }
  return best;
}

// Welches betretbare Haus liegt unter dem Finger? (Eintrag aus eingaenge oder null)
function houseAt(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  let best = null, bestDistance = Infinity;
  for (const e of eingaenge) {
    const hit = raycaster.intersectObject(e.haus, true)[0];
    if (hit && hit.distance < bestDistance) { best = e; bestDistance = hit.distance; }
  }
  return best;
}

// Kamerafahrt vor die Haustür: etwas erhöht, Blick auf die Tür
function startHouseFlight(eingang) {
  Object.assign(run, { phase: 'fly', t: 0, turbine: null, house: eingang });
  controls.enabled = false;
  controls.minDistance = 2;
  highlightHouse(null);
  const { haus } = eingang;
  haus.updateMatrixWorld();
  const { lokal, vorne } = haus.userData.tuer;
  run.fromPos.copy(camera.position);
  run.fromTarget.copy(controls.target);
  run.toTarget.copy(haus.localToWorld(lokal.clone()));
  run.toPos.copy(haus.localToWorld(lokal.clone().add(new THREE.Vector3(0, 2.5, vorne * 14))));
}

// Kamerafahrt vorbereiten: seitlich neben die Gondel, etwas höher, Blick auf Gondel und Generator
function startFlight(turbine) {
  run.turbine = turbine;
  run.house = null;
  run.phase = 'fly';
  run.t = 0;
  controls.enabled = false;
  controls.minDistance = 5;              // im Windpark sonst 60 m – die Kamera soll nah an die Gondel
  highlightTurbine(null);
  turbine.group.updateMatrixWorld();
  run.fromPos.copy(camera.position);
  run.fromTarget.copy(controls.target);
  run.toTarget.copy(turbine.nacelle.localToWorld(new THREE.Vector3(0, 1.6, -0.5)));
  run.toPos.copy(turbine.nacelle.localToWorld(new THREE.Vector3(-12, 8, -13)));
}

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Kamera steht an der Gondel: Gondel durchsichtig machen, Hinweis zum Weitergehen
function zurGondel() {
  camera.position.copy(run.toPos);
  controls.target.copy(run.toTarget);
  Object.assign(run, { phase: 'reveal', t: 0 });
  hint.textContent = 'Tippe noch einmal, um zum Innenpolgenerator zu wechseln';
}

// Zur Simulation Innenpolgenerator (Nachbarordner); Wind und Uhrzeit für den Rückweg in der Adresse
function zumInnenpolgenerator() {
  const ziel = new URL('../innenpolgenerator/', location.href);
  ziel.search = new URLSearchParams({ von: 'windpark', wind: state.wind, zeit: state.time }).toString();
  location.href = ziel.href;
}

// Jedes Bild (dt in s Echtzeit)
export function updateTransition(dt) {
  if (badgeTimer > 0) {
    badgeTimer -= dt;
    badge.classList.toggle('show', badgeTimer > 0);
  }
  if (run.phase === 'idle') return;
  run.t += dt;
  if (run.phase === 'fly') {
    const k = ease(Math.min(1, run.t / TRANSITION.FLY));
    camera.position.lerpVectors(run.fromPos, run.toPos, k);
    controls.target.lerpVectors(run.fromTarget, run.toTarget, k);
    camera.lookAt(controls.target);
    if (run.t >= TRANSITION.FLY) {
      if (run.house) Object.assign(run, { phase: 'fadeOut', t: 0 });   // vor der Tür: gleich hinein
      else zurGondel();
    }
  } else if (run.phase === 'reveal') {
    // Gondel wird durchsichtig; danach bleibt die Ansicht stehen, bis noch einmal getippt wird
    revealNacelle(run.turbine, Math.min(1, run.t / TRANSITION.REVEAL));
    camera.lookAt(controls.target);
  } else if (run.phase === 'fadeOut') {
    fade.style.opacity = Math.min(1, run.t / TRANSITION.FADE_OUT);
    if (run.t >= TRANSITION.FADE_OUT && !run.house) {
      zumInnenpolgenerator();
      run.phase = 'weg';   // Seite wird gewechselt; bleibt ausgeblendet
      return;
    }
    if (run.t >= TRANSITION.FADE_OUT) {
      revealNacelle(null, 0);
      controls.enabled = true;
      if (run.house.ziel === 'room') enterRoom();   // ins Wohnzimmer
      else enterModel();                            // ins Generator-Modell (Antrieb „Wind“)
      Object.assign(run, { phase: 'fadeIn', t: 0 });
    }
  } else if (run.phase === 'fadeIn') {
    fade.style.opacity = Math.max(0, 1 - run.t / TRANSITION.FADE_IN);
    if (run.t >= TRANSITION.FADE_IN) {
      fade.style.opacity = 0;
      run.phase = 'idle';
      if (run.house.ziel === 'model') badgeTimer = TRANSITION.BADGE;   // „Vereinfachtes Modell“ nur beim Modell
    }
  }
}

// Antippen von Drehen der Ansicht unterscheiden: kurzer Druck ohne nennenswerte Bewegung
let down = null;
canvas.addEventListener('pointerdown', event => {
  down = { x: event.clientX, y: event.clientY, time: performance.now() };
  // Haus: während der Fahrt gleich hinein; Windrad: Fahrt überspringen bzw. beim Blick in die Gondel zurückfliegen
  if (run.phase === 'fly' && run.house) Object.assign(run, { phase: 'fadeOut', t: 0 });
  else if (run.phase === 'fly') zurGondel();
  else if (run.phase === 'reveal') Object.assign(run, { phase: 'fadeOut', t: 0 });
});
canvas.addEventListener('pointerup', event => {
  if (!down || state.view !== 'park' || transitionActive()) return;
  const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
  const quick = performance.now() - down.time < 600;
  down = null;
  if (moved > 8 || !quick) return;
  const turbine = turbineAt(event);
  const house = !turbine && houseAt(event);
  if (turbine) startFlight(turbine);
  else if (house) startHouseFlight(house);
});
// Maus über einem Windrad: hervorheben, Zeiger als Hand
canvas.addEventListener('pointermove', event => {
  if (state.view !== 'park' || transitionActive() || event.pointerType !== 'mouse' || event.buttons) return;
  const turbine = turbineAt(event);
  highlightTurbine(turbine);
  const house = turbine ? null : houseAt(event);
  highlightHouse(house);
  canvas.style.cursor = turbine || house ? 'pointer' : '';
});

// Mit der Zurück-Taste des Browsers vom Innenpolgenerator zurück: Die Seite kommt dann ggf. aus dem Zwischenspeicher,
// noch ausgeblendet an der Gondel – wieder in die Startansicht des Windparks
let zurueckInDenPark = () => {};
addEventListener('pageshow', event => {
  if (!event.persisted || run.phase !== 'weg') return;
  revealNacelle(null, 0);
  fade.style.opacity = 0;
  controls.minDistance = 60;   // wie sonst im Windpark (szene.js)
  controls.enabled = true;
  run.phase = 'idle';
  zurueckInDenPark();
});
export function onBackToPark(callback) {
  zurueckInDenPark = callback;
}

// Was beim Wechsel ins Modell bzw. in den Raum passiert (setzt das Bedienfeld)
export function onEnterModel(callback) {
  enterModel = callback;
}
export function onEnterRoom(callback) {
  enterRoom = callback;
}
