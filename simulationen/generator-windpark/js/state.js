// ------------------------------------------------------------------
// Zustand der Simulation (wird vom Bedienfeld geändert und von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
export const state = {
  view: 'park',       // Ansicht: 'park' (Windpark, Einstieg) oder 'model' (Generator-Modell)
  wind: 8,            // Windgeschwindigkeit im Windpark in m/s
  time: 12,           // Uhrzeit im Windpark in Stunden (Sonnenstand, abends Licht im Dorf; tageszeit.js)
  drive: 'speed',     // Antrieb: 'speed' (Drehzahl-Regler), 'crank' (Handkurbel) oder 'wind' (Rotor wie im Windpark)
  speed: 0.5,         // Drehzahl-Regler in Umdrehungen pro Sekunde (vorwärts positiv)
  northUp: true,      // Nordpol oben, Südpol unten
  range: 3,           // Messbereich ±3 mV
  slowMotion: false,
  showPlot: true,     // U-t-Diagramm einblenden
  hold: false,        // Schleife festgehalten: dreht sich nur per Kurbel oder Drehwinkel-Regler, bleibt dann stehen
  paused: false,      // Bewegung angehalten (Pfeile zeigen den Augenblick)
  explain: false,     // Erklärmodus: Elektronen in der Schleife, einblendbare Größen
  showB: false,       // Erklärmodus: Feldlinien, Pfeile v und F_L, Elektronen (zu Beginn aus)
  showV: false,
  showF: false,
  showElectron: false,       // einzelnes Elektron (vordere Längsseite)
  showManyElectrons: false,  // viele Elektronen über die ganze Schleife (von Ende zu Ende), mit Atomrümpfen
  showRings: false,          // Erklärmodus: Schleifringe mit Bürsten (zu Beginn offene Enden)
};
