// ------------------------------------------------------------------
// Zustand der Simulation (wird vom Bedienfeld geändert und von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
export const state = {
  // Feldlinienmodell (Didaktik, Standard): B im Spuleninneren und Spannung aus der Zahl der Feldlinien durch die
  // Spule (feldlinienModell.js). false: reale Physik (B = B_MAX · cos(φ − θ))
  lineModel: true,
  showField: false,   // Feldlinien in der Bildebene; auch im Feldlinienmodell erst auf Knopfdruck – gerechnet wird dort
                      // trotzdem mit den Feldlinien
  colorInside: false, // Abschnitte der Feldlinien im Inneren der Spulen violett färben (nur bei eingeblendeten Feldlinien)
  iron: false,        // Spulen mit Eisenkern (und bei zwei Spulen mit Joch); false: Luftspulen
  coils: 2,           // immer zwei Spulen (rechts und links, in Reihe); 1 (nur rechts) gibt es nur noch in den Tests
  reversed: false,    // zwei Spulen: false „Ende – Ende“ (Spannungen addieren sich), true „Ende – Anfang“ (heben sich auf)
  drive: 'speed',     // Antrieb: 'wind' (Rotor einer Windkraftanlage), 'speed' (Drehzahl-Regler) oder 'crank' (Handkurbel)
  wind: 8,            // Windgeschwindigkeit in m/s (Antrieb „Wind“)
  speed: 0.5,         // Drehzahl-Regler in Umdrehungen pro Sekunde (vorwärts positiv)
  hold: false,        // Magnet festgehalten: dreht sich nur per Kurbel oder Drehwinkel-Regler, bleibt dann stehen
  slowMotion: false,
  range: 0.3,         // Messbereich ±0,3 V
  display: 'meter',   // angeschlossen: 'meter' (Zeigermessgerät), 'led' oder 'lamp' (Glühlampe) – Gedankenexperiment
  explain: false,     // Erklärmodus: nur hier Magnetfeld (Feldlinien, B-Pfeil, B–t-Diagramm, Tangente, reale Physik)
  showB: false,       // Pfeil für B im Spuleninneren (Spule und Kern dann durchsichtig)
  showPlot: false,    // Diagramm U–t (im Erklärmodus dazu B–t); zu Beginn aus
  paused: false,      // Bewegung angehalten (Knopf „Pause“, nur im Erklärmodus)
};

// Mit ?erklaerung in der Adresse (QR-Code „für den Erklärmodus“) startet die Simulation gleich im Erklärmodus
export const imErklaermodusStarten = new URLSearchParams(globalThis.location?.search ?? '').has('erklaerung');

// Aus dem Windpark gekommen (?von=windpark&wind=…): Antrieb „Wind“ mit dem Wind von dort. Ohne Windpark im
// Browser (Tests) bleibt alles wie oben.
export const ausWindpark = new URLSearchParams(globalThis.location?.search ?? '').get('von') === 'windpark';
if (ausWindpark) {
  const wind = Number(new URLSearchParams(location.search).get('wind'));
  if (Number.isFinite(wind)) state.wind = Math.min(20, Math.max(0, wind));
  state.drive = 'wind';
}
