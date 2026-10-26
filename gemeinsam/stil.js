// ------------------------------------------------------------------
// Stylesheet eines gemeinsamen Bausteins einmalig in die Seite einhängen, damit eine Simulation dafür
// nichts in ihre index.html schreiben muss. url: new URL('./datei.css', import.meta.url)
// ------------------------------------------------------------------
const geladen = new Set();

export function stilLaden(url) {
  const href = String(url);
  if (geladen.has(href)) return;
  geladen.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  // vor die eigenen Stylesheets der Seite, damit die Simulation Einzelheiten überschreiben kann
  document.head.prepend(link);
}
