// ------------------------------------------------------------------
// Maße und Modellgrößen: Stabmagnet und Spule auf einer gemeinsamen Achse
// Maße in cm (1 Einheit ≙ 1 cm), physikalische Größen in SI-Einheiten.
// Koordinaten: x = nach rechts (gemeinsame Achse von Magnet und Spule), y = nach oben, z = nach vorne.
// Magnet und Spule lassen sich nur entlang der x-Achse verschieben; ihre Lage ist die x-Koordinate der Mitte.
// ------------------------------------------------------------------

// Stabmagnet (quadratischer Querschnitt). Für das Feld zählt der Querschnitt als Kreis gleicher Fläche.
export const MAGNET = { LENGTH: 10, WIDTH: 2 };
export const MAGNET_AREA = (MAGNET.WIDTH / 100) ** 2;                 // m²
export const POLE_R = MAGNET.WIDTH / Math.sqrt(Math.PI);              // cm, Radius des flächengleichen Kreises
export const B_REMANENZ = 0.3;                                         // T, Flussdichte im Magneten

// Spule: Wicklung auf einem durchsichtigen Spulenkörper, der Magnet passt hindurch
export const COIL = {
  LENGTH: 9,            // Länge der Wicklung
  R_INNER: 1.9,         // Innenradius des Spulenkörpers (Bohrung)
  R_WIND: 2.3,          // Radius der Wicklung (Mitte des Drahts) – für den Fluss durch eine Windung
  R_FLANGE: 3.3,        // Flansche an beiden Enden
  TURNS: 600,           // Windungen
  TURNS_SHOWN: 26,      // sichtbare Windungen
  LOOPS: 48,            // so viele Windungen werden für den Fluss einzeln gerechnet (gleichmäßig verteilt)
};

// Verschieben: Bereich der Mitten, Nachlaufzeit hinter dem Finger, Startlagen
export const X_MIN = -28;
export const X_MAX = 20;
export const FOLLOW_TIME = 0.03;   // s
export const START = { magnet: -17, coil: 8 };

// Zeigermessgerät (wie bei Leiterschaukel und Generator): gedämpfter Schwinger
export const METER = {
  FREQ: 1.2,                  // Eigenfrequenz in Hz
  DAMPING: 0.55,              // leicht unterkritisch
  FULL_ANGLE: 50,             // Vollausschlag nach jeder Seite in Grad
  STOP: 1.08,                 // Anschlag knapp hinter dem Skalenende
  RANGES: [0.1, 0.3, 1],      // Messbereiche ±0,1 / ±0,3 / ±1 V
};

// Multimeter: neuer Messwert dreimal pro Sekunde, gemittelt über die letzten 0,1 s davor
export const MULTIMETER = { INTERVAL: 1 / 3, AVERAGE: 0.1 };

// Pfeil für B im Spuleninneren: Länge in cm bei B_ARROW_REF; Diagramm B–t bis ±B_PLOT mT
export const B_ARROW = 5;
export const B_ARROW_REF = 0.06;
export const B_PLOT = 80;
export const PLOT_SECONDS = 6;
