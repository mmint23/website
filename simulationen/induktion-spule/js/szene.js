// ------------------------------------------------------------------
// Renderer, Szene, Kamera und Licht (Modell freischwebend vor neutralem Hintergrund)
// ------------------------------------------------------------------
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const container = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8edf2);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

export const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 1000);
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 25;
controls.maxDistance = 220;

// Startansicht: Inhalt (Rechteck in der Bildebene: Mitte x, y und Größe w × h in cm) so einpassen, dass er in
// der freien Fläche rect (Pixel im Fenster: x, y, w, h) zwischen den Bedienelementen erscheint.
// Blick fast von vorne (entlang der Welle), leicht von rechts oben.
export function fitView(rect, content) {
  const H = container.clientHeight, W = container.clientWidth;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = Math.max(content.w / rect.w, content.h / rect.h) * H / (2 * tanHalf);
  const scale = H / (2 * d * tanHalf);   // Pixel pro cm in der Bildebene
  const ox = (rect.x + rect.w / 2 - W / 2) / scale, oy = (rect.y + rect.h / 2 - H / 2) / scale;
  controls.target.set(content.x - ox, content.y + oy, 0);
  camera.position.set(controls.target.x + 0.08 * d, controls.target.y + 0.12 * d, d);
  controls.update();
}

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(30, 60, 50);
scene.add(sun);

// Größe anpassen; im Hochformat das Sichtfeld vergrößern, damit das ganze Modell sichtbar bleibt
function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const BASE_FOV = 38;
  const BASE_ASPECT = 1.6;
  camera.fov = camera.aspect >= BASE_ASPECT
    ? BASE_FOV
    : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * BASE_ASPECT / camera.aspect));
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
