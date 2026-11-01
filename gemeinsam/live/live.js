// ------------------------------------------------------------------
// Live-Steuerung: Ein Schülergerät steuert die Simulation am Beamer (Lehrerseite). Nur über den Abgabe-Server
// auf dem Lehrer-Laptop (website/server/); ohne Server bleibt alles unsichtbar. Anleitung: README.md.
//
// Ablauf: Lehrerseite „Steuerung abgeben“ → QR-Code mit Einmal-Code → das Schülergerät scannt, übernimmt den
// aktuellen Stand und sieht mit; die Lehrkraft steuert weiter, bis sie „Schüler steuert“ wählt. Mit „Schüler steuert“ / „Ich steuere“ wird hin- und hergeschaltet; das
// Schülergerät bleibt verbunden, bis die Lehrkraft trennt oder einen neuen QR-Code erzeugt.
// Gespiegelt wird der Zustand der Simulation (nicht die Eingaben): Das Gerät, das steuert, rechnet und schickt
// seinen Zustand etwa 30-mal pro Sekunde mit der Zeit des Bilds; das andere rechnet nicht selbst, ist gesperrt und
// zeigt den Zustand leicht verzögert und geglättet an (glaetten.js), damit ungleichmäßige Ankunft nicht ruckelt.
// ------------------------------------------------------------------
import { verbindungStarten, aufNachricht, aufStatus, senden, halloErgaenzen, adresseFuer, netz, speicher } from '../verbindung.js';
import { Glaetter } from './glaetten.js';
import { showLink, hideLink } from '../link.js';
import { stilLaden } from '../stil.js';

const $ = id => document.getElementById(id);
const TAKT = 33;   // ms zwischen zwei gesendeten Zuständen

const parameter = new URLSearchParams(location.search);
const code = parameter.get('steuern');   // Schülergerät: Code aus dem QR-Code

let optionen = null;
let glaetter = null;
let rolle = null;   // 'lehrer', 'schueler' (Gerät mit Code) oder null
// Stand laut Server: aktiv (es gibt einen gültigen Code), verbunden (Schülergerät da), quelle ('schueler' |
// 'lehrer' | null), ich (diese Lehrerseite steuert); beendet: Schülergerät, dessen Code nicht mehr gilt
const stand = { aktiv: false, verbunden: false, quelle: null, ich: false, beendet: false, offen: false };

// Zeigt dieses Gerät gerade nur an? Dann rechnet die Simulation nicht selbst und ist nicht bedienbar.
export function zuschauen() {
  if (rolle === 'lehrer') {
    return stand.aktiv && ((stand.quelle === 'schueler' && stand.verbunden) || (stand.quelle === 'lehrer' && !stand.ich));
  }
  if (rolle === 'schueler') return !stand.beendet && stand.quelle !== 'schueler';
  return false;
}

// Schickt dieses Gerät seinen Zustand? (Lehrerseite auch, solange noch niemand gescannt hat: Dann übernimmt das
// Schülergerät beim Verbinden genau den Stand am Beamer.)
function sendet() {
  if (!stand.offen) return false;
  if (rolle === 'lehrer') return stand.aktiv && stand.ich;
  if (rolle === 'schueler') return !stand.beendet && stand.quelle === 'schueler';
  return false;
}

// ---------------- Anzeige

let warZuschauen = false;
let warQuelle = null;
function anzeigen() {
  const zu = zuschauen();
  document.body.classList.toggle('live-zuschauen', zu);
  if (zu !== warZuschauen || stand.quelle !== warQuelle) glaetter.leeren();   // neue Quelle: andere Uhr
  warQuelle = stand.quelle;
  if (zu !== warZuschauen) {
    warZuschauen = zu;
    optionen.beiWechsel?.(zu);
  }
  const banner = $('liveBanner');
  if (rolle === 'schueler') {
    banner.hidden = false;
    banner.className = 'live-banner ' + (stand.beendet ? 'ende' : stand.quelle === 'schueler' ? 'du' : 'warte');
    banner.textContent = stand.beendet
      ? 'Die Live-Steuerung ist beendet. Du kannst die Simulation wieder selbst bedienen.'
      : !stand.offen ? 'Verbinde mit dem Lehrer-Laptop …'
        : stand.quelle === 'schueler' ? 'Du steuerst die Simulation am Beamer.'
          : 'Die Lehrkraft steuert gerade – du siehst mit.';
    return;
  }
  // Lehrerseite
  banner.hidden = !zu;
  banner.className = 'live-banner warte';
  banner.textContent = stand.quelle === 'schueler' ? 'Ein Schülergerät steuert die Simulation.' : 'Ein anderes Lehrergerät steuert.';
  // „Ich steuere“ auch im Hinweis: Er liegt über der Tafel, die beim Zuschauen die Abgabeleiste verdecken kann
  if (zu) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.textContent = 'Ich steuere';
    knopf.addEventListener('click', () => senden({ typ: 'live-umschalten', an: 'lehrer' }));
    banner.append(' ', knopf);
  }
  $('liveStatus').textContent = !stand.offen ? 'Keine Verbindung zum Server …'
    : !stand.aktiv ? 'Kein Schülergerät verbunden.'
      : !stand.verbunden ? 'Warte auf das Schülergerät (QR-Code scannen) …'
        : stand.quelle === 'schueler' ? 'Schülergerät verbunden.' : 'Schülergerät verbunden – abgeben mit „Schüler steuert“.';
  $('liveWahl').hidden = !stand.aktiv;
  $('liveTrennen').hidden = !stand.aktiv;
  for (const [id, an] of [['liveSchueler', stand.quelle === 'schueler'], ['liveIch', stand.quelle === 'lehrer' && stand.ich]]) {
    $(id).setAttribute('aria-pressed', String(an));
  }
  $('liveSchueler').disabled = !stand.verbunden;
}

function bannerAnlegen() {
  document.body.insertAdjacentHTML('beforeend', '<div class="live-banner" id="liveBanner" role="status" hidden></div>');
}

// Bedienfeld der Lehrerseite: als eigene Spalte in der Abgabeleiste (wenn es sie gibt), sonst als kleiner Kasten.
// Im Kasten zusätzlich „Lehrerseite auf anderem Gerät“ (in der Abgabeleiste gibt es den Knopf schon, abgabe.js).
function lehrerFeldAnlegen() {
  const html = `
    <div class="live-feld" id="liveFeld" aria-label="Live-Steuerung">
      <strong>Live-Steuerung</strong>
      <span class="status" id="liveStatus"></span>
      <div class="live-wahl" id="liveWahl" role="group" aria-label="Wer steuert?" hidden>
        <button id="liveSchueler" type="button" aria-pressed="false">Schüler steuert</button>
        <button id="liveIch" type="button" aria-pressed="false">Ich steuere</button>
      </div>
      <button id="liveAbgeben" type="button">Steuerung abgeben</button>
      <button id="liveTrennen" class="gefahr" type="button" hidden>Trennen</button>
      <button id="liveLehrerQr" class="live-lehrer-qr" type="button" hidden>Lehrerseite auf anderem Gerät</button>
    </div>`;
  const kopf = document.querySelector('#abgaben .abgaben-kopf');
  if (kopf) kopf.insertAdjacentHTML('afterend', html);
  else {
    document.body.insertAdjacentHTML('beforeend', `<div class="live-kasten" id="liveKasten">
      <button class="live-klein-btn" id="liveKlein" type="button" aria-controls="liveKasten">Minimieren ▾</button>${html}</div>`);
    // Minimieren: nur noch Überschrift und „Einblenden“ (gemerkt je Gerät); body.lehrerfeld-klein wie bei der
    // Abgabeleiste (tafel/abgabe.js), damit Simulationen ihren Platzhalter für den Kasten aufheben können
    const minimieren = klein => {
      $('liveKasten').classList.toggle('klein', klein);
      document.body.classList.toggle('lehrerfeld-klein', klein);
      $('liveKlein').textContent = klein ? 'Einblenden ▴' : 'Minimieren ▾';
      $('liveKlein').setAttribute('aria-expanded', String(!klein));
      speicher('live-klein', klein ? '1' : '0');
    };
    $('liveKlein').addEventListener('click', () => minimieren(!$('liveKasten').classList.contains('klein')));
    minimieren(speicher('live-klein') === '1');
    // Lehrerseite auf dem iPad o. Ä.: nur auf Knopfdruck, damit die Schüler den Code am Beamer nicht mitscannen
    $('liveLehrerQr').hidden = false;
    $('liveLehrerQr').addEventListener('click', () => showLink(adresseFuer({ lehrer: '' }),
      'Lehrerseite – nur für die Lehrkraft. Mit einem eigenen Gerät (z. B. iPad) scannen'
      + (netz.pinNoetig ? ', dort die PIN eingeben' : '') + '; das Gerät kommt in denselben Raum und kann mit „Ich steuere“ übernehmen.'));
  }
  $('liveAbgeben').addEventListener('click', () => senden({ typ: 'live-abgeben' }));
  $('liveSchueler').addEventListener('click', () => senden({ typ: 'live-umschalten', an: 'schueler' }));
  $('liveIch').addEventListener('click', () => senden({ typ: 'live-umschalten', an: 'lehrer' }));
  $('liveTrennen').addEventListener('click', () => senden({ typ: 'live-trennen' }));
  aufNachricht('live-code', nachricht => {
    showLink(adresseFuer({ ...optionen.steuernAngaben?.(), steuern: nachricht.code }),
      'Steuerung abgeben: mit dem Schülergerät scannen. Es sieht dann mit; mit „Schüler steuert“ übernimmt es die Simulation am Beamer.');
  });
}

// Gesperrte Bereiche beim Zuschauen (Elemente mit der Klasse live-frei darin bleiben bedienbar, z. B. Laserpointer)
function sperreAnlegen(bereiche) {
  const stil = document.createElement('style');
  stil.textContent = `body.live-zuschauen :is(${bereiche}) { pointer-events: none !important; }
body.live-zuschauen :is(${bereiche}) .live-frei { pointer-events: auto !important; }`;
  document.head.append(stil);
}

// ---------------- Start

// Jedes Bild: steuernd im Takt senden (Zustand mit der Zeit dieses Bilds), zuschauend den geglätteten Zustand
// übernehmen (nur, wenn sich etwas geändert hat)
let gesendet = -Infinity, geschrieben = null;
function bild(zeit) {
  requestAnimationFrame(bild);
  if (sendet()) {
    if (zeit - gesendet >= TAKT - 4) {
      gesendet = zeit;
      senden({ typ: 'zustand', daten: { zeit, zustand: optionen.lesen() } });
    }
  } else if (zuschauen()) {
    const zustand = glaetter.anzeigen(performance.now());
    if (zustand && zustand !== geschrieben) optionen.schreiben(structuredClone(zustand));
    geschrieben = zustand;
  }
}

// optionen: { id, lesen, schreiben, glaetten?, sperren?, beiWechsel?, steuernAngaben? } – siehe README.md
export async function initLive(neu) {
  if (optionen) throw new Error('initLive() wurde schon aufgerufen');
  optionen = { sperren: '#scene, .panel, .popup, .hint', ...neu };
  glaetter = new Glaetter(optionen.glaetten);
  if (code) halloErgaenzen({ steuern: code });   // vor dem Start der Verbindung
  const verbindung = await verbindungStarten(optionen.id);
  rolle = verbindung === 'lehrer' ? 'lehrer' : verbindung === 'schueler' && code ? 'schueler' : null;
  if (!rolle) return;
  stilLaden(new URL('./live.css', import.meta.url));
  sperreAnlegen(optionen.sperren);
  bannerAnlegen();
  if (rolle === 'lehrer') lehrerFeldAnlegen();

  aufNachricht('live-status', nachricht => {
    Object.assign(stand, rolle === 'lehrer'
      ? { aktiv: nachricht.aktiv, verbunden: nachricht.verbunden, quelle: nachricht.quelle, ich: nachricht.ich }
      : { quelle: nachricht.quelle });
    if (rolle === 'lehrer' && stand.verbunden) hideLink();   // QR-Code wurde gescannt
    anzeigen();
  });
  aufNachricht('live-ende', () => {
    if (rolle !== 'schueler') return;
    stand.beendet = true;
    // Code aus der Adresse nehmen, damit Neuladen nicht wieder verbindet
    const url = new URL(location.href);
    url.searchParams.delete('steuern');
    history.replaceState(null, '', url);
    anzeigen();
    setTimeout(() => { $('liveBanner').hidden = true; }, 6000);
  });
  aufNachricht('zustand', ({ daten }) => {
    if (zuschauen() && daten?.zustand && Number.isFinite(daten.zeit)) glaetter.empfangen(daten.zeit, daten.zustand, performance.now());
  });
  aufStatus(offen => {
    stand.offen = offen;
    anzeigen();
  });
  requestAnimationFrame(bild);
  anzeigen();
}

// ---------------- Hilfe für Simulationen: empfangene Daten in den bestehenden Zustand schreiben

// Schreibt quelle in ziel, ohne Teilobjekte zu ersetzen (andere Module halten oft Verweise darauf, z. B.
// const { swing } = state). Arrays gleicher Länge werden elementweise übernommen.
export function zustandUebernehmen(ziel, quelle) {
  for (const [schluessel, wert] of Object.entries(quelle)) {
    const alt = ziel[schluessel];
    if (Array.isArray(wert) && Array.isArray(alt) && alt.length === wert.length) {
      wert.forEach((w, i) => { alt[i] = w; });
    } else if (wert && typeof wert === 'object' && !Array.isArray(wert) && alt && typeof alt === 'object') {
      zustandUebernehmen(alt, wert);
    } else {
      ziel[schluessel] = wert;
    }
  }
}
