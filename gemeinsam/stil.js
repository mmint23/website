// ------------------------------------------------------------------
// Stylesheet eines gemeinsamen Bausteins einmalig in die Seite einhängen, damit eine Simulation dafür
// nichts in ihre index.html schreiben muss. url: new URL('./datei.css', import.meta.url)
// In der Offline-Version (eine einzige HTML-Datei, werkzeuge/downloads.mjs) steckt das Stylesheet schon in der
// Datei (globalThis.OFFLINE.stile, nach Dateiname) und wird von dort eingefügt.
// ------------------------------------------------------------------
const geladen = new Set();

export function stilLaden(url) {
  const href = String(url);
  if (geladen.has(href)) return;
  geladen.add(href);
  const eingebettet = globalThis.OFFLINE?.stile?.[href.split('/').pop()];
  if (eingebettet !== undefined) {
    const stil = document.createElement('style');
    stil.textContent = eingebettet;
    document.head.prepend(stil);
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  // vor die eigenen Stylesheets der Seite, damit die Simulation Einzelheiten überschreiben kann
  document.head.prepend(link);
}
