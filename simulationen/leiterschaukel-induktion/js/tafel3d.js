// ------------------------------------------------------------------
// Tafel im Erklärmodus: kleine Tafel in der Szene (hinter dem Magneten) mit einem festen Bild des Leiters im
// Magnetfeld (bilder/tafel.jpg). Antippen öffnet sie groß zum Zeichnen.
//
// Zeichnen, Teilen und die Lehrerseite kommen aus dem gemeinsamen Baustein gemeinsam/tafel/ (siehe dessen
// README.md); hier steht nur, was die Leiterschaukel zusätzlich hat: das Abbild der Tafel in der 3D-Szene.
// ------------------------------------------------------------------
import * as THREE from 'three';
import {
  initTafel, oeffneTafel, aufAnzeige, aktuellesDokument, tafelBild, zeichneAlle,
} from '../../../gemeinsam/tafel/index.js';
import { axisHeight } from './config.js';
import { state } from './state.js';
import { mat } from './materialien.js';
import { addMesh } from './hilfen.js';
import { scene, camera, renderer } from './szene.js';

// Stifte wie die Pfeile im Erklärmodus und Schwarz zum Beschriften
const STIFTE = [
  { name: 'v', farbe: '#2e7d32', text: 'v' },
  { name: 'B', farbe: '#1565c0', text: 'B' },
  { name: 'F', farbe: '#c62828', text: 'F_L' },
  { name: 'schwarz', farbe: '#1d2733', text: 'Stift' },
];

// ---------------- Kleine Tafel in der Szene

const BREITE = 17.6, HOEHE = 11;
const texturCanvas = document.createElement('canvas');
texturCanvas.width = 1280;
texturCanvas.height = 800;
const textur = new THREE.CanvasTexture(texturCanvas);
textur.colorSpace = THREE.SRGBColorSpace;
textur.anisotropy = 8;
let texturVeraltet = true;

const tafel3d = new THREE.Group();
scene.add(tafel3d);
const rahmen = addMesh(new THREE.BoxGeometry(BREITE + 1.6, HOEHE + 1.6, 0.8), mat.wood, tafel3d);
rahmen.position.z = -0.45;
const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(BREITE, HOEHE),
  new THREE.MeshBasicMaterial({ map: textur, toneMapped: false }));
tafel3d.add(flaeche);
function texturAktualisieren() {
  const ctx = texturCanvas.getContext('2d');
  ctx.fillStyle = '#e8edf2';
  ctx.fillRect(0, 0, texturCanvas.width, texturCanvas.height);
  if (tafelBild.naturalWidth) ctx.drawImage(tafelBild, 0, 0, texturCanvas.width, texturCanvas.height);
  zeichneAlle(ctx, aktuellesDokument().striche, texturCanvas.width, 1.6);
  // Hinweis als Band am unteren Rand (nur in der Szene, nicht auf der großen Tafel)
  ctx.fillStyle = 'rgba(92, 58, 28, 0.85)';
  ctx.fillRect(0, texturCanvas.height - 84, texturCanvas.width, 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tafel – antippen zum Zeichnen', texturCanvas.width / 2, texturCanvas.height - 40);
  textur.needsUpdate = true;
}

// Jedes Bild: nur im Erklärmodus sichtbar, unter und hinter dem Magneten (dort ist in der Erklär-Ansicht
// Platz zwischen den Bedienfeldern), zur Erklär-Kamera gedreht
const blickpunkt = new THREE.Vector3();
export function syncTafel() {
  tafel3d.visible = state.explain;
  if (!state.explain) return;
  const axisY = axisHeight(state.setup, state.longMagnet);
  tafel3d.position.set(4, axisY - 26, -17);
  tafel3d.lookAt(blickpunkt.set(-42, axisY + 14, 42));
  if (texturVeraltet) {
    texturVeraltet = false;
    texturAktualisieren();
  }
}

// Antippen der Tafel in der Szene (kurzer Tipp, kein Ziehen – sonst dreht sich wie gewohnt die Ansicht)
{
  const canvas3d = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const zeiger = new THREE.Vector2();
  const trifft = event => {
    if (!tafel3d.visible) return false;
    const r = canvas3d.getBoundingClientRect();
    zeiger.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(zeiger, camera);
    return raycaster.intersectObject(flaeche, false).length > 0;
  };
  let tipp = null;
  canvas3d.addEventListener('pointerdown', event => {
    tipp = trifft(event) ? { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now() } : null;
  });
  canvas3d.addEventListener('pointerup', event => {
    if (!tipp || tipp.id !== event.pointerId) return;
    const kurz = performance.now() - tipp.t < 600 && Math.hypot(event.clientX - tipp.x, event.clientY - tipp.y) < 10;
    tipp = null;
    if (kurz && trifft(event)) oeffneTafel();
  });
  canvas3d.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' && event.buttons === 0 && trifft(event)) canvas3d.style.cursor = 'pointer';
  });
}

// Gemeinsame Tafel einrichten: Bild, Stifte und der Laserpointer in ihrer Werkzeugleiste
export function initTafel3d() {
  const laser = document.createElement('button');
  laser.className = 'laser-btn';
  laser.type = 'button';
  laser.dataset.laser = '';
  laser.setAttribute('aria-pressed', 'false');
  laser.title = 'Mit Apple Pencil oder Maus markieren (Taste L)';
  laser.textContent = 'Laserpointer';
  initTafel({
    id: 'leiterschaukel-induktion',
    bild: 'bilder/tafel.jpg',
    bildText: 'Leiter mit Elektron zwischen den Polen des Hufeisenmagneten',
    seitenverhaeltnis: 1.6,
    stifte: STIFTE,
    leisteZusatz: [laser],
  });
  aufAnzeige(() => { texturVeraltet = true; });
  document.getElementById('tafelBtn').addEventListener('click', oeffneTafel);
}
