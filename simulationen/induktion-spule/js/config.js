// ------------------------------------------------------------------
// Maße und Modellgrößen: Stabmagnet und Spule
// Maße in cm (1 Einheit ≙ 1 cm), physikalische Größen in SI-Einheiten.
// Koordinaten: x = nach rechts, y = nach oben, z = nach vorne. Die Mitten von Magnet und Spule liegen auf der
// x-Achse und lassen sich entlang dieser Achse verschieben – auf Wunsch auch nach oben und unten (y); gedreht werden
// beide in der Bildebene (um z).
// ------------------------------------------------------------------

// Stabmagnet (quadratischer Querschnitt). Für die Feldlinien zählt der Querschnitt als Kreis gleicher Fläche.
export const MAGNET = { LENGTH: 10, WIDTH: 2 };
export const MAGNET_AREA = (MAGNET.WIDTH / 100) ** 2;                 // m²
export const POLE_R = MAGNET.WIDTH / Math.sqrt(Math.PI);              // cm, Radius des flächengleichen Kreises
export const DIPOLES = 40;                                             // Magnet als Kette so vieler Dipole (Fluss)

// Stärke des Magneten: Flussdichte im Magneten in T und Startpunkte der gezeigten Feldlinien (Anteil der halben
// Magnetbreite auf der Nordpolfläche, je oben und unten) – mehr Feldlinien beim stärkeren Magneten
export const STRENGTHS = {
  weak: { B: 0.15, label: 'schwach', lines: [0.3, 0.65, 0.95] },
  medium: { B: 0.3, label: 'mittel', lines: [0.12, 0.3, 0.5, 0.65, 0.8, 0.95] },
  strong: { B: 0.6, label: 'stark', lines: [0.06, 0.15, 0.23, 0.3, 0.4, 0.5, 0.58, 0.65, 0.73, 0.8, 0.88, 0.95] },
};

// Spule: Wicklung auf einem durchsichtigen Spulenkörper, der Magnet passt (gerade) hindurch
export const COIL = {
  LENGTH: 9,            // Länge der Wicklung
  R_INNER: 1.9,         // Innenradius des Spulenkörpers (Bohrung)
  R_WIND: 2.3,          // Radius der Wicklung (Mitte des Drahts) – für den Fluss durch eine Windung
  R_FLANGE: 3.3,        // Flansche an beiden Enden
  FLANGE_X: 0.6,        // Flansche reichen so weit über die Wicklung hinaus
  LOOPS: 24,            // so viele Windungen werden für den Fluss einzeln gerechnet (gleichmäßig verteilt) …
  SEGMENTS: 32,         // … jede als Vieleck mit so vielen Seiten
};
// Windungszahlen zur Auswahl: sichtbare Windungen, Drahtradius (Darstellung), Widerstand der Spule in Ω.
// 1: einzelne Leiterschleife (Drahtring mit dem Radius der Wicklung, ohne Spulenkörper) statt einer Spule
export const TURNS = {
  1: { shown: 1, wire: 0.2, R: 0.05, loop: true },
  300: { shown: 14, wire: 0.24, R: 3 },
  600: { shown: 26, wire: 0.17, R: 6 },
  1200: { shown: 48, wire: 0.09, R: 12 },
};

// Leiterschleife: Anschlüsse dicht nebeneinander über dem Ring (Abstand von der Mitte in x und Höhe)
export const LOOP = { TERMINAL_X: 0.9, TERMINAL_Y: COIL.R_FLANGE + 0.5 };

// Verschieben und Drehen: Bereich der Mitten, Nachlaufzeit hinter dem Finger bzw. Regler, Startlagen.
// Nach oben und unten (state.freeMove, in der Simulation immer an); nahe der gemeinsamen Achse rastet y auf 0 ein.
export const X_MIN = -28;
export const X_MAX = 20;
export const Y_MIN = -10;
export const Y_MAX = 10;
export const Y_SNAP = 0.5;
export const FOLLOW_TIME = 0.03;   // s
export const TURN_TIME = 0.06;     // s
export const START = { magnet: -17, coil: 8 };

// Messbereich als Text (unter 0,01 V in mV), z. B. „±1 mV“, „±0,3 V“
export const rangeText = range => (range < 0.01 ? `±${Math.round(range * 1000)}\u00a0mV` : `±${String(range).replace('.', ',')} V`);

// Zeigermessgerät (wie bei Leiterschaukel und Generator): gedämpfter Schwinger
export const METER = {
  FREQ: 1.2,                  // Eigenfrequenz in Hz
  DAMPING: 0.55,              // leicht unterkritisch
  FULL_ANGLE: 50,             // Vollausschlag nach jeder Seite in Grad
  STOP: 1.08,                 // Anschlag knapp hinter dem Skalenende
  RANGES: [0.001, 0.1, 0.3, 1],   // Messbereiche ±1 mV (für die Leiterschleife) / ±0,1 / ±0,3 / ±1 V
};

// Multimeter: neuer Messwert dreimal pro Sekunde, gemittelt über die letzten 0,1 s davor.
// Drehschalter (Reihenfolge beim Weiterdrehen) und Buchsen; Innenwiderstand der Strommessung in Ω
export const MULTIMETER = { INTERVAL: 1 / 3, AVERAGE: 0.1, SHUNT_MA: 1, SHUNT_A: 0.01 };
export const MULTI_MODES = ['off', 'vdc', 'vac', 'ma', 'a'];
export const SOCKETS = { pointer: ['minus', 'plus'], qual: ['minus', 'plus'], multi: ['com', 'v', 'ma', 'a'] };

// Zeigermessgerät ohne Skala (qualitativ, empfindlich): Ausschlag wächst logarithmisch mit der Spannung, damit die
// Leiterschleife (unter 1 mV) und Spulen (einige 0,1 V) beide sichtbar ausschlagen, ohne am Anschlag zu kleben:
// Ausschlag = log(1 + |U|/U0) / log(1 + U_FULL/U0). Leiterschleife 0,5 mV: etwa ¼, Spule 0,1 V: etwa ¾.
export const QUAL = { U0: 0.00005, U_FULL: 1 };

// Pfeil für B im Spuleninneren: Länge in cm bei B_ARROW_REF; Diagramm B–t bis ±B_PLOT mT
export const B_ARROW = 5;
export const B_ARROW_REF = 0.06;
export const B_PLOT = 80;
export const PLOT_SECONDS = 6;
