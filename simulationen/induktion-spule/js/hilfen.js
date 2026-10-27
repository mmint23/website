// ------------------------------------------------------------------
// Hilfsfunktionen für die 3D-Darstellung
// ------------------------------------------------------------------
import * as THREE from 'three';

export function addMesh(geometry, material, parent) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Beschriftung als Fläche mit Canvas-Textur
const textTextures = new Map();
export function textTexture(text, color = '#ffffff') {
  const key = text + color;
  if (!textTextures.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 200px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 140);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    textTextures.set(key, texture);
  }
  return textTextures.get(key);
}

export function makeLabel(text, size, color = '#ffffff') {
  const material = new THREE.MeshBasicMaterial({ map: textTexture(text, color), transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
}

// Geometrien (und eigene Materialien der Beschriftungen) eines entfernten Objekts freigeben
export function disposeObject(root) {
  root.traverse(obj => {
    if (!obj.isMesh) return;
    obj.geometry.dispose();
    if (obj.material.isMeshBasicMaterial) obj.material.dispose();
  });
}

// Zahl mit deutschem Dezimalkomma
export const formatNumber = (value, digits) => value.toFixed(digits).replace('.', ',');
export const formatAmpere = value => formatNumber(value, 1) + ' A';

// Beschriftung, die immer zum Betrachter zeigt und aufrecht bleibt (Sprite); height: Höhe in cm
export function makeTextSprite(text, height, color = '#1d2733', bold = true) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${bold ? 'bold ' : ''}96px system-ui, sans-serif`;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + 24;
  canvas.height = 128;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 12, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(height * canvas.width / canvas.height, height, 1);
  sprite.renderOrder = 20;
  return sprite;
}
