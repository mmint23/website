// ------------------------------------------------------------------
// Gemeinsam genutzte Materialien
// ------------------------------------------------------------------
import * as THREE from 'three';

export const mat = {
  table: new THREE.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a64b, metalness: 1, roughness: 0.35 }),
  aluminium: new THREE.MeshStandardMaterial({ color: 0xd8dce0, metalness: 1, roughness: 0.22 }),
  north: new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.45 }),
  south: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.45 }),
  yoke: new THREE.MeshStandardMaterial({ color: 0x55595e, metalness: 0.6, roughness: 0.4 }),
  housing: new THREE.MeshStandardMaterial({ color: 0x3d4a5c, roughness: 0.55 }),
  panel: new THREE.MeshStandardMaterial({ color: 0xd9dee4, roughness: 0.6 }),
  knob: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }),
  cableRed: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 }),
  cableBlue: new THREE.MeshStandardMaterial({ color: 0x1e5bc6, roughness: 0.5 }),
  clamp: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 }),
  stripe: new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5 }),
  puck: new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.4 }),
  marker: new THREE.MeshStandardMaterial({ color: 0x1d4f91, roughness: 0.4 }),
  ledOff: new THREE.MeshStandardMaterial({ color: 0x5a1a1a, roughness: 0.4 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xe8b98f, roughness: 0.65 }),
  ledOn: new THREE.MeshStandardMaterial({ color: 0x39ff5a, emissive: 0x39ff5a, emissiveIntensity: 1.5 }),
};
