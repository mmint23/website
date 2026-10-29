// ------------------------------------------------------------------
// Maße und Modellgrößen des Innenpolgenerators
// Maße in cm (1 Einheit ≙ 1 cm), physikalische Größen in SI-Einheiten.
// Koordinaten: x = nach rechts, y = nach oben, z = nach vorne (zum Betrachter). Die Welle liegt auf der z-Achse,
// der Magnet (Polrad) dreht sich also in der Bildebene. Ursprung: Mitte des Magneten.
// Der Generator ist intern „stehend“ gebaut (Spule 1 oben, Spule 2 unten, Nordpol bei φ = 0 oben) und wird als
// Ganzes um GEN_ROT gedreht: Er liegt waagrecht, Spule 1 rechts, Spule 2 links, Nordpol bei φ = 0 rechts.
// ------------------------------------------------------------------

export const GEN_ROT = -Math.PI / 2;

// Polrad: Stabmagnet, Nordpol bei φ = 0 zu Spule 1 (rechts)
export const MAGNET = { LENGTH: 12, WIDTH: 4.4, DEPTH: 4.4 };

// Spulen mit Eisenkern (stehen fest). Gebaut entlang +y, dann um ihre Lage THETA gedreht (0: oben, π: unten;
// nach der Drehung GEN_ROT: rechts bzw. links).
export const COIL = {
  THETA: [0, Math.PI],        // Lage von Spule 1 und Spule 2 (gegen den Uhrzeigersinn von oben aus)
  CORE_R: 2.2,                // Radius des Eisenkerns
  CORE_IN: 7.4,               // Kern beginnt so weit von der Achse (Polschuh, Luftspalt zum Magneten 1,4 cm)
  CORE_OUT: 15.5,             // ... und endet hier (am Joch)
  WIND_IN: 8.9,               // Wicklung von ... bis
  WIND_OUT: 14,
  WIND_R: 3.0,                // Radius der Wicklung (Mitte des Drahts)
  TURNS_SHOWN: 11,            // sichtbare Windungen (die echte Spule hat TURNS)
  TERMINAL_Y: 14.9,           // Anschlüsse: Abstand von der Achse
  TERMINAL_X: 1.3,            // Anschluss A oben, E unten (nach der Drehung GEN_ROT) – bei beiden Spulen
  TERMINAL_Z: 3.2,
};

// Eisenjoch (Stator-Ring, nur bei zwei Spulen): verbindet die Kerne außen
export const YOKE = { R_IN: 15.5, R_OUT: 17, DEPTH: 4 };

// Tisch (Oberkante knapp unter dem Joch) und Ständer hinter dem Polrad: senkrechte Säule bis zur Welle, darauf ein
// waagrechter Balken, an dem beide Spulen hängen
export const TABLE_TOP = -(YOKE.R_OUT + 2.5);
export const STAND = { Z: -5, DEPTH: 1, WIDTH: 4, BAR_W: 32, BAR_H: 3 };   // Mitte in z, Dicke, Breite der Säule, Balken

// Welle und Kurbel (vorne auf der Welle; der Arm steht 90° neben dem Nordpol, damit er den Magneten nicht verdeckt)
export const SHAFT = { R: 0.5, Z_MIN: -4.5, Z_MAX: 5.9 };
export const CRANK = { Z: 5.2, ARM: 5, KNOB_LEN: 3.5, OFFSET: Math.PI / 2 };

// Antrieb „Wind“ (wie in generator-leiterschleife): Rotor einer Windkraftanlage auf derselben Welle, hinter dem
// Ständer. Didaktisch vereinfacht: ab CUT_IN dreht er proportional zum Wind (bei 12 m/s 14 U/min wie im Windpark).
export const TURBINE = {
  CUT_IN: 3,                  // Einschaltgeschwindigkeit in m/s
  RPM_PER_WIND: 14 / 12,      // Drehzahl in U/min je m/s Wind
  SPIN_TIME: 1.5,             // Trägheit: Drehzahl folgt mit dieser Zeitkonstante (s)
  Z: -8.5,                    // Lage der Nabe auf der Welle (hinter dem Ständer)
  BLADE: 1.45,                // Größe der Blätter (1: wie in generator-leiterschleife, 9 cm lang; hier gut 13 cm,
                              // damit sie hinter Magnet und Spulen herausragen)
};
export const WIND_MAX = 20;   // Wind-Regler bis 20 m/s

// Physikalische Modellgrößen (SI)
export const B_MAX = 0.1;                                    // größte Flussdichte im Spulenkern in T
export const TURNS = 500;                                    // Windungen je Spule
export const CORE_AREA = Math.PI * 0.017 ** 2;              // Querschnitt des Kerns in m² (≈ 9 cm²; gezeichnet etwas dicker)
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

// Feldlinien (feldlinienModell.js): so viele verlassen den Nordpol; Stärke der vom Magneten magnetisierten
// Eisenkerne (Anteil der Polstärke des Magneten, wenn ein Pol auf den Kern zeigt)
export const FIELD_LINES = 10;
export const CORE_STRENGTH = 0.3;

// Pfeil für B im Spuleninneren: Länge in cm bei B_MAX
export const B_ARROW = 4.6;

// Diagramme: so viele Sekunden (Simulationszeit) sind sichtbar; B-Achse bis ±B_PLOT mT
export const PLOT_SECONDS = 4;
export const PLOT_SECONDS_WIND = 12;   // beim Antrieb „Wind“ (langsame Rotordrehung: eine Umdrehung dauert 4–20 s)
export const B_PLOT = 120;
