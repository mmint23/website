// ------------------------------------------------------------------
// Einmalig (mit Internet) ausführen:  npm run offline
// Lädt die Bibliotheken, die die Simulation sonst aus dem Internet holt (three.js, QR-Code), nach
// server/offline/npm/. Findet der Server diesen Ordner, liefert er sie selbst aus – die Simulation läuft dann
// auch in einem Netz ohne Internet (z. B. im WLAN-Hotspot des Laptops).
// ------------------------------------------------------------------
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CDN = 'https://cdn.jsdelivr.net/npm/';
const ZIEL = path.join(path.dirname(fileURLToPath(import.meta.url)), 'offline', 'npm');
const DATEIEN = [
  'three@0.170.0/build/three.module.js',
  'three@0.170.0/examples/jsm/controls/OrbitControls.js',
  'three@0.170.0/examples/jsm/environments/RoomEnvironment.js',
  'qrcode-generator@1.4.4/qrcode.js',
];

for (const datei of DATEIEN) {
  const antwort = await fetch(CDN + datei);
  if (!antwort.ok) throw new Error(`${datei}: ${antwort.status}`);
  const ziel = path.join(ZIEL, ...datei.split('/'));
  await fs.mkdir(path.dirname(ziel), { recursive: true });
  await fs.writeFile(ziel, Buffer.from(await antwort.arrayBuffer()));
  console.log('geladen: ' + datei);
}
console.log('\nFertig. Der Server liefert three.js jetzt selbst aus (Ordner server/offline).');
