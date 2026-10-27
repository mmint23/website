// ------------------------------------------------------------------
// Abgabe im Unterricht (nur wenn die Seite vom Abgabe-Server auf dem Lehrer-Laptop kommt, siehe server/)
// Wird von initTafel() in index.js mit eingerichtet; die Simulation muss dafür nichts weiter tun.
//
// Schüler:  „Teilen“ schickt die eigene Tafelzeichnung als Vektordaten an den Server; erneutes Teilen ersetzt
//           die vorige Abgabe dieses Geräts. Nur mit Raumcode in der Adresse (?raum=…, steht im QR-Code).
// Lehrer:   ?lehrer (PIN nur, wenn der Server mit PIN gestartet wurde) – erzeugt einen zufälligen Raumcode und zeigt alle Abgaben dieses Raums live (WebSocket)
//           mit QR-Code für die Schüler. Eine Abgabe öffnet sich auf der Tafel als Arbeitskopie: Ergänzen und
//           Radieren bleiben nur hier, das Original auf dem Server bleibt unverändert („Original wiederherstellen“).
// Jede Simulation hat eigene Räume (Kennung aus initTafel), damit Abgaben nicht auf dem falschen Bild landen.
// Ohne Server (GitHub Pages, lokaler Testserver) bleibt das alles ausgeblendet.
// Nachrichten über den WebSocket: siehe Beschreibung in server/server.js.
// ------------------------------------------------------------------
import { packen, entpacken, zeichneAlle, GRENZEN } from './striche.js';
import {
  tafelId, tafelHoehe, seitenBild, stricheDerSeite, aufSeitenwechsel, eigenesDokument, aktuellesDokument, zeigeDokument,
  dokumentGeaendert, aufAenderung, oeffneTafel, schliesseTafel, mitRueckfrage,
} from './tafel.js';
import { TAFEL_BREITE } from './striche.js';
import { setLinkUrl, qrSvg, showLink } from '../link.js';

const $ = id => document.getElementById(id);
const parameter = new URLSearchParams(location.search);
let raum = (parameter.get('raum') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
let basis = null;          // Adresse des Abgabe-Servers (= Herkunft der Seite), z. B. 'http://192.168.2.51:8080'
let pinNoetig = false;     // verlangt der Server eine Lehrer-PIN?

function speicher(schluessel, wert) {
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

async function anfrage(weg, optionen = {}) {
  const antwort = await fetch(basis + weg, {
    cache: 'no-store',
    ...optionen,
    headers: optionen.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw Object.assign(new Error(daten.fehler ?? 'Fehler ' + antwort.status), { status: antwort.status });
  return daten;
}

// Läuft die Seite über den Abgabe-Server? (GitHub Pages ist HTTPS und hat keinen – dann gar nicht erst fragen)
async function serverFinden() {
  if (location.protocol !== 'http:') return null;
  try {
    const antwort = await fetch(location.origin + '/api/status', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const status = await antwort.json();
    if (status.server !== 'mmint-abgabe') return null;
    pinNoetig = Boolean(status.pin);
    return location.origin;
  } catch {
    return null;
  }
}

// WebSocket zum Server, der sich nach einer Unterbrechung (WLAN weg, Laptop zugeklappt) selbst neu verbindet
class Leitung {
  constructor(hallo, beiNachricht, beiStatus = () => {}) {
    Object.assign(this, { hallo, beiNachricht, beiStatus, ws: null, warten: 1000, aus: false });
    this.verbinden();
  }

  verbinden() {
    const ws = new WebSocket(basis.replace(/^http/, 'ws') + '/ws');
    this.ws = ws;
    ws.onopen = () => {
      this.warten = 1000;
      ws.send(JSON.stringify(this.hallo));
      this.beiStatus(true);
    };
    ws.onmessage = event => this.beiNachricht(JSON.parse(event.data));
    ws.onclose = event => {
      this.beiStatus(false);
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

export async function initAbgabe() {
  basis = await serverFinden();
  if (!basis) return;
  fensterAnlegen();
  if (parameter.has('lehrer')) {
    lehrerRaum();
    if (!pinNoetig || sitzung(tokenSchluessel())) starteLehrer(); else zeigePinDialog();
  } else if (raum) {
    starteSchueler();
  }
}

// Adresse für die Schüler (bzw. mit lehrer = true für die Lehrerseite auf einem zweiten Gerät, gleicher Raum):
// ist die Seite am Laptop selbst geöffnet (localhost), dessen Adresse im WLAN – jeweils mit Raumcode
function schuelerUrl(adressen = [], port = 0, lehrer = false) {
  const amLaptop = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const url = (amLaptop && adressen.length ? `http://${adressen[0]}:${port}` : location.origin) + location.pathname;
  return url + (lehrer ? '?lehrer&raum=' : '?raum=') + raum;
}

// ================= Schüler

function geraeteId() {
  let id = speicher('abgabe-geraet');
  if (!id || !/^[a-z0-9]{8,40}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, '0')).join('');
    speicher('abgabe-geraet', id);
  }
  return id;
}

function starteSchueler() {
  setLinkUrl(schuelerUrl());
  $('tafelSchueler').hidden = false;
  const name = $('tafelName');
  name.maxLength = GRENZEN.NAME;
  name.value = speicher('abgabe-name') ?? '';
  name.addEventListener('change', () => speicher('abgabe-name', name.value.trim()));
  const knopf = $('tafelTeilen');
  const meldung = $('tafelTeilenStatus');
  let zeit = null, wartet = null;
  const melde = (text, ok) => {
    clearTimeout(zeit);
    clearTimeout(wartet);
    knopf.disabled = false;
    meldung.textContent = text;
    meldung.classList.toggle('ok', ok);
    zeit = setTimeout(() => { meldung.textContent = ''; }, ok ? 4000 : 8000);
  };
  const leitung = new Leitung({ typ: 'hallo', rolle: 'schueler', sim: tafelId(), raum, geraet: geraeteId() }, nachricht => {
    if (nachricht.typ === 'geteilt') melde('Geteilt ✓', true);
    if (nachricht.typ === 'fehler') melde(nachricht.text, false);
  });
  const KEINE_VERBINDUNG = 'Keine Verbindung zum Lehrer-Laptop – bitte gleich noch einmal versuchen.';
  knopf.addEventListener('click', () => {
    const gesendet = leitung.senden({ typ: 'abgabe', name: name.value.trim(), striche: packen(eigenesDokument.striche) });
    if (!gesendet) return melde(KEINE_VERBINDUNG, false);
    knopf.disabled = true;
    wartet = setTimeout(() => melde(KEINE_VERBINDUNG, false), 8000);
  });
}

// ================= Lehrer

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
  $('pinOverlay').hidden = false;
  $('pinFehler').textContent = meldung;
  $('pinInput').value = '';
  $('pinInput').focus();
}

async function pinAbschicken(event) {
  event.preventDefault();
  try {
    const { token } = await anfrage('/api/login', { method: 'POST', body: JSON.stringify({ pin: $('pinInput').value.trim() }) });
    sitzung(tokenSchluessel(), token);
    $('pinOverlay').hidden = true;
    starteLehrer();
  } catch (fehler) {
    zeigePinDialog(fehler.message);
  }
}

// Abgaben: id → { abgabe (Original vom Server), arbeit (Arbeitskopie oder null), kachel }
const abgaben = new Map();
let gestartet = false;

async function starteLehrer() {
  if (gestartet) return verbinden();
  gestartet = true;
  document.body.classList.add('lehrer');
  $('abgaben').hidden = false;
  $('tafelLehrer').hidden = false;
  eigeneKachel();
  zeigeTitel();

  $('abgabenRaum').textContent = 'Raumcode: ' + raum;
  $('abgabenQr').addEventListener('click', () => showLink());
  // Lehrerseite auf dem iPad o. Ä.: nur auf Knopfdruck, damit die Schüler den Code am Beamer nicht mitscannen
  $('abgabenLehrerQr').addEventListener('click', () => showLink(schuelerUrl(netz.adressen, netz.port, true),
    'Lehrerseite – nur für die Lehrkraft. Mit einem eigenen Gerät (z. B. iPad) scannen'
    + (pinNoetig ? ', dort die PIN eingeben' : '') + '; das Gerät kommt in denselben Raum.'));
  $('abgabenGross').addEventListener('click', () => {
    const gross = $('abgaben').classList.toggle('gross');
    $('abgabenGross').textContent = gross ? 'Verkleinern' : 'Groß';
  });
  mitRueckfrage($('abgabenAlleLoeschen'), 'Wirklich alle?', () => {
    leitung.senden({ typ: 'alle-loeschen' });
  });
  $('tafelOriginal').addEventListener('click', () => {
    const eintrag = offenerEintrag();
    if (!eintrag) return;
    Object.assign(eintrag.arbeit, { striche: entpacken(eintrag.abgabe.striche), verlauf: [], bearbeitet: false, neuer: false });
    dokumentGeaendert();
    zeigeTitel();
    kachelZeichnen(eintrag);
  });
  mitRueckfrage($('tafelAbgabeLoeschen'), 'Wirklich löschen?', () => {
    const eintrag = offenerEintrag();
    if (!eintrag) return;
    leitung.senden({ typ: 'loeschen', id: eintrag.abgabe.id });
  });
  // Tafel mit mehreren Seiten: Vorschaubilder zeigen die Seite, die gerade auf der Tafel gewählt ist
  aufSeitenwechsel(() => {
    vorschau(eigene, []);
    for (const eintrag of abgaben.values()) kachelZeichnen(eintrag);
  });
  aufAenderung(dok => {
    const eintrag = offenerEintrag();
    if (eintrag && eintrag.arbeit === dok) {
      zeigeTitel();
      kachelZeichnen(eintrag);
    }
  });
  verbinden();
}

let leitung = null;
function verbinden() {
  if (leitung) leitung.aus = true;
  leitung = new Leitung({ typ: 'hallo', rolle: 'lehrer', sim: tafelId(), raum, token: sitzung(tokenSchluessel()) }, nachricht => {
    if (nachricht.typ === 'willkommen') adresseZeigen(nachricht);
    if (nachricht.typ === 'liste') {
      const ids = new Set(nachricht.abgaben.map(a => a.id));
      for (const id of [...abgaben.keys()]) if (!ids.has(id)) entfernen(id);
      for (const abgabe of nachricht.abgaben) eintragen(abgabe, false);
    }
    if (nachricht.typ === 'abgabe') eintragen(nachricht.abgabe, true);
    if (nachricht.typ === 'geloescht') entfernen(nachricht.id);
    if (nachricht.typ === 'geleert') for (const id of [...abgaben.keys()]) entfernen(id);
    if (nachricht.typ === 'online') $('abgabenOnline').textContent = `${nachricht.anzahl} Gerät${nachricht.anzahl === 1 ? '' : 'e'} verbunden`;
    // Anmeldung abgelaufen oder Server neu gestartet → PIN erneut abfragen
    if (nachricht.typ === 'fehler' && nachricht.code === 'pin') {
      sitzung(tokenSchluessel(), null);
      zeigePinDialog('Anmeldung abgelaufen oder Server neu gestartet – bitte PIN erneut eingeben.');
    }
    if (nachricht.typ === 'fehler' && nachricht.code !== 'pin') $('abgabenOnline').textContent = nachricht.text;
  }, offen => {
    if (!offen) $('abgabenOnline').textContent = 'Verbindung zum Server unterbrochen …';
  });
}

// Adresse und QR-Code für die Schüler
let adresseGezeigt = false;
const netz = { adressen: [], port: 0 };   // Adressen des Laptops im WLAN
async function adresseZeigen({ adressen, port }) {
  Object.assign(netz, { adressen, port });
  if (adresseGezeigt) return;
  adresseGezeigt = true;
  const url = schuelerUrl(adressen, port);
  setLinkUrl(url);
  $('abgabenAdresse').textContent = url.replace(/^http:\/\//, '');
  $('abgabenAdresse').title = adressen.length > 1
    ? 'Weitere Adressen des Laptops: ' + adressen.slice(1).map(a => `${a}:${port}`).join(', ') : '';
  try {
    $('abgabenQrBild').innerHTML = await qrSvg(url);
  } catch {
    $('abgabenQrBild').textContent = 'QR-Code nicht verfügbar';
  }
}

const offenerEintrag = () => [...abgaben.values()].find(e => e.arbeit && e.arbeit === aktuellesDokument());

function zeigeTitel() {
  const eintrag = offenerEintrag();
  $('tafelOriginal').hidden = $('tafelAbgabeLoeschen').hidden = !eintrag;
  if (!eintrag) {
    $('tafelTitel').textContent = 'Eigene Tafel';
    return;
  }
  const name = eintrag.abgabe.name || 'ohne Namen';
  $('tafelTitel').textContent = 'Abgabe: ' + name + (eintrag.arbeit.bearbeitet ? ' (bearbeitet)' : '')
    + (eintrag.neuer ? ' – neue Version eingegangen' : '');
  for (const e of abgaben.values()) e.kachel.classList.toggle('offen', e === eintrag);
}

// Neue oder ersetzte Abgabe
function eintragen(abgabe, neu) {
  let eintrag = abgaben.get(abgabe.id);
  if (!eintrag) {
    eintrag = { abgabe, arbeit: null, kachel: neueKachel() };
    eintrag.kachel.addEventListener('click', () => oeffnen(eintrag));
    abgaben.set(abgabe.id, eintrag);
    $('abgabenListe').append(eintrag.kachel);
  }
  eintrag.abgabe = abgabe;
  // Arbeitskopie: unbearbeitet → neue Version übernehmen; bearbeitet → Hinweis, „Original wiederherstellen“ lädt sie
  if (eintrag.arbeit) {
    if (eintrag.arbeit.bearbeitet) {
      eintrag.neuer = true;
    } else {
      Object.assign(eintrag.arbeit, { striche: entpacken(abgabe.striche), verlauf: [] });
      if (eintrag.arbeit === aktuellesDokument()) dokumentGeaendert();
    }
  }
  eintrag.kachel.querySelector('.kachel-name').textContent = abgabe.name || 'ohne Namen';
  kachelZeichnen(eintrag);
  if (neu) {
    eintrag.kachel.classList.remove('neu');
    void eintrag.kachel.offsetWidth;   // Animation neu starten
    eintrag.kachel.classList.add('neu');
  }
  zaehlen();
  zeigeTitel();
}

function entfernen(id) {
  const eintrag = abgaben.get(id);
  if (!eintrag) return;
  abgaben.delete(id);
  eintrag.kachel.remove();
  if (eintrag.arbeit && eintrag.arbeit === aktuellesDokument()) {
    zeigeDokument(eigenesDokument);
    schliesseTafel();
  }
  zaehlen();
  zeigeTitel();
}

function oeffnen(eintrag) {
  eintrag.arbeit ??= { striche: entpacken(eintrag.abgabe.striche), verlauf: [], bearbeitet: false };
  zeigeDokument(eintrag.arbeit);
  zeigeTitel();
  oeffneTafel();
}

const zaehlen = () => { $('abgabenZahl').textContent = abgaben.size; };

// ---------------- Kacheln (Vorschaubilder)

function neueKachel(text = '') {
  const kachel = document.createElement('button');
  kachel.type = 'button';
  kachel.className = 'kachel';
  kachel.innerHTML = '<canvas></canvas><span class="kachel-name"></span><span class="kachel-marke">bearbeitet</span>';
  kachel.querySelector('.kachel-name').textContent = text;
  return kachel;
}

let eigene = null;   // Kachel „Eigene Tafel“
function eigeneKachel() {
  const kachel = eigene = neueKachel('Eigene Tafel');
  kachel.classList.add('eigen');
  kachel.addEventListener('click', () => {
    zeigeDokument(eigenesDokument);
    zeigeTitel();
    for (const e of abgaben.values()) e.kachel.classList.remove('offen');
    oeffneTafel();
  });
  $('abgabenListe').append(kachel);
  vorschau(kachel, []);
}

// Vorschau zeigt immer das Original; ist die Arbeitskopie bearbeitet, steht „bearbeitet“ daran
function kachelZeichnen(eintrag) {
  eintrag.kachel.classList.toggle('bearbeitet', Boolean(eintrag.arbeit?.bearbeitet));
  vorschau(eintrag.kachel, entpacken(eintrag.abgabe.striche));
}

// Vorschau der gewählten Seite (wartet, bis ihr Bild geladen ist)
async function vorschau(kachel, striche) {
  const bild = seitenBild();
  await bild.geladen;
  if (bild !== seitenBild()) return;   // inzwischen umgeschaltet
  const canvas = kachel.querySelector('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 240 * dpr;
  canvas.height = Math.round(240 * dpr * tafelHoehe() / TAFEL_BREITE);
  const ctx = canvas.getContext('2d');
  if (bild.naturalWidth) ctx.drawImage(bild, 0, 0, canvas.width, canvas.height);
  zeichneAlle(ctx, stricheDerSeite(striche), canvas.width, 2.5);   // Striche dicker, damit man sie im kleinen Bild erkennt
}

// ---------------- Fenster der Lehrerseite (nur angelegt, wenn die Seite vom Abgabe-Server kommt)

function fensterAnlegen() {
  document.body.insertAdjacentHTML('beforeend', `
  <div id="pinOverlay" hidden>
    <form class="pin-box" id="pinForm" aria-label="Anmeldung Lehrerseite">
      <h2>Lehrerseite</h2>
      <p class="status">PIN eingeben (steht in der Konsole des Servers).</p>
      <input id="pinInput" type="password" inputmode="numeric" autocomplete="off" aria-label="PIN" />
      <p class="status pin-fehler" id="pinFehler" aria-live="polite"></p>
      <button type="submit">Anmelden</button>
    </form>
  </div>
  <section class="abgaben" id="abgaben" aria-label="Abgaben der Schüler" hidden>
    <div class="abgaben-kopf">
      <button class="abgaben-qr" id="abgabenQr" type="button" title="QR-Code groß zeigen"><span id="abgabenQrBild"></span></button>
      <div class="abgaben-info">
        <strong>Abgaben: <span id="abgabenZahl">0</span></strong>
        <span class="status" id="abgabenRaum"></span>
        <span class="status" id="abgabenOnline"></span>
        <span class="status abgaben-adresse" id="abgabenAdresse"></span>
      </div>
      <button id="abgabenLehrerQr" type="button">Lehrerseite auf anderem Gerät</button>
      <button id="abgabenGross" type="button">Groß</button>
      <button id="abgabenAlleLoeschen" class="gefahr" type="button">Alle löschen</button>
    </div>
    <div class="abgaben-liste" id="abgabenListe"></div>
  </section>`);
  $('pinForm').addEventListener('submit', pinAbschicken);
}
