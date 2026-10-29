// ------------------------------------------------------------------
// Zustand der Simulation (wird vom Bedienfeld geändert und von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
export const state = {
  wind: 8,            // Windgeschwindigkeit in m/s (Antrieb „Wind“: Rotor einer Windkraftanlage auf derselben Welle)
  drive: 'speed',     // Antrieb: 'speed' (Drehzahl-Regler), 'crank' (Handkurbel) oder 'wind' (Rotor wie im Windpark)
  speed: 0.5,         // Drehzahl-Regler in Umdrehungen pro Sekunde (vorwärts positiv)
  northUp: true,      // Nordpol oben, Südpol unten
  coil: false,        // Spule mit COIL.TURNS Windungen statt einer einzelnen Leiterschleife
  range: 3,           // Messbereich ±3 mV
  display: 'meter',   // angeschlossen: 'meter' (Zeigermessgerät), 'led' oder 'lamp' (Glühlampe) – Gedankenexperiment
  slowMotion: false,
  showPlot: false,    // U-t-Diagramm einblenden (per Knopf, rechts und im Erklärmodus)
  hold: false,        // Schleife festgehalten: dreht sich nur per Kurbel oder Drehwinkel-Regler, bleibt dann stehen
  paused: false,      // Bewegung angehalten (Pfeile zeigen den Augenblick)
  explain: false,     // Erklärmodus: Elektronen in der Schleife, einblendbare Größen
  magnetGlass: false, // Erklärmodus: Magnet durchsichtig (Schleife auch von oben zu sehen)
  sideView: false,    // Erklärmodus: Ansicht von rechts (entlang der Welle); aus, sobald man die Ansicht selbst dreht
  showB: false,       // Erklärmodus: Feldlinien, Pfeile v und F_L, Elektronen (zu Beginn aus)
  showV: false,
  showF: false,
  showElectron: false,       // einzelnes Elektron (vordere Längsseite)
  showTwoElectrons: false,   // zwei Elektronen: je eines in der Mitte von Längsseite A und B (beim Drehen oben/unten)
  showManyElectrons: false,  // viele Elektronen über die ganze Schleife (von Ende zu Ende), mit Atomrümpfen
  showRings: false,          // Erklärmodus: Schleifringe mit Bürsten (zu Beginn offene Enden)
};

// Schülermodus (z. B. für eine Lehrprobe): Erklärmodus ohne den Knopf für die Lorentzkraft F_L – die Schüler sollen
// sie selbst herausfinden, statt dass die Simulation sie vorwegnimmt. Tafel, Teilen und Live-Steuerung wie immer.
// Mit ?schueler in der Adresse (QR-Code) ist er fest eingeschaltet (Schülergerät); sonst schaltet ihn die Lehrkraft
// mit dem Knopf „Schülermodus“ um (bedienfeld.js). Er gehört zum Gerät und wird nicht live übertragen.
const imLink = new URLSearchParams(globalThis.location?.search ?? '').has('schueler');
export const modus = { schueler: imLink, festgelegt: imLink };

// Aus dem Windpark gekommen (?von=windpark&wind=…): Antrieb „Wind“ mit dem Wind von dort. Ohne Windpark im
// Browser (Tests) bleibt alles wie oben.
export const ausWindpark = new URLSearchParams(globalThis.location?.search ?? '').get('von') === 'windpark';
if (ausWindpark) {
  const wind = Number(new URLSearchParams(location.search).get('wind'));
  if (Number.isFinite(wind)) state.wind = Math.min(20, Math.max(0, wind));
  state.drive = 'wind';
}
