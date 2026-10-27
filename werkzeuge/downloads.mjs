// ------------------------------------------------------------------
// Offline-Versionen zum Herunterladen:  npm run downloads   (bzw. npm run downloads -- <simulation>)
//
// Packt eine Simulation in eine einzige HTML-Datei downloads/<simulation>.html, die per Doppelklick im Browser
// läuft – ohne Webserver und ohne Internet:
// - alle Module der Simulation und der gemeinsamen Bausteine (gemeinsam/) mit esbuild zu einem Skript gebündelt,
//   three.js aus node_modules gleich mit (statt vom CDN)
// - Stylesheets der Seite und der Bausteine, Bilder (bilder/) und die QR-Code-Bibliothek eingebettet
//   (die Bausteine finden sie über globalThis.OFFLINE, siehe gemeinsam/stil.js, link.js, tafel/tafel.js)
// Teilen und Live-Steuerung bleiben darin automatisch ausgeblendet (sie brauchen den Abgabe-Server).
//
// Nach Änderungen an einer Simulation neu erzeugen und mit committen, sonst veraltet die Offline-Version.
// ------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = path.join(ROOT, 'downloads');

// Simulationen mit Offline-Version
const SIMULATIONEN = ['leiterschaukel-induktion'];

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const lesen = datei => fs.readFileSync(datei, 'utf8');
// Text sicher in ein <script> setzen (ein „</script“ darin würde es vorzeitig beenden)
const imSkript = text => text.replace(/<\/(script)/gi, '<\\/$1');

function dateienIn(ordner, endung) {
  if (!fs.existsSync(ordner)) return [];
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap(e => {
    const weg = path.join(ordner, e.name);
    if (e.isDirectory()) return e.name === 'tests' ? [] : dateienIn(weg, endung);
    return endung.includes(path.extname(e.name)) ? [weg] : [];
  });
}

// Datum, dazu der Commit – aber nur, wenn es keine ungespeicherten Änderungen gibt (sonst wäre er irreführend)
function stand() {
  const datum = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  try {
    const git = befehl => execSync(befehl, { cwd: ROOT }).toString().trim();
    return git('git status --porcelain') ? datum : `${datum}, Version ${git('git rev-parse --short HEAD')}`;
  } catch {
    return datum;
  }
}

async function erzeugen(name) {
  const ordner = path.join(ROOT, 'simulationen', name);
  let html = lesen(path.join(ordner, 'index.html'));

  // Eigene Stylesheets der Seite einbetten, Importmap weg (three.js steckt im Bündel)
  html = html.replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g,
    (_, href) => `<style>\n${lesen(path.join(ordner, href))}\n</style>`);   // Funktion: kein „$“-Ersetzen
  html = html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '');
  const modul = html.match(/<script type="module" src="([^"]+)"><\/script>/);
  if (!modul) throw new Error(`${name}: kein <script type="module" src="…"> gefunden`);

  // Alle Module bündeln; als Modul-Skript in der Seite bleibt import.meta.url die Adresse der Datei
  const buendel = await esbuild.build({
    entryPoints: [path.join(ordner, modul[1])],
    bundle: true,
    format: 'esm',
    minify: true,
    target: 'es2022',
    write: false,
    legalComments: 'none',
    logLevel: 'warning',
  });
  const code = buendel.outputFiles[0].text;

  // Stylesheets der gemeinsamen Bausteine (nach Dateiname) und Bilder der Simulation (nach Pfad wie im Code)
  const stile = Object.fromEntries(dateienIn(path.join(ROOT, 'gemeinsam'), ['.css'])
    .map(d => [path.basename(d), lesen(d)]));
  const dateien = Object.fromEntries(dateienIn(path.join(ordner, 'bilder'), Object.keys(MIME))
    .map(d => [path.relative(ordner, d).split(path.sep).join('/'),
      `data:${MIME[path.extname(d)]};base64,${fs.readFileSync(d).toString('base64')}`]));
  const offline = { seite: `simulationen/${name}/`, stile, dateien, stand: stand() };
  const qrcode = lesen(path.join(ROOT, 'node_modules', 'qrcode-generator', 'qrcode.js'));

  // Ersatz als Funktion: sonst würden „$&“, „$'“ usw. im (minifizierten) Code als Platzhalter gedeutet
  html = html.replace(modul[0], () => [
    `<script>\n${imSkript(qrcode)}\n</script>`,
    `<script>globalThis.OFFLINE = ${imSkript(JSON.stringify(offline))};</script>`,
    `<script type="module">\n${imSkript(code)}\n</script>`,
  ].join('\n  '));
  html = html.replace(/<title>([^<]*)<\/title>/, '<title>$1 (offline)</title>');
  html = html.replace(/<!DOCTYPE html>/i, `<!DOCTYPE html>\n<!-- Offline-Version von ${offline.seite} (Stand ${offline.stand}), erzeugt mit werkzeuge/downloads.mjs.
     Quelle und aktuelle Version: https://github.com/mmint23/website -->`);

  fs.mkdirSync(ZIEL, { recursive: true });
  const datei = path.join(ZIEL, `${name}.html`);
  fs.writeFileSync(datei, html);
  console.log(`${path.relative(ROOT, datei)}: ${(fs.statSync(datei).size / 1024 / 1024).toFixed(2)} MB`);
}

const auswahl = process.argv.slice(2);
for (const name of auswahl.length ? auswahl : SIMULATIONEN) await erzeugen(name);
