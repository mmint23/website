// ------------------------------------------------------------------
// Abgabe-Server für den Unterricht (läuft auf dem Lehrer-Laptop im Klassenzimmer)
//
// - liefert die ganze Website mit allen Simulationen aus, damit Schüler und Lehrer alles über
//   http://<Laptop-IP>:<Port> öffnen – die GitHub-Pages-Seite (HTTPS) dürfte diesen Server nicht ansprechen
// - nimmt Tafelzeichnungen der Schüler als Vektordaten an und meldet sie per WebSocket live an die Lehrerseite
//   (Zeichentafel und Abgabe im Browser: gemeinsam/tafel/). Jede Simulation hat eigene Räume.
// - Live-Steuerung (gemeinsam/live/): ein Schülergerät steuert die Simulation am Beamer; der Server reicht den
//   Zustand der Simulation zwischen Schüler- und Lehrergerät weiter.
// - hält alles nur im Arbeitsspeicher; beim Beenden ist alles weg. Keine Abhängigkeiten außer Node.js (≥ 18).
//
// Start:  npm start   bzw.  node server/server.js      Umgebungsvariablen: PORT (8080), PIN (sonst ohne PIN)
// ------------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pruefen, GRENZEN } from '../gemeinsam/tafel/striche.js';
import { annehmen } from './websocket.js';

const PORT = Number(process.env.PORT) || 8080;
// Lehrer-PIN nur, wenn beim Start gesetzt (PIN=… npm start); sonst braucht die Lehrerseite keine Anmeldung
const PIN = process.env.PIN ? String(process.env.PIN) : null;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // Ordner der Website
const OFFLINE = path.join(ROOT, 'server', 'offline');   // optionale Kopie von three.js & Co. (npm run offline)
const CDN = 'https://cdn.jsdelivr.net/npm/';

const LIMITS = {
  NACHRICHT: 1.5 * 1024 * 1024, // größte WebSocket-Nachricht (Abgabe) in Byte
  ABGABEN_PRO_MINUTE: 6,        // je Gerät und je IP-Adresse
  LOGINS_PRO_MINUTE: 5,         // PIN-Versuche je IP-Adresse
  ABGABEN_PRO_RAUM: 150,
  RAEUME: 20,
  RAUM_LEERLAUF: 12 * 3600_000, // Raum ohne Lehrerseite und ohne Aktivität wird nach 12 h gelöscht
  ANMELDUNG: 12 * 3600_000,     // so lange gilt eine Anmeldung mit PIN
  ZUSTAND_ABSTAND: 20,          // Live-Steuerung: höchstens ein Zustand je 20 ms und Verbindung (50 pro Sekunde)
  ZUSTAND_GROESSE: 64 * 1024,   // ... mit höchstens 64 KB
};

// ---------------- Speicher (nur im Arbeitsspeicher)

const raeume = new Map();         // 'Simulation/Raumcode' → { abgaben: Map(Geräte-ID → { id, name, zeit, striche }), zuletzt, live }
// live: Live-Steuerung des Raums – code: gültiger Code aus dem QR-Code (oder null), schueler: Verbindung des
// Schülergeräts, quelle: wer gerade steuert ('schueler' oder die Verbindung einer Lehrerseite), letzter: zuletzt
// gesendeter Zustand der Simulation (bekommt ein Gerät, das neu dazukommt)
const neuesLive = () => ({ code: null, schueler: null, quelle: null, letzter: null });
const tokens = new Map();         // Anmeldung der Lehrerseite: Token → Ablaufzeit
const verbindungen = new Set();   // offene WebSockets; jede mit rolle ('schueler' | 'lehrer'), raum, geraet

// Raumcodes erzeugt die Lehrerseite (zufällig, z. B. „k7m2“); nur Räume einer Lehrerseite gibt es.
// Intern gehört zu jedem Raum die Kennung der Simulation (initTafel({ id })), z. B. 'leiterschaukel-induktion/k7m2'.
const RAUMCODE = /^[a-z0-9-]{3,20}$/;
const SIMULATION = /^[a-z0-9_-]{1,60}$/i;
const raumCode = wert => String(wert ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);

function abgabenListe(raum) {
  return [...(raeume.get(raum)?.abgaben.values() ?? [])].sort((a, b) => a.zeit - b.zeit);
}

// Nachricht an alle Lehrer-Verbindungen eines Raums
function anLehrer(raum, nachricht) {
  for (const v of verbindungen) if (v.rolle === 'lehrer' && v.raum === raum) v.senden(nachricht);
}
function onlineMelden(raum) {
  let anzahl = 0;
  for (const v of verbindungen) if (v.rolle === 'schueler' && v.raum === raum) anzahl++;
  anLehrer(raum, { typ: 'online', anzahl });
}

// Aufräumen: abgelaufene Anmeldungen, verwaiste Räume
setInterval(() => {
  const jetzt = Date.now();
  for (const [token, ablauf] of tokens) if (ablauf < jetzt) tokens.delete(token);
  for (const [raum, r] of raeume) {
    const lehrerDa = [...verbindungen].some(v => v.rolle === 'lehrer' && v.raum === raum);
    if (!lehrerDa && jetzt - r.zuletzt > LIMITS.RAUM_LEERLAUF) raeume.delete(raum);
  }
}, 10 * 60_000).unref();

// ---------------- Begrenzung: höchstens max Ereignisse je Schlüssel in der letzten Minute

const zaehler = new Map();
function zuViele(art, schluessel, max) {
  const key = art + '|' + schluessel, jetzt = Date.now();
  const zeiten = (zaehler.get(key) ?? []).filter(t => jetzt - t < 60_000);
  const voll = zeiten.length >= max;
  if (!voll) zeiten.push(jetzt);
  zaehler.set(key, zeiten);
  return voll;
}
setInterval(() => {
  const jetzt = Date.now();
  for (const [key, zeiten] of zaehler) if (zeiten.every(t => jetzt - t >= 60_000)) zaehler.delete(key);
}, 60_000).unref();

// ---------------- Hilfen

function json(res, status, daten, kopf = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...kopf });
  res.end(JSON.stringify(daten));
}

function lesen(req) {
  return new Promise((resolve, reject) => {
    let groesse = 0;
    const teile = [];
    req.on('data', teil => {
      groesse += teil.length;
      if (groesse > 10_000) {
        reject(Object.assign(new Error('Anfrage zu groß'), { status: 413 }));
        req.destroy();
        return;
      }
      teile.push(teil);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(teile).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Ungültige Daten'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const ipVon = req => req.socket.remoteAddress ?? '';

function pinStimmt(eingabe) {
  const a = crypto.createHash('sha256').update(String(eingabe ?? '')).digest();
  const b = crypto.createHash('sha256').update(PIN).digest();
  return crypto.timingSafeEqual(a, b);
}

const tokenGueltig = token => typeof token === 'string' && (tokens.get(token) ?? 0) > Date.now();

// Adressen des Laptops im lokalen Netz (WLAN zuerst; virtuelle Netze und VPN weglassen)
function lanAdressen() {
  const liste = [];
  for (const [name, eintraege] of Object.entries(os.networkInterfaces())) {
    if (/^(docker|br-|virbr|veth|podman|tun|tap|wg|lo)/.test(name)) continue;
    for (const e of eintraege ?? []) {
      if (e.family === 'IPv4' && !e.internal) liste.push({ name, adresse: e.address });
    }
  }
  const rang = n => (n.startsWith('wl') ? 0 : n.startsWith('en') || n.startsWith('eth') ? 1 : 2);
  return liste.sort((a, b) => rang(a.name) - rang(b.name)).map(e => e.adresse);
}

// ---------------- HTTP-API: Erkennung des Servers und Anmeldung mit PIN (liefert ein Token)

async function api(req, res, url) {
  if (url.pathname === '/api/status' && req.method === 'GET') {
    return json(res, 200, { server: 'mmint-abgabe', version: 1, pin: Boolean(PIN) });
  }
  if (url.pathname === '/api/login' && req.method === 'POST' && PIN) {
    if (zuViele('login', ipVon(req), LIMITS.LOGINS_PRO_MINUTE)) {
      return json(res, 429, { fehler: 'Zu viele Versuche – bitte eine Minute warten.' });
    }
    const { pin } = await lesen(req);
    if (!pinStimmt(pin)) return json(res, 403, { fehler: 'Falsche PIN' });
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, Date.now() + LIMITS.ANMELDUNG);
    return json(res, 200, { token });
  }
  return json(res, 404, { fehler: 'Unbekannt' });
}

// ---------------- WebSocket (/ws): Abgaben der Schüler, Live-Liste und Löschen für den Lehrer
//
// Gerät → Server
//   { typ: 'hallo', rolle: 'lehrer', sim, raum, token }     Token aus POST /api/login (nur mit PIN); legt den Raum an
//   { typ: 'hallo', rolle: 'schueler', sim, raum, geraet }  Geräte-ID: zufällig, im Browser gespeichert
//                                                           sim: Kennung der Simulation (initTafel({ id }))
//                                                           steuern: Code aus dem QR-Code der Live-Steuerung (optional)
//   Schüler: { typ: 'abgabe', name, striche }               ersetzt die vorige Abgabe dieses Geräts
//   Lehrer:  { typ: 'loeschen', id }  { typ: 'alle-loeschen' }
//   Live:    Lehrer { typ: 'live-abgeben' }                 neuer Code (der alte und sein Schülergerät gelten nicht mehr)
//            Lehrer { typ: 'live-umschalten', an }          an: 'schueler' oder 'lehrer' (diese Lehrerseite steuert)
//            Lehrer { typ: 'live-trennen' }                 Code ungültig, Schülergerät getrennt
//            { typ: 'zustand', daten }                      nur vom Gerät, das gerade steuert
// Server → Gerät
//   Schüler: { typ: 'geteilt' }  { typ: 'fehler', text }
//   Lehrer:  { typ: 'willkommen', adressen, port }  { typ: 'liste', abgaben }  { typ: 'abgabe', abgabe }
//            { typ: 'geloescht', id }  { typ: 'geleert' }  { typ: 'online', anzahl }  { typ: 'fehler', code, text }
//   Live:    Lehrer { typ: 'live-code', code }  { typ: 'live-status', aktiv, verbunden, quelle, ich }
//            Schülergerät mit Code { typ: 'live-status', quelle }  { typ: 'live-ende' }
//            { typ: 'zustand', daten }                      an alle, die gerade zuschauen

function verbunden(v) {
  const ip = ipVon(v.req);
  verbindungen.add(v);
  v.on('ende', () => {
    verbindungen.delete(v);
    if (v.rolle === 'schueler') onlineMelden(v.raum);
    const live = raeume.get(v.raum)?.live;
    if (live?.schueler === v) {
      live.schueler = null;
      liveMelden(v.raum);
    }
  });
  v.on('nachricht', nachricht => {
    try {
      bearbeiten(v, ip, nachricht);
    } catch (fehler) {
      console.error(fehler);
    }
  });
}

function bearbeiten(v, ip, nachricht) {
  if (nachricht.typ === 'hallo' && !v.rolle) {
    const code = raumCode(nachricht.raum), sim = String(nachricht.sim ?? '');
    if (!RAUMCODE.test(code) || !SIMULATION.test(sim)) return v.schliessen(4000);
    const raum = v.raum = sim + '/' + code;
    if (nachricht.rolle === 'lehrer') {
      if (PIN && !tokenGueltig(nachricht.token)) {
        v.senden({ typ: 'fehler', code: 'pin', text: 'Bitte mit PIN anmelden' });
        return v.schliessen(4001);
      }
      if (!raeume.has(raum)) {
        if (raeume.size >= LIMITS.RAEUME) {
          v.senden({ typ: 'fehler', code: 'raeume', text: 'Zu viele offene Räume auf dem Server' });
          return v.schliessen(4003);
        }
        raeume.set(raum, { abgaben: new Map(), zuletzt: Date.now(), live: neuesLive() });
      }
      v.rolle = 'lehrer';
      // Steuerte eine Lehrerseite, die inzwischen weg ist (z. B. neu geladen), steuert jetzt diese
      const live = raeume.get(raum).live;
      if (live.quelle && live.quelle !== 'schueler' && !verbindungen.has(live.quelle)) live.quelle = v;
      v.senden({ typ: 'willkommen', adressen: lanAdressen(), port: PORT });
      v.senden({ typ: 'liste', abgaben: abgabenListe(raum) });
      onlineMelden(raum);
      return liveMelden(raum);
    }
    const geraet = String(nachricht.geraet ?? '');
    if (!/^[a-z0-9]{8,40}$/i.test(geraet)) return v.schliessen(4000);
    Object.assign(v, { rolle: 'schueler', geraet });
    onlineMelden(raum);
    if (nachricht.steuern !== undefined) liveSchuelerKommt(v, String(nachricht.steuern));
    return;
  }

  if (nachricht.typ === 'zustand') return liveZustand(v, nachricht.daten);
  if (v.rolle === 'lehrer' && nachricht.typ?.startsWith('live-')) return liveLehrer(v, nachricht);

  if (v.rolle === 'schueler' && nachricht.typ === 'abgabe') {
    const fehler = text => v.senden({ typ: 'fehler', text });
    // Den Raum muss eine Lehrerseite geöffnet haben (nach einem Neustart des Servers legt sie ihn wieder an)
    const r = raeume.get(v.raum);
    if (!r) return fehler('Dieser Raum ist nicht geöffnet – bitte die Lehrkraft fragen.');
    if (zuViele('abgabe-ip', ip, LIMITS.ABGABEN_PRO_MINUTE)
      || zuViele('abgabe-geraet', v.geraet, LIMITS.ABGABEN_PRO_MINUTE)) {
      return fehler('Zu oft geteilt – bitte kurz warten.');
    }
    const ungueltig = pruefen(nachricht.striche);
    if (ungueltig) return fehler(ungueltig);
    const alt = r.abgaben.get(v.geraet);
    if (!alt && r.abgaben.size >= LIMITS.ABGABEN_PRO_RAUM) return fehler('Zu viele Abgaben');
    const name = String(nachricht.name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, GRENZEN.NAME);
    // Erneutes Teilen ersetzt die vorige Abgabe dieses Geräts (gleiche ID, neue Zeit)
    const abgabe = { id: alt?.id ?? crypto.randomBytes(6).toString('hex'), name, zeit: Date.now(), striche: nachricht.striche };
    r.abgaben.set(v.geraet, abgabe);
    r.zuletzt = Date.now();
    anLehrer(v.raum, { typ: 'abgabe', abgabe });
    return v.senden({ typ: 'geteilt' });
  }

  if (v.rolle === 'lehrer' && nachricht.typ === 'loeschen') {
    const abgaben = raeume.get(v.raum)?.abgaben;
    for (const [geraet, abgabe] of abgaben ?? []) {
      if (abgabe.id === nachricht.id) {
        abgaben.delete(geraet);
        anLehrer(v.raum, { typ: 'geloescht', id: abgabe.id });
      }
    }
    return;
  }

  if (v.rolle === 'lehrer' && nachricht.typ === 'alle-loeschen') {
    raeume.get(v.raum)?.abgaben.clear();
    anLehrer(v.raum, { typ: 'geleert' });
  }
}

// ---------------- Live-Steuerung: ein Schülergerät steuert die Simulation am Beamer

// Stand an alle Lehrerseiten des Raums (jede erfährt, ob sie selbst gerade steuert) und an das Schülergerät
function liveMelden(raum) {
  const live = raeume.get(raum)?.live;
  if (!live) return;
  const verbunden = Boolean(live.schueler);
  const quelle = live.quelle === 'schueler' ? 'schueler' : live.quelle ? 'lehrer' : null;
  for (const v of verbindungen) {
    if (v.rolle === 'lehrer' && v.raum === raum) {
      v.senden({ typ: 'live-status', aktiv: Boolean(live.code), verbunden, quelle, ich: live.quelle === v });
    }
  }
  live.schueler?.senden({ typ: 'live-status', quelle });
}

// Schülergerät meldet sich mit dem Code aus dem QR-Code: bekommt zuerst den aktuellen Zustand (damit am Beamer
// nichts springt) und steuert dann – nach dem ersten Scannen sofort, nach einem Neuladen wie zuvor
function liveSchuelerKommt(v, code) {
  const live = raeume.get(v.raum)?.live;
  if (!live?.code || !code || code !== live.code) return v.senden({ typ: 'live-ende' });
  const zuerst = !live.schueler && live.quelle !== 'schueler';
  if (live.schueler && live.schueler !== v) live.schueler.live = false;
  live.schueler = v;
  v.live = true;
  if (live.letzter) v.senden({ typ: 'zustand', daten: live.letzter });
  if (zuerst) live.quelle = 'schueler';
  liveMelden(v.raum);
}

function liveLehrer(v, nachricht) {
  const live = raeume.get(v.raum)?.live;
  if (!live) return;
  if (nachricht.typ === 'live-abgeben') {
    // neuer Code: das bisherige Schülergerät steuert nicht mehr, bis ein Gerät den neuen Code scannt steuert diese Seite
    if (live.schueler) {
      live.schueler.live = false;
      live.schueler.senden({ typ: 'live-ende' });
    }
    Object.assign(live, { code: crypto.randomBytes(9).toString('base64url'), schueler: null, quelle: v });
    v.senden({ typ: 'live-code', code: live.code });
  } else if (nachricht.typ === 'live-umschalten' && live.code) {
    live.quelle = nachricht.an === 'schueler' ? 'schueler' : v;
  } else if (nachricht.typ === 'live-trennen') {
    if (live.schueler) {
      live.schueler.live = false;
      live.schueler.senden({ typ: 'live-ende' });
    }
    Object.assign(live, neuesLive());
  }
  liveMelden(v.raum);
}

// Zustand nur vom Gerät annehmen, das gerade steuert, und an alle anderen des Raums weiterreichen
// (Lehrerseiten und das Schülergerät mit Code)
function liveZustand(v, daten) {
  const live = raeume.get(v.raum)?.live;
  if (!live?.code) return;
  const steuert = live.quelle === 'schueler' ? v.live && live.schueler === v : live.quelle === v;
  if (!steuert || !daten || typeof daten !== 'object') return;
  const jetzt = Date.now();
  if (jetzt - (v.zustandZeit ?? 0) < LIMITS.ZUSTAND_ABSTAND) return;
  v.zustandZeit = jetzt;
  if (JSON.stringify(daten).length > LIMITS.ZUSTAND_GROESSE) return;
  live.letzter = daten;
  for (const andere of verbindungen) {
    if (andere === v || andere.raum !== v.raum) continue;
    if (andere.rolle === 'lehrer' || andere === live.schueler) andere.senden({ typ: 'zustand', daten });
  }
}

// ---------------- Statische Dateien (die Website mit allen Simulationen)

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};
const GESPERRT = new Set(['server', 'node_modules']);   // oberste Ordner, die nicht ausgeliefert werden
const offline = () => fs.existsSync(path.join(OFFLINE, 'npm'));

function datei(req, res, url) {
  let weg;
  try {
    weg = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { fehler: 'Ungültige Adresse' });
  }
  const teile = weg.split('/').filter(Boolean);
  let basis = ROOT;
  // Offline-Kopie der Bibliotheken: /offline/npm/… aus server/offline/npm/…
  if (teile[0] === 'offline') {
    basis = OFFLINE;
    teile.shift();
  } else if (GESPERRT.has(teile[0])) {
    return json(res, 404, { fehler: 'Nicht gefunden' });
  }
  // keine versteckten Dateien (.git …), keine Tests und kein Weg nach oben (..)
  if (teile.some(t => t.startsWith('.') || t.includes('\\') || t === 'tests')) return json(res, 404, { fehler: 'Nicht gefunden' });
  let ziel = path.join(basis, ...teile);
  if (ziel !== basis && !ziel.startsWith(basis + path.sep)) return json(res, 404, { fehler: 'Nicht gefunden' });
  if (fs.existsSync(ziel) && fs.statSync(ziel).isDirectory()) ziel = path.join(ziel, 'index.html');
  fs.readFile(ziel, (fehler, inhalt) => {
    if (fehler) return json(res, 404, { fehler: 'Nicht gefunden' });
    const endung = path.extname(ziel).toLowerCase();
    // Ohne Internet (z. B. im Hotspot des Laptops): Verweise auf das CDN auf die Offline-Kopie umbiegen
    if (basis === ROOT && (endung === '.html' || endung === '.js') && offline()) {
      inhalt = Buffer.from(inhalt.toString('utf8').replaceAll(CDN, '/offline/npm/'));
    }
    res.writeHead(200, {
      'Content-Type': TYPEN[endung] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : inhalt);
  });
}

// ---------------- Server

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    // Kurzadresse der Lehrerseite: /lehrer/<simulation> → /simulationen/<simulation>/?lehrer
    const kurz = url.pathname.match(/^\/lehrer\/([a-z0-9_-]+)\/?$/i);
    if (kurz) {
      const raum = raumCode(url.searchParams.get('raum'));
      res.writeHead(302, { Location: `/simulationen/${kurz[1]}/?lehrer` + (raum ? '&raum=' + raum : '') });
      return res.end();
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { fehler: 'Nicht erlaubt' });
    return datei(req, res, url);
  } catch (fehler) {
    if (!res.headersSent) json(res, fehler.status ?? 500, { fehler: fehler.status ? fehler.message : 'Serverfehler' });
    if (!fehler.status) console.error(fehler);
  }
});

server.on('upgrade', (req, socket) => {
  if (new URL(req.url, 'http://localhost').pathname !== '/ws') return socket.destroy();
  const v = annehmen(req, socket, LIMITS.NACHRICHT);
  if (v) verbunden(v);
});

// Simulationen mit Zeichentafel (binden gemeinsam/tafel/ ein) – für die Übersicht beim Start
function mitTafel() {
  const ordner = path.join(ROOT, 'simulationen');
  const liste = [];
  for (const name of fs.readdirSync(ordner).sort()) {
    const js = path.join(ordner, name, 'js');
    if (!fs.existsSync(js)) continue;
    const dateien = fs.readdirSync(js).filter(d => d.endsWith('.js'));
    if (dateien.some(d => fs.readFileSync(path.join(js, d), 'utf8').includes('gemeinsam/tafel/'))) liste.push(name);
  }
  return liste;
}

server.listen(PORT, '0.0.0.0', () => {
  const adressen = lanAdressen();
  console.log('\nAbgabe-Server läuft\n');
  console.log(`  Website:  http://localhost:${PORT}/`);
  console.log('  Lehrerseite (QR-Code für die Schüler steht dann dort):');
  for (const name of mitTafel()) console.log(`            http://localhost:${PORT}/lehrer/${name}`);
  console.log('  Im WLAN:  ' + (adressen.length ? adressen.map(a => `http://${a}:${PORT}/`).join('\n            ')
    : '(keine Netzwerkverbindung gefunden)'));
  console.log(`  PIN:      ${PIN ?? 'aus (einschalten mit PIN=… npm start)'}`);
  console.log('  three.js: ' + (offline() ? 'Offline-Kopie aus server/offline' : 'aus dem Internet (CDN)'));
  console.log('\nBeenden mit Strg+C – alle Abgaben werden dabei gelöscht.\n');
});
server.on('error', fehler => {
  console.error(fehler.code === 'EADDRINUSE'
    ? `Port ${PORT} ist schon belegt. Anderen Port wählen, z. B.: PORT=8090 npm start`
    : fehler.message);
  process.exit(1);
});

function beenden() {
  for (const v of verbindungen) v.schliessen(1001);
  server.close();
  process.exit(0);
}
process.on('SIGINT', beenden);
process.on('SIGTERM', beenden);
