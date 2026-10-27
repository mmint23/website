// ------------------------------------------------------------------
// „Link zeigen“: großes Fenster mit QR-Code und Adresse der Simulation (zum Abscannen vom Beamer)
// Der Code wird im Browser aus der eigenen Adresse erzeugt; ist die Seite lokal geöffnet, zeigt er die
// öffentliche Adresse auf der Website (WEBSITE_URL in config.js). Die Bibliothek qrcode-generator wird erst beim
// ersten Öffnen geladen. Auf der Lehrerseite des Abgabe-Servers zeigt er die Adresse für die Schüler im lokalen
// Netz (setLinkUrl).
//
// Einbinden:  import { showLink } from '../../gemeinsam/link.js';
//             knopf.addEventListener('click', () => showLink());
// Fenster und Aussehen legt dieses Modul selbst an.
// ------------------------------------------------------------------
import { WEBSITE_URL } from './config.js';
import { stilLaden } from './stil.js';

const QR_LIBRARY = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const $ = id => document.getElementById(id);

// Lokal (Live Server, python -m http.server, Doppelklick) würde der Code auf den eigenen Rechner zeigen
const isLocal = () => location.protocol === 'file:'
  || ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);

// Öffentliche Adresse dieser Seite: der Teil ab „simulationen/“ an die Website-Adresse gehängt
// (Offline-Version: Pfad der Simulation steht in globalThis.OFFLINE.seite)
function oeffentlicheUrl() {
  const teil = globalThis.OFFLINE?.seite
    ?? location.pathname.match(/simulationen\/.*$/)?.[0].replace(/index\.html$/, '') ?? '';
  return WEBSITE_URL + teil;
}

let linkUrl = null;
const pageUrl = () => linkUrl ?? (isLocal() ? oeffentlicheUrl() : location.origin + location.pathname);
export function setLinkUrl(url) {
  linkUrl = url;
}

// Bibliothek erst bei Bedarf aus dem Internet laden (in der Offline-Version ist sie schon da)
let library = null;
function loadLibrary() {
  if (window.qrcode) library ??= Promise.resolve(window.qrcode);
  library ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = QR_LIBRARY;
    script.onload = () => resolve(window.qrcode);
    script.onerror = () => {
      library = null;   // beim nächsten Öffnen erneut versuchen
      reject(new Error('QR-Code-Bibliothek nicht erreichbar'));
    };
    document.head.append(script);
  });
  return library;
}

// QR-Code als SVG-Text
export async function qrSvg(url) {
  const qrcode = await loadLibrary();
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
}

// ---------------- Fenster (wird beim ersten Öffnen angelegt)

let vorher = null;   // Element, das vor dem Öffnen den Fokus hatte (bekommt ihn danach zurück)

function fensterAnlegen() {
  if ($('linkOverlay')) return;
  stilLaden(new URL('./link.css', import.meta.url));
  document.body.insertAdjacentHTML('beforeend', `
    <div class="link-overlay" id="linkOverlay" hidden>
      <div class="link-box" role="dialog" aria-modal="true" aria-label="Link zur Simulation">
        <p class="link-hinweis" id="linkHinweis" hidden></p>
        <div class="link-qr" id="linkQr"></div>
        <a class="link-text" id="linkText" target="_blank" rel="noopener"></a>
        <p class="link-status" id="linkLocal" hidden>Die Seite ist lokal geöffnet – gezeigt wird die öffentliche Adresse.</p>
        <button id="linkClose" type="button">Schließen</button>
      </div>
    </div>`);
  $('linkClose').addEventListener('click', hideLink);
  // Klick neben das Fenster oder Escape schließt
  $('linkOverlay').addEventListener('click', event => {
    if (event.target === $('linkOverlay')) hideLink();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('linkOverlay').hidden) hideLink();
  });
}

// url/hinweis: andere Adresse mit Erklärung zeigen (z. B. die Lehrerseite für ein zweites Gerät)
export async function showLink(url = pageUrl(), hinweis = '') {
  fensterAnlegen();
  vorher = document.activeElement;
  $('linkHinweis').textContent = hinweis;
  $('linkHinweis').hidden = !hinweis;
  $('linkText').textContent = url.replace(/^https?:\/\//, '');
  $('linkText').href = url;
  $('linkLocal').hidden = Boolean(hinweis) || linkUrl !== null || !isLocal();
  $('linkOverlay').hidden = false;
  $('linkClose').focus();
  const box = $('linkQr');
  try {
    box.innerHTML = await qrSvg(url);
  } catch {
    box.textContent = 'Der QR-Code konnte nicht geladen werden (keine Internetverbindung?).';
  }
}

// Fenster schließen (auch von außen, z. B. wenn der QR-Code der Live-Steuerung gescannt wurde)
export function hideLink() {
  if (!$('linkOverlay') || $('linkOverlay').hidden) return;
  $('linkOverlay').hidden = true;
  vorher?.focus?.();
}
