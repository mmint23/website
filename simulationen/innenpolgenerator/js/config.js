// ------------------------------------------------------------------
// Maße und Modellgrößen des Innenpolgenerators
// Maße in cm (1 Einheit ≙ 1 cm), physikalische Größen in SI-Einheiten.
// Koordinaten: x = nach rechts, y = nach oben, z = nach vorne (zum Betrachter). Die Welle liegt auf der z-Achse,
// der Magnet (Polrad) dreht sich also in der Bildebene. Ursprung: Mitte des Magneten.
// ------------------------------------------------------------------

// Polrad: Stabmagnet, Nordpol bei φ = 0 oben (zu Spule 1)
export const MAGNET = { LENGTH: 12, WIDTH: 3.4, DEPTH: 3.4 };

// Spulen mit Eisenkern (stehen fest). Gebaut entlang +y, dann um ihre Lage THETA gedreht (0: oben, π: unten).
export const COIL = {
  THETA: [0, Math.PI],        // Lage von Spule 1 und Spule 2 (gegen den Uhrzeigersinn von oben aus)
  CORE_R: 1.7,                // Radius des Eisenkerns
  CORE_IN: 7.4,               // Kern beginnt so weit von der Achse (Polschuh, Luftspalt zum Magneten 1,4 cm)
  CORE_OUT: 15.5,             // ... und endet hier (am Joch)
  WIND_IN: 8.9,               // Wicklung von ... bis
  WIND_OUT: 14,
  WIND_R: 2.35,               // Radius der Wicklung (Mitte des Drahts)
  TURNS_SHOWN: 11,            // sichtbare Windungen (die echte Spule hat TURNS)
  TERMINAL_Y: 14.9,           // Anschlüsse: Abstand von der Achse
  TERMINAL_X: 1.3,            // Anschluss a rechts (+x), e links (−x) – bei beiden Spulen
  TERMINAL_Z: 2.4,
};

// Eisenjoch (Stator-Ring, nur bei zwei Spulen): verbindet die Kerne außen
export const YOKE = { R_IN: 15.5, R_OUT: 17, DEPTH: 4 };

// Welle und Kurbel (vorne auf der Welle; der Arm steht 90° neben dem Nordpol, damit er den Magneten nicht verdeckt)
export const SHAFT = { R: 0.5, Z_MIN: -4.5, Z_MAX: 5.9 };
export const CRANK = { Z: 5.2, ARM: 5, KNOB_LEN: 3.5, OFFSET: Math.PI / 2 };

// Physikalische Modellgrößen (SI)
export const B_MAX = 0.1;                                    // größte Flussdichte im Spulenkern in T
export const TURNS = 500;                                    // Windungen je Spule
export const CORE_AREA = Math.PI * (COIL.CORE_R / 100) ** 2; // Querschnitt des Kerns in m² (≈ 9 cm²)
export const SPEED_MAX = 3;                                  // Drehzahl-Regler: bis 3 Umdrehungen pro Sekunde
export const SPEED_TIME = 0.4;                               // Drehzahl stellt sich mit dieser Zeitkonstante (s) ein
export const CRANK_TIME = 0.05;                              // Kurbel: Magnet folgt dem Finger mit dieser Zeitkonstante
export const CRANK_MAX_OMEGA = 40;                           // ... höchstens so schnell (rad/s, gut 6 U/s)
export const FRICTION = 0.25;                                // freies Auslaufen nach dem Loslassen: Abbremsung in 1/s
export const FRICTION_STOP = 0.15;                           // darunter (rad/s) bleibt der Magnet stehen

// Zeigermessgerät (wie bei Leiterschaukel und Generator): gedämpfter Schwinger
export const METER = {
  FREQ: 1.2,                  // Eigenfrequenz in Hz
  DAMPING: 0.55,              // leicht unterkritisch
  FULL_ANGLE: 50,             // Vollausschlag nach jeder Seite in Grad
  STOP: 1.08,                 // Anschlag knapp hinter dem Skalenende
  RANGES: [0.3, 1, 3],        // Messbereiche ±0,3 / ±1 / ±3 V
};

// Pfeil für B im Spuleninneren: Länge in cm bei B_MAX
export const B_ARROW = 4.6;

// Diagramme: so viele Sekunden (Simulationszeit) sind sichtbar; B-Achse bis ±B_PLOT mT
export const PLOT_SECONDS = 4;
export const B_PLOT = 120;
