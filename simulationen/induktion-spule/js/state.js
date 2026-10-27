// ------------------------------------------------------------------
// Zustand der Simulation (wird vom Bedienfeld und beim Ziehen geändert, von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
export const state = {
  meter: 'pointer',   // Messgerät: 'pointer' (Zeigermessgerät mit Skala, Nullpunkt in der Mitte), 'qual'
                      // (Zeigermessgerät ohne Skala, empfindlich) oder 'multi' (Multimeter)
  range: 0.3,         // Messbereich des Zeigermessgeräts ±0,3 V
  multiMode: 'off',   // Drehschalter des Multimeters: 'off', 'vdc' (V⎓), 'vac' (V~), 'ma' (mA⎓), 'a' (A⎓)
  // Stecker der beiden Kabel (rot von Anschluss A, schwarz von E): Buchse 'plus', 'minus' (Zeigermessgerät) bzw.
  // 'com', 'v', 'ma', 'a' (Multimeter) – oder null (nicht eingesteckt). Zu Beginn steckt nichts.
  plugs: { red: null, black: null },
  northRight: true,   // Nordpol des Magneten rechts (bei Drehwinkel 0)
  strength: 'medium', // Stärke des Magneten (STRENGTHS in config.js)
  turns: 600,         // Windungszahl der Spule (TURNS in config.js); 1: einzelne Leiterschleife
  freeMove: true,     // Magnet und Spule auch nach oben und unten verschieben (in der Simulation immer; false nur in Tests)
  // Feldlinienmodell (Didaktik, Standard): Spannung nur aus den gezeigten Feldlinien – nur wenn sich ihre Anzahl oder
  // ihr Verlauf im Spuleninneren ändert (feldlinienModell.js). false: reale Physik (echtes Feld des Magneten)
  lineModel: true,
  showField: false,   // Feldlinien des Magneten (die Abschnitte im Spuleninneren hervorgehoben); auch im
                      // Feldlinienmodell erst auf Knopfdruck – gerechnet wird dort trotzdem mit den Feldlinien
  showB: false,       // Pfeil für B im Spuleninneren
  showPlot: false,    // Diagramme B–t und U–t
};
