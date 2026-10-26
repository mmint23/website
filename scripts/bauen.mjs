// ------------------------------------------------------------------
// Baut die Website in den Ordner _site/
//
// - holt jede Simulation aus simulationen.json von GitHub (öffentliche Repos, kein Token nötig)
// - baut sie, falls nötig (z. B. Vite), und kopiert sie nach _site/<pfad>/
// - erzeugt die Übersichtsseite aus seite/vorlage.html und schreibt _site/version.json
//   (welcher Commit jeder Simulation gerade online ist)
//
// Aufruf:  node scripts/bauen.mjs                  baut alles
//          node scripts/bauen.mjs --pruefen <url>  vergleicht nur mit <url>/version.json und meldet,
//                                                  ob sich etwas geändert hat (für die stündliche Prüfung)
// Keine Abhängigkeiten außer Node.js (≥ 20) und git.
// ------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, '_site');
const HOLEN = path.join(ROOT, '_holen');
const SEITE = path.join(ROOT, 'seite');

// Diese Ordner und Dateien einer Simulation kommen nicht auf die Website
// (docs/: dort liegen z. B. Hersteller-Handblätter, die wir nicht veröffentlichen dürfen)
const WEGLASSEN = new Set([
  '.git', '.github', '.gitignore', 'node_modules', 'tests', 'server', 'docs',
  'package.json', 'package-lock.json', 'README.md',
]);

const simulationen = JSON.parse(fs.readFileSync(path.join(ROOT, 'simulationen.json'), 'utf8'));

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

const repoUrl = repo => `https://github.com/${repo}`;

// Neuester Commit des Standard-Branches, ohne zu klonen
function neuesterCommit(repo) {
  return git('ls-remote', repoUrl(repo), 'HEAD').split(/\s+/)[0];
}

function kopieren(von, nach, oben = true) {
  fs.mkdirSync(nach, { recursive: true });
  for (const eintrag of fs.readdirSync(von, { withFileTypes: true })) {
    if (oben && WEGLASSEN.has(eintrag.name)) continue;
    const quelle = path.join(von, eintrag.name), ziel = path.join(nach, eintrag.name);
    if (eintrag.isDirectory()) kopieren(quelle, ziel, false);
    else if (eintrag.isFile()) fs.copyFileSync(quelle, ziel);
  }
}

const escapeHtml = text => String(text).replace(/[&<>"']/g, z => `&#${z.charCodeAt(0)};`);

function uebersicht() {
  const faecher = [...new Set(simulationen.map(s => s.fach))];
  const abschnitte = faecher.map(fach => {
    const karten = simulationen.filter(s => s.fach === fach).map(s => `
        <a class="karte" href="${escapeHtml(s.pfad)}/">
          <h3>${escapeHtml(s.titel)}</h3>
          <p>${escapeHtml(s.text)}</p>
        </a>`).join('');
    return `
      <section>
        <h2>${escapeHtml(fach)}</h2>
        <div class="karten">${karten}
        </div>
      </section>`;
  }).join('\n');
  const vorlage = fs.readFileSync(path.join(SEITE, 'vorlage.html'), 'utf8');
  return vorlage.replace('<!-- SIMULATIONEN -->', abschnitte);
}

function bauen() {
  fs.rmSync(SITE, { recursive: true, force: true });
  fs.rmSync(HOLEN, { recursive: true, force: true });
  const version = { gebaut: new Date().toISOString(), website: git('-C', ROOT, 'rev-parse', 'HEAD'), simulationen: {} };

  for (const sim of simulationen) {
    if (!/^[a-z0-9-]+$/.test(sim.pfad)) throw new Error(`Ungültiger Pfad: ${sim.pfad}`);
    console.log(`\n== ${sim.titel} (${sim.repo}) → /${sim.pfad}/`);
    const ordner = path.join(HOLEN, sim.pfad);
    git('clone', '--quiet', '--depth', '1', repoUrl(sim.repo), ordner);
    version.simulationen[sim.repo] = git('-C', ordner, 'rev-parse', 'HEAD');
    if (sim.bauen) execSync(sim.bauen, { cwd: ordner, stdio: 'inherit' });
    kopieren(path.join(ordner, sim.ausgabe ?? '.'), path.join(SITE, sim.pfad));
  }

  // Eigene Seiten (Übersicht, Impressum, Datenschutz, Stil)
  for (const datei of fs.readdirSync(SEITE)) {
    if (datei !== 'vorlage.html') fs.copyFileSync(path.join(SEITE, datei), path.join(SITE, datei));
  }
  fs.writeFileSync(path.join(SITE, 'index.html'), uebersicht());
  fs.writeFileSync(path.join(SITE, 'version.json'), JSON.stringify(version, null, 2) + '\n');
  fs.rmSync(HOLEN, { recursive: true, force: true });
  console.log(`\nFertig: ${simulationen.length} Simulationen in ${path.relative(process.cwd(), SITE) || '.'}/`);
}

// Hat sich seit dem letzten Veröffentlichen etwas geändert? Schreibt geaendert=true|false für GitHub Actions.
async function pruefen(url) {
  let online = null;
  try {
    const antwort = await fetch(new URL('version.json', url), { cache: 'no-store' });
    if (antwort.ok) online = await antwort.json();
  } catch { /* Seite noch nicht erreichbar → neu bauen */ }
  const gruende = [];
  if (!online) gruende.push('keine version.json online');
  else {
    const website = git('-C', ROOT, 'rev-parse', 'HEAD');
    if (online.website !== website) gruende.push('Website geändert');
    for (const sim of simulationen) {
      if (online.simulationen?.[sim.repo] !== neuesterCommit(sim.repo)) gruende.push(`${sim.repo} geändert`);
    }
  }
  const geaendert = gruende.length > 0;
  console.log(geaendert ? `Neu bauen: ${gruende.join(', ')}` : 'Keine Änderungen.');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `geaendert=${geaendert}\n`);
}

const [modus, url] = process.argv.slice(2);
if (modus === '--pruefen') await pruefen(url);
else bauen();
