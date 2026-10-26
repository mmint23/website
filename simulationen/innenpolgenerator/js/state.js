// ------------------------------------------------------------------
// Zustand der Simulation (wird vom Bedienfeld geändert und von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
export const state = {
  coils: 1,           // 1: eine Spule (oben); 2: zweite Spule unten, mit Eisenjoch, in Reihe geschaltet
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
