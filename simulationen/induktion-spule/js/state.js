// ------------------------------------------------------------------
// Zustand der Simulation (wird vom Bedienfeld und beim Ziehen geändert, von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
export const state = {
  meter: 'pointer',   // Messgerät: 'pointer' (Zeigermessgerät, Nullpunkt in der Mitte) oder 'multi' (Multimeter)
  range: 0.3,         // Messbereich des Zeigermessgeräts ±0,3 V
  northRight: true,   // Nordpol des Magneten rechts (zur Spule hin, wenn der Magnet links liegt)
  showField: false,   // Feldlinien des Magneten (die Abschnitte im Spuleninneren hervorgehoben)
  showB: false,       // Pfeil für B im Spuleninneren
  showPlot: false,    // Diagramme B–t und U–t
};
