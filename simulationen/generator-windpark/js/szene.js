// ------------------------------------------------------------------
// Renderer, Szene, Kamera und Licht (Generator-Modell: freischwebend vor neutralem Hintergrund)
// ------------------------------------------------------------------
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const container = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;                  // Schatten nur im Windpark (die Sonne dort wirft welche)
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8edf2);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

export const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 1000);
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 20;
controls.maxDistance = 200;

// Kamera und Steuerung für die jeweilige Ansicht: Windpark in Metern (weite Sicht, Kamera über dem Boden),
// Generator-Modell in Zentimetern
export function applyViewSettings(view) {
  const parkView = view === 'park';
  camera.near = parkView ? 2 : 0.5;
  camera.far = parkView ? 5000 : 1000;
  camera.updateProjectionMatrix();
  controls.minDistance = parkView ? 60 : 20;
  controls.maxDistance = parkView ? 1600 : 200;
  controls.maxPolarAngle = parkView ? Math.PI * 0.47 : Math.PI;
}

// Startansicht: schräg von vorne oben, Modell links, Messgerät rechts unten
export function resetView() {
  camera.position.set(-10, 18, 70);
  controls.target.set(11, -6, 0);
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
