// ------------------------------------------------------------------
// Verbindung zum Abgabe-Server auf dem Lehrer-Laptop (website/server/): Server erkennen, Raum, Anmeldung der
// Lehrerseite (PIN, nur wenn der Server mit PIN gestartet wurde) und genau eine WebSocket-Leitung je Seite.
// Genutzt von der Abgabe (tafel/abgabe.js) und der Live-Steuerung (live/live.js).
//
// Rolle der Seite: Lehrerseite mit ?lehrer, Schülergerät mit ?raum=… (steht im QR-Code), sonst keine Verbindung.
// Ohne Server (GitHub Pages, lokaler Testserver) gibt es keine Rolle – die Bausteine bleiben dann unsichtbar.
// Nachrichten über den WebSocket: siehe Beschreibung in server/server.js.
// ------------------------------------------------------------------
import { stilLaden } from './stil.js';

const $ = id => document.getElementById(id);
const parameter = new URLSearchParams(location.search);
export let raum = (parameter.get('raum') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
export const netz = { adressen: [], port: 0, pinNoetig: false };   // Adressen des Laptops im WLAN

let basis = null;          // Adresse des Abgabe-Servers (= Herkunft der Seite), z. B. 'http://192.168.2.51:8080'
let sim = null;            // Kennung der Simulation (Räume sind je Simulation getrennt)
let leitung = null;

export function speicher(schluessel, wert) {
  try {
    if (wert === undefined) return localStorage.getItem(schluessel);
    localStorage.setItem(schluessel, wert);
  } catch { /* privates Fenster o. Ä. */ }
  return null;
}

function sitzung(schluessel, wert) {
  try {
    if (wert === undefined) return sessionStorage.getItem(schluessel);
    if (wert === null) sessionStorage.removeItem(schluessel); else sessionStorage.setItem(schluessel, wert);
  } catch { /* privates Fenster o. Ä. */ }
  return null;
}

// ---------------- Nachrichten

const zuhoerer = new Map();      // typ → [Rückrufe]
const statusZuhoerer = [];
const halloZusatz = {};          // Angaben, die Bausteine der Begrüßung mitgeben (z. B. Code der Live-Steuerung)

export function aufNachricht(typ, rueckruf) {
  if (!zuhoerer.has(typ)) zuhoerer.set(typ, []);
  zuhoerer.get(typ).push(rueckruf);
}
// offen: true, sobald die Leitung (wieder) steht; false bei einer Unterbrechung
export const aufStatus = rueckruf => statusZuhoerer.push(rueckruf);
// Muss vor verbindungStarten() bzw. im selben Durchlauf aufgerufen werden
export const halloErgaenzen = angaben => Object.assign(halloZusatz, angaben);
export const senden = nachricht => leitung?.senden(nachricht) ?? false;

function verteilen(nachricht) {
  if (nachricht.typ === 'willkommen') Object.assign(netz, { adressen: nachricht.adressen, port: nachricht.port });
  // Anmeldung abgelaufen oder Server neu gestartet → PIN erneut abfragen
  if (nachricht.typ === 'fehler' && nachricht.code === 'pin') {
    sitzung(tokenSchluessel(), null);
    zeigePinDialog('Anmeldung abgelaufen oder Server neu gestartet – bitte PIN erneut eingeben.');
    return;
  }
  for (const rueckruf of zuhoerer.get(nachricht.typ) ?? []) rueckruf(nachricht);
}

// WebSocket zum Server, der sich nach einer Unterbrechung (WLAN weg, Laptop zugeklappt) selbst neu verbindet;
// die Begrüßung wird bei jedem Verbinden neu gebaut
class Leitung {
  constructor(hallo) {
    Object.assign(this, { hallo, ws: null, warten: 1000, aus: false });
    this.verbinden();
  }

  verbinden() {
    const ws = new WebSocket(basis.replace(/^http/, 'ws') + '/ws');
    this.ws = ws;
    ws.onopen = () => {
      this.warten = 1000;
      ws.send(JSON.stringify(this.hallo()));
      for (const rueckruf of statusZuhoerer) rueckruf(true);
    };
    ws.onmessage = event => verteilen(JSON.parse(event.data));
    ws.onclose = event => {
      for (const rueckruf of statusZuhoerer) rueckruf(false);
      if (this.aus || event.code === 4001) return;   // 4001: PIN fehlt
      setTimeout(() => this.verbinden(), this.warten);
      this.warten = Math.min(this.warten * 2, 10_000);
    };
  }

  get offen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  senden(nachricht) {
    if (!this.offen) return false;
    this.ws.send(JSON.stringify(nachricht));
    return true;
  }
}

// ---------------- Start

// Läuft die Seite über den Abgabe-Server? (GitHub Pages ist HTTPS und hat keinen – dann gar nicht erst fragen)
async function serverFinden() {
  if (location.protocol !== 'http:') return null;
  try {
    const antwort = await fetch(location.origin + '/api/status', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const status = await antwort.json();
    if (status.server !== 'mmint-abgabe') return null;
    netz.pinNoetig = Boolean(status.pin);
    return location.origin;
  } catch {
    return null;
  }
}

export function geraeteId() {
  let id = speicher('abgabe-geraet');
  if (!id || !/^[a-z0-9]{8,40}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, '0')).join('');
    speicher('abgabe-geraet', id);
  }
  return id;
}

let start = null;

// Verbindung aufbauen (einmal je Seite; weitere Aufrufe bekommen dasselbe Ergebnis). kennung: Kennung der
// Simulation. Ergebnis: 'lehrer', 'schueler' oder null (kein Server bzw. keine Rolle). Die Lehrerseite fragt
// danach ggf. noch die PIN ab; Nachrichten kommen, sobald die Leitung steht.
export function verbindungStarten(kennung) {
  sim ??= kennung;
  start ??= (async () => {
    basis = await serverFinden();
    if (!basis) return null;
    if (parameter.has('lehrer')) {
      lehrerRaum();
      document.body.classList.add('lehrer');
      if (!netz.pinNoetig || sitzung(tokenSchluessel())) lehrerVerbinden(); else zeigePinDialog();
      return 'lehrer';
    }
    if (!raum) return null;
    leitung = new Leitung(() => ({ typ: 'hallo', rolle: 'schueler', sim, raum, geraet: geraeteId(), ...halloZusatz }));
    return 'schueler';
  })();
  return start;
}

function lehrerVerbinden() {
  if (leitung) leitung.aus = true;
  leitung = new Leitung(() => ({ typ: 'hallo', rolle: 'lehrer', sim, raum, token: sitzung(tokenSchluessel()), ...halloZusatz }));
}

// Adresse dieser Simulation für ein anderes Gerät, mit Raumcode und weiteren Angaben (z. B. { lehrer: '' }):
// ist die Seite am Laptop selbst geöffnet (localhost), dessen Adresse im WLAN
export function adresseFuer(angaben = {}) {
  const amLaptop = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const url = new URL((amLaptop && netz.adressen.length ? `http://${netz.adressen[0]}:${netz.port}` : location.origin) + location.pathname);
  for (const [name, wert] of Object.entries(angaben)) url.searchParams.set(name, wert);
  url.searchParams.set('raum', raum);
  return url.toString().replace(/=(?=&|$)/g, '');   // leere Angaben ohne „=“ (z. B. ?lehrer&raum=…)
}

// ---------------- Lehrerseite: Raum und PIN

// Raumcode: aus der Adresse oder neu und zufällig (4 Zeichen ohne verwechselbare wie l/1, o/0); er wird in die
// Adresse geschrieben, damit Neuladen im selben Raum bleibt
function lehrerRaum() {
  if (!/^[a-z0-9-]{3,20}$/.test(raum)) {
    const zeichen = 'abcdefghjkmnpqrstuvwxyz23456789';
    raum = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => zeichen[b % zeichen.length]).join('');
  }
  const url = new URL(location.href);
  url.searchParams.set('raum', raum);
  history.replaceState(null, '', url);
}

const tokenSchluessel = () => 'abgabe-lehrer|' + basis;

function zeigePinDialog(meldung = '') {
  if (!$('pinOverlay')) {
    stilLaden(new URL('./verbindung.css', import.meta.url));
    document.body.insertAdjacentHTML('beforeend', `
    <div id="pinOverlay" hidden>
      <form class="pin-box" id="pinForm" aria-label="Anmeldung Lehrerseite">
        <h2>Lehrerseite</h2>
        <p class="status">PIN eingeben (steht in der Konsole des Servers).</p>
        <input id="pinInput" type="password" inputmode="numeric" autocomplete="off" aria-label="PIN" />
        <p class="status pin-fehler" id="pinFehler" aria-live="polite"></p>
        <button type="submit">Anmelden</button>
      </form>
    </div>`);
    $('pinForm').addEventListener('submit', pinAbschicken);
  }
  $('pinOverlay').hidden = false;
  $('pinFehler').textContent = meldung;
  $('pinInput').value = '';
  $('pinInput').focus();
}

async function pinAbschicken(event) {
  event.preventDefault();
  try {
    const antwort = await fetch(basis + '/api/login', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: $('pinInput').value.trim() }),
    });
    const daten = await antwort.json().catch(() => ({}));
    if (!antwort.ok) throw new Error(daten.fehler ?? 'Fehler ' + antwort.status);
    sitzung(tokenSchluessel(), daten.token);
    $('pinOverlay').hidden = true;
    lehrerVerbinden();
  } catch (fehler) {
    zeigePinDialog(fehler.message);
  }
}
