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
// Ohne Server (GitHub Pages, lokaler Testserver) bleibt das alles ausgeblendet. Verbindung, Raum und PIN:
// ../verbindung.js; Nachrichten über den WebSocket: siehe Beschreibung in server/server.js.
// ------------------------------------------------------------------
import { packen, entpacken, zeichneAlle, GRENZEN, TAFEL_BREITE } from './striche.js';
import {
  tafelId, tafelHoehe, tafelBild, bildGeladen, eigenesDokument, aktuellesDokument, zeigeDokument, dokumentGeaendert,
  aufAenderung, oeffneTafel, schliesseTafel, mitRueckfrage,
} from './tafel.js';
import { setLinkUrl, qrSvg, showLink } from '../link.js';
import {
  verbindungStarten, aufNachricht, aufStatus, senden, adresseFuer, netz, raum, speicher,
} from '../verbindung.js';

const $ = id => document.getElementById(id);

export async function initAbgabe() {
  const rolle = await verbindungStarten(tafelId());
  if (!rolle) return;
  fensterAnlegen();
  if (rolle === 'lehrer') starteLehrer(); else starteSchueler();
}

// ================= Schüler

function starteSchueler() {
  setLinkUrl(adresseFuer());
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
  aufNachricht('geteilt', () => melde('Geteilt ✓', true));
  aufNachricht('fehler', nachricht => { if (!nachricht.code) melde(nachricht.text, false); });
  const KEINE_VERBINDUNG = 'Keine Verbindung zum Lehrer-Laptop – bitte gleich noch einmal versuchen.';
  knopf.addEventListener('click', () => {
    const gesendet = senden({ typ: 'abgabe', name: name.value.trim(), striche: packen(eigenesDokument.striche) });
    if (!gesendet) return melde(KEINE_VERBINDUNG, false);
    knopf.disabled = true;
    wartet = setTimeout(() => melde(KEINE_VERBINDUNG, false), 8000);
  });
}

// ================= Lehrer

// Abgaben: id → { abgabe (Original vom Server), arbeit (Arbeitskopie oder null), kachel }
const abgaben = new Map();

function starteLehrer() {
  $('abgaben').hidden = false;
  $('tafelLehrer').hidden = false;
  eigeneKachel();
  zeigeTitel();

  $('abgabenRaum').textContent = 'Raumcode: ' + raum;
  $('abgabenQr').addEventListener('click', () => showLink());
  // Lehrerseite auf dem iPad o. Ä.: nur auf Knopfdruck, damit die Schüler den Code am Beamer nicht mitscannen
  $('abgabenLehrerQr').addEventListener('click', () => showLink(adresseFuer({ lehrer: '' }),
    'Lehrerseite – nur für die Lehrkraft. Mit einem eigenen Gerät (z. B. iPad) scannen'
    + (netz.pinNoetig ? ', dort die PIN eingeben' : '') + '; das Gerät kommt in denselben Raum.'));
  $('abgabenGross').addEventListener('click', () => {
    const gross = $('abgaben').classList.toggle('gross');
    $('abgabenGross').textContent = gross ? 'Verkleinern' : 'Groß';
  });
  mitRueckfrage($('abgabenAlleLoeschen'), 'Wirklich alle?', () => {
    senden({ typ: 'alle-loeschen' });
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
    senden({ typ: 'loeschen', id: eintrag.abgabe.id });
  });
  aufAenderung(dok => {
    const eintrag = offenerEintrag();
    if (eintrag && eintrag.arbeit === dok) {
      zeigeTitel();
      kachelZeichnen(eintrag);
    }
  });
  aufNachricht('willkommen', adresseZeigen);
  aufNachricht('liste', nachricht => {
    const ids = new Set(nachricht.abgaben.map(a => a.id));
    for (const id of [...abgaben.keys()]) if (!ids.has(id)) entfernen(id);
    for (const abgabe of nachricht.abgaben) eintragen(abgabe, false);
  });
  aufNachricht('abgabe', nachricht => eintragen(nachricht.abgabe, true));
  aufNachricht('geloescht', nachricht => entfernen(nachricht.id));
  aufNachricht('geleert', () => { for (const id of [...abgaben.keys()]) entfernen(id); });
  aufNachricht('online', ({ anzahl }) => { $('abgabenOnline').textContent = `${anzahl} Gerät${anzahl === 1 ? '' : 'e'} verbunden`; });
  aufNachricht('fehler', nachricht => { $('abgabenOnline').textContent = nachricht.text; });
  aufStatus(offen => { if (!offen) $('abgabenOnline').textContent = 'Verbindung zum Server unterbrochen …'; });
}

// Adresse und QR-Code für die Schüler
let adresseGezeigt = false;
async function adresseZeigen() {
  if (adresseGezeigt) return;
  adresseGezeigt = true;
  const url = adresseFuer();
  const { adressen, port } = netz;
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

function eigeneKachel() {
  const kachel = neueKachel('Eigene Tafel');
  kachel.classList.add('eigen');
  kachel.addEventListener('click', () => {
    zeigeDokument(eigenesDokument);
    zeigeTitel();
    for (const e of abgaben.values()) e.kachel.classList.remove('offen');
    oeffneTafel();
  });
  $('abgabenListe').append(kachel);
  bildGeladen.then(() => vorschau(kachel, []));
}

// Vorschau zeigt immer das Original; ist die Arbeitskopie bearbeitet, steht „bearbeitet“ daran
function kachelZeichnen(eintrag) {
  eintrag.kachel.classList.toggle('bearbeitet', Boolean(eintrag.arbeit?.bearbeitet));
  bildGeladen.then(() => vorschau(eintrag.kachel, entpacken(eintrag.abgabe.striche)));
}

function vorschau(kachel, striche) {
  const canvas = kachel.querySelector('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 240 * dpr;
  canvas.height = Math.round(240 * dpr * tafelHoehe() / TAFEL_BREITE);
  const ctx = canvas.getContext('2d');
  if (tafelBild.naturalWidth) ctx.drawImage(tafelBild, 0, 0, canvas.width, canvas.height);
  zeichneAlle(ctx, striche, canvas.width, 2.5);   // Striche dicker, damit man sie im kleinen Bild erkennt
}

// ---------------- Fenster der Lehrerseite (nur angelegt, wenn die Seite vom Abgabe-Server kommt)

function fensterAnlegen() {
  document.body.insertAdjacentHTML('beforeend', `
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
}
