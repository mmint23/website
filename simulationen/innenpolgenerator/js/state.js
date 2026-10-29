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
  drive: 'speed',     // Antrieb: 'speed' (Drehzahl-Regler) oder 'crank' (Handkurbel)
  speed: 0.5,         // Drehzahl-Regler in Umdrehungen pro Sekunde (vorwärts positiv)
  hold: false,        // Magnet festgehalten: dreht sich nur per Kurbel oder Drehwinkel-Regler, bleibt dann stehen
  slowMotion: false,
  range: 0.3,         // Messbereich ±0,3 V
  explain: false,     // Erklärmodus: nur hier Magnetfeld (Feldlinien, B-Pfeil, B–t-Diagramm, Tangente, reale Physik)
  showB: false,       // Pfeil für B im Spuleninneren (Spule und Kern dann durchsichtig)
  showPlot: true,     // Diagramm U–t (im Erklärmodus dazu B–t)
  showSlope: false,   // Änderung von B als Tangente an die B-Kurve
};
