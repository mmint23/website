// ------------------------------------------------------------------
// Einmalig (mit Internet) ausführen:  npm run offline
// Lädt die Bibliotheken, die die Simulationen sonst aus dem Internet holen (three.js, QR-Code …), nach
// server/offline/npm/. Findet der Server diesen Ordner, liefert er sie selbst aus – die Website läuft dann
// auch in einem Netz ohne Internet (z. B. im WLAN-Hotspot des Laptops).
//
// Welche Dateien nötig sind, sucht das Skript selbst: alle Adressen auf cdn.jsdelivr.net in den HTML- und
// JS-Dateien der Website, dazu die Module, die über eine Importmap mit Ordner-Präfix eingebunden werden
// (z. B. "three/addons/controls/OrbitControls.js"), und deren relative Importe.
// ------------------------------------------------------------------
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CDN = 'https://cdn.jsdelivr.net/npm/';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = path.join(path.dirname(fileURLToPath(import.meta.url)), 'offline', 'npm');
const AUSLASSEN = new Set(['server', 'node_modules', 'tests']);

async function dateienIn(ordner, endungen) {
  const liste = [];
  for (const eintrag of await fs.readdir(ordner, { withFileTypes: true })) {
    if (eintrag.name.startsWith('.') || AUSLASSEN.has(eintrag.name)) continue;
    const weg = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) liste.push(...await dateienIn(weg, endungen));
    else if (endungen.includes(path.extname(eintrag.name))) liste.push(weg);
  }
  return liste;
}

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const IMPORT = /(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g;

// Gesuchte Dateien als Pfade unterhalb von CDN, z. B. 'three@0.170.0/build/three.module.js'
const gesucht = new Set();
const htmlDateien = await dateienIn(ROOT, ['.html']);
for (const datei of [...htmlDateien, ...await dateienIn(ROOT, ['.js', '.mjs'])]) {
  const text = await fs.readFile(datei, 'utf8');
  for (const [, teil] of text.matchAll(new RegExp(escape(CDN) + '([^\'"`\\s)]+\\.m?js)', 'g'))) gesucht.add(teil);
}
// Importmap-Präfixe ("three/addons/": ".../examples/jsm/") gelten für die JS-Dateien im Ordner der Seite
for (const datei of htmlDateien) {
  const text = await fs.readFile(datei, 'utf8');
  const praefixe = [...text.matchAll(new RegExp('"([^"]+/)"\\s*:\\s*"' + escape(CDN) + '([^"]+/)"', 'g'))];
  if (!praefixe.length) continue;
  for (const js of await dateienIn(path.dirname(datei), ['.js', '.mjs'])) {
    const quelltext = await fs.readFile(js, 'utf8');
    for (const [, modul] of quelltext.matchAll(IMPORT)) {
      for (const [, praefix, ziel] of praefixe) if (modul.startsWith(praefix)) gesucht.add(ziel + modul.slice(praefix.length));
    }
  }
}

// Laden; relative Importe in den geladenen Dateien (z. B. ../utils/…) kommen mit dazu
const geladen = new Set();
const warteschlange = [...gesucht];
while (warteschlange.length) {
  const datei = warteschlange.shift();
  if (geladen.has(datei)) continue;
  geladen.add(datei);
  const antwort = await fetch(CDN + datei);
  if (!antwort.ok) throw new Error(`${datei}: ${antwort.status}`);
  const inhalt = Buffer.from(await antwort.arrayBuffer());
  const ziel = path.join(ZIEL, ...datei.split('/'));
  await fs.mkdir(path.dirname(ziel), { recursive: true });
  await fs.writeFile(ziel, inhalt);
  console.log('geladen: ' + datei);
  for (const [, modul] of inhalt.toString('utf8').matchAll(IMPORT)) {
    if (modul.startsWith('.')) warteschlange.push(path.posix.join(path.posix.dirname(datei), modul));
  }
}
console.log(`\nFertig (${geladen.size} Dateien). Der Server liefert die Bibliotheken jetzt selbst aus (Ordner server/offline).`);
