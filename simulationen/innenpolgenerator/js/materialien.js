// ------------------------------------------------------------------
// Gemeinsam genutzte Materialien
// ------------------------------------------------------------------
import * as THREE from 'three';

export const mat = {
  north: new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.45 }),
  south: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.45 }),
  yoke: new THREE.MeshStandardMaterial({ color: 0x55595e, metalness: 0.6, roughness: 0.4 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x7d848c, metalness: 0.7, roughness: 0.38 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xc46a2b, metalness: 1, roughness: 0.3 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a64b, metalness: 1, roughness: 0.35 }),
  table: new THREE.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.8 }),
  stand: new THREE.MeshStandardMaterial({ color: 0x6b7480, metalness: 0.5, roughness: 0.45 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 1, roughness: 0.3 }),
  insulator: new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.5 }),
  carbon: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.6 }),
  housing: new THREE.MeshStandardMaterial({ color: 0x3d4a5c, roughness: 0.55 }),
  knob: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }),
  needle: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }),
  cableRed: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 }),
  cableBlack: new THREE.MeshStandardMaterial({ color: 0x26292d, roughness: 0.5 }),
};
