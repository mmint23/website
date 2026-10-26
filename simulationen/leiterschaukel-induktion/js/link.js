// ------------------------------------------------------------------
// „Link zeigen“: großes Fenster mit QR-Code und Adresse der Simulation (zum Abscannen vom Beamer)
// Der Code wird im Browser aus der eigenen Adresse erzeugt; ist die Seite lokal geöffnet, zeigt er die
// öffentliche Adresse (PUBLIC_URL). Die Bibliothek qrcode-generator wird erst beim ersten Öffnen geladen.
// Auf der Lehrerseite des Abgabe-Servers zeigt er die Adresse für die Schüler im lokalen Netz (setLinkUrl).
// ------------------------------------------------------------------
import { PUBLIC_URL } from './config.js';

const QR_LIBRARY = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const $ = id => document.getElementById(id);

// Lokal (Live Server, python -m http.server, Doppelklick) würde der Code auf den eigenen Rechner zeigen
const isLocal = () => location.protocol === 'file:'
  || ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
let linkUrl = null;
const pageUrl = () => linkUrl ?? (isLocal() ? PUBLIC_URL : location.origin + location.pathname);
export function setLinkUrl(url) {
  linkUrl = url;
}

let library = null;
function loadLibrary() {
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

// url/hinweis: andere Adresse mit Erklärung zeigen (z. B. die Lehrerseite für ein zweites Gerät)
export async function showLink(url = pageUrl(), hinweis = '') {
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

function hideLink() {
  $('linkOverlay').hidden = true;
  $('linkBtn').focus();
}

export function initLink() {
  $('linkBtn').addEventListener('click', () => showLink());
  $('linkClose').addEventListener('click', hideLink);
  // Klick neben das Fenster oder Escape schließt
  $('linkOverlay').addEventListener('click', event => {
    if (event.target === $('linkOverlay')) hideLink();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('linkOverlay').hidden) hideLink();
  });
}
