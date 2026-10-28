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
  coils: 1,           // 1: eine Spule (rechts); 2: zweite Spule links, mit Eisenjoch, in Reihe geschaltet
  reversed: false,    // zwei Spulen: false „Ende – Ende“ (Spannungen addieren sich), true „Ende – Anfang“ (heben sich auf)
  drive: 'speed',     // Antrieb: 'speed' (Drehzahl-Regler) oder 'crank' (Handkurbel)
  speed: 0.5,         // Drehzahl-Regler in Umdrehungen pro Sekunde (vorwärts positiv)
  hold: false,        // Magnet festgehalten: dreht sich nur per Kurbel oder Drehwinkel-Regler, bleibt dann stehen
  slowMotion: false,
  range: 0.3,         // Messbereich ±0,3 V
  showB: true,        // Pfeil für B im Spuleninneren (Spule und Kern dann durchsichtig)
  showPlot: true,     // Diagramme B–t und U–t
  showSlope: false,   // Änderung von B als Tangente an die B-Kurve
};
