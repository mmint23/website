// ------------------------------------------------------------------
// Gemeinsam genutzte Materialien
// ------------------------------------------------------------------
import * as THREE from 'three';

// Farben der Pfeile im Erklärmodus (wie bei der Drei-Finger-Regel im Schienenversuch)
export const COLOR_V = '#2e7d32';    // Geschwindigkeit v (Daumen)
export const COLOR_B = '#1565c0';    // Magnetfeld B (Zeigefinger)
export const COLOR_F = '#c62828';    // Kraft F (Mittelfinger)

export const mat = {
  table: new THREE.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.8 }),
  standBase: new THREE.MeshStandardMaterial({ color: 0x2f3a46, metalness: 0.4, roughness: 0.5 }),
  rod: new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 1, roughness: 0.3 }),
  clamp: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 }),
  insulator: new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.5 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xc46a2b, metalness: 1, roughness: 0.3 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a64b, metalness: 1, roughness: 0.35 }),
  north: new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.45 }),
  south: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.45 }),
  yoke: new THREE.MeshStandardMaterial({ color: 0x55595e, metalness: 0.6, roughness: 0.4 }),
  holder: new THREE.MeshStandardMaterial({ color: 0x8a939c, metalness: 0.7, roughness: 0.35 }),
  housing: new THREE.MeshStandardMaterial({ color: 0x3d4a5c, roughness: 0.55 }),
  knob: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }),
  needle: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }),
  cableRed: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xe8b98f, roughness: 0.65 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 }),
  cableBlack: new THREE.MeshStandardMaterial({ color: 0x26292d, roughness: 0.5 }),
};
