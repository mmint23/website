// ------------------------------------------------------------------
// Übergang vom Windpark zum Modell: Windrad antippen → Kamerafahrt zur Gondel → Gondel wird durchsichtig
// (Welle und Generator) → die Ansicht bleibt stehen, bis noch einmal getippt wird → Überblendung ins
// Generator-Modell (Antrieb „Wind“) mit dem Hinweis „Vereinfachtes Modell“. Antippen während der Kamerafahrt
// springt direkt zur Überblendung.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { TRANSITION } from './config.js';
import { state } from './state.js';
import { turbines, highlightTurbine, revealNacelle } from './landschaft.js';
import { renderer, camera, controls } from './szene.js';

const canvas = renderer.domElement;
const fade = document.getElementById('fade');
const badge = document.getElementById('modelBadge');
const hint = document.getElementById('hintText');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Ablauf: idle → fly → reveal → fadeOut → (Ansicht wechseln) → fadeIn → idle
const run = { phase: 'idle', t: 0, turbine: null, fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(),
  toPos: new THREE.Vector3(), toTarget: new THREE.Vector3() };
let enterModel = () => {};
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

// Kamerafahrt vorbereiten: seitlich neben die Gondel, etwas höher, Blick auf Gondel und Generator
function startFlight(turbine) {
  run.turbine = turbine;
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
      Object.assign(run, { phase: 'reveal', t: 0 });
      hint.textContent = 'Tippe noch einmal, um zum Modell zu wechseln';
    }
  } else if (run.phase === 'reveal') {
    // Gondel wird durchsichtig; danach bleibt die Ansicht stehen, bis noch einmal getippt wird
    revealNacelle(run.turbine, Math.min(1, run.t / TRANSITION.REVEAL));
    camera.lookAt(controls.target);
  } else if (run.phase === 'fadeOut') {
    fade.style.opacity = Math.min(1, run.t / TRANSITION.FADE_OUT);
    if (run.t >= TRANSITION.FADE_OUT) {
      revealNacelle(null, 0);
      controls.enabled = true;
      enterModel();                       // Ansicht wechseln (Antrieb „Wind“)
      Object.assign(run, { phase: 'fadeIn', t: 0 });
    }
  } else if (run.phase === 'fadeIn') {
    fade.style.opacity = Math.max(0, 1 - run.t / TRANSITION.FADE_IN);
    if (run.t >= TRANSITION.FADE_IN) {
      fade.style.opacity = 0;
      run.phase = 'idle';
      badgeTimer = TRANSITION.BADGE;
    }
  }
}

// Antippen von Drehen der Ansicht unterscheiden: kurzer Druck ohne nennenswerte Bewegung
let down = null;
canvas.addEventListener('pointerdown', event => {
  down = { x: event.clientX, y: event.clientY, time: performance.now() };
  // während der Fahrt: überspringen; beim Blick in die Gondel: weiter zum Modell
  if (run.phase === 'fly' || run.phase === 'reveal') Object.assign(run, { phase: 'fadeOut', t: 0 });
});
canvas.addEventListener('pointerup', event => {
  if (!down || state.view !== 'park' || transitionActive()) return;
  const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
  const quick = performance.now() - down.time < 600;
  down = null;
  if (moved > 8 || !quick) return;
  const turbine = turbineAt(event);
  if (turbine) startFlight(turbine);
});
// Maus über einem Windrad: hervorheben, Zeiger als Hand
canvas.addEventListener('pointermove', event => {
  if (state.view !== 'park' || transitionActive() || event.pointerType !== 'mouse' || event.buttons) return;
  const turbine = turbineAt(event);
  highlightTurbine(turbine);
  canvas.style.cursor = turbine ? 'pointer' : '';
});

// Was beim Wechsel ins Modell passiert (setzt das Bedienfeld)
export function onEnterModel(callback) {
  enterModel = callback;
}
