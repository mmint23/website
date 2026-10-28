// ------------------------------------------------------------------
// Maße und Modellgrößen des Generator-Modells
// Maße in cm (1 Einheit ≙ 1 cm), physikalische Größen in SI-Einheiten.
// Koordinaten: x = nach rechts (entlang der Welle), y = nach oben, z = nach vorne (zum Betrachter).
// Ursprung: Mitte zwischen den Polen, auf der Drehachse.
// ------------------------------------------------------------------

// Leiterschleife: Rechteck auf der Welle. Die beiden Längsseiten (parallel zur Welle) laufen im Abstand
// RADIUS um die Achse; nur sie schneiden Feldlinien. Die Querseiten verbinden sie an den Enden.
export const LOOP = {
  LENGTH: 10,                 // Länge der Längsseiten (entlang der Welle)
  RADIUS: 4,                  // Abstand der Längsseiten von der Achse (Breite der Schleife: 8 cm)
  WIRE_R: 0.22,
};

// Spule statt Leiterschleife (Knopf): TURNS Windungen, im Abstand DY übereinander gewickelt (quer zur Ebene der
// Schleife, die Leiterschleife ist die erste Windung) und hintereinander verbunden – nur der Anfang (Ende A) und das
// Ende (Ende B) führen zu den Schleifringen. Umbau in ANIM Sekunden: Zuleitung von Ende B ab, weitere Windungen
// wickeln, Zuleitung von der letzten Windung an (beim Abbau rückwärts); solange ist der Kreis offen.
// Die Spannung wird TURNS-mal so groß. Im Messbereich ±15 mV sind bei 0,5 U/s beide Kurven im selben Maßstab gut zu
// sehen (Leiterschleife etwa 17 %, Spule etwa 84 % der U-Achse).
// Im Erklärmodus dünnerer, durchsichtiger Draht mit größerem Abstand; Elektronen und Pfeile bleiben auf der ersten
// Windung (der Leiterschleife).
export const COIL = { TURNS: 5, DY: 1.0, EXPLAIN_DY: 1.2, EXPLAIN_WIRE_R: 0.4, ANIM: 3 };

// Magnet: zwei Polblöcke über (Nordpol) und unter (Südpol) der Schleife, dazwischen ein gleichmäßiges Feld
export const MAGNET = {
  GAP: 14,                    // Abstand der Polflächen (die Schleife dreht sich frei dazwischen)
  THICK: 5,                   // Dicke der Polblöcke
  WIDTH: 13,                  // Ausdehnung entlang der Welle (deckt die Längsseiten ganz ab)
  DEPTH: 13,                  // Ausdehnung nach vorne/hinten
};

// Tisch: Oberkante unter dem Magneten (der Hufeisenmagnet steht mit dem unteren Polblock auf dem Tisch)
export const TABLE_TOP = -(MAGNET.GAP / 2 + MAGNET.THICK);

// Welle (liegt in zwei Lagerböcken), Schleifringe, Bürsten, Kurbel
export const SHAFT = { R: 0.4, X_MIN: -15, X_MAX: 15, BEARINGS: [-9.5, 13.6] };   // BEARINGS: x der Lagerböcke
export const RINGS = { X: [9, 11.5], R: 1.3, WIDTH: 0.9, SLEEVE_R: 1.0, LEAD_R: 1.15 };   // LEAD_R: Zuleitungen liegen auf der Hülse
export const RINGS_ANIM = 1.8;   // Erklärmodus: Dauer des An- bzw. Abbaus der Schleifringe in s
export const CRANK = { X: -13, ARM: 5, KNOB_LEN: 3.5 };

// Physikalische Modellgrößen (SI)
export const B_FIELD = 0.1;                                   // Flussdichte zwischen den Polen in T
export const SIDE_LENGTH = LOOP.LENGTH / 100;                 // Länge einer Längsseite in m
export const LOOP_AREA = SIDE_LENGTH * 2 * LOOP.RADIUS / 100; // Fläche der Schleife in m²
export const SPEED_MAX = 3;                                   // Drehzahl-Regler: bis 3 Umdrehungen pro Sekunde
export const SPEED_TIME = 0.4;                                // Drehzahl stellt sich mit dieser Zeitkonstante (s) ein
export const CRANK_TIME = 0.05;                               // Kurbel: Schleife folgt dem Finger mit dieser Zeitkonstante
export const CRANK_MAX_OMEGA = 40;                            // ... höchstens so schnell (rad/s, gut 6 U/s)
export const FRICTION = 0.25;                                 // freies Auslaufen nach dem Loslassen: Abbremsung in 1/s
export const FRICTION_STOP = 0.15;                            // darunter (rad/s) bleibt die Schleife stehen

// Erklärmodus: dicke, durchsichtige Schleife mit Elektronen in den Längsseiten, Pfeile v und F_L.
// Die Elektronen verschieben sich entlang der Längsseiten um ELECTRON_SHIFT · (Lorentzkraft pro Ladung in V/m),
// mit kurzer Verzögerung (ELECTRON_TIME) – im Takt der Wechselspannung (Ladungstrennung ∝ Spannung).
export const EXPLAIN = {
  WIRE_R: 0.6,                // Radius des Drahts im Erklärmodus
  CORNER_R: 1.1,              // Ecken der Schleife im Erklärmodus: Biegeradius (Mitte des Drahts)
  MAGNET_OPACITY: 0.3,        // Deckkraft des Magneten mit „Magnet durchsichtig“
  OPACITY: 0.88,              // Deckkraft der Schleife im Erklärmodus (Elektronen bleiben sichtbar)
  OPEN_END: 1.4,              // offene Enden der Schleife: so weit von der Achse (ohne Schleifringe)
  ELECTRON_R: 0.42,
  ELECTRON_SHIFT: 120,        // in cm pro V/m
  ELECTRON_MAX: 2.8,          // größte Verschiebung in cm (bleiben in der Längsseite)
  ELECTRON_TIME: 0.12,        // in s
  // „viele e⁻“: Elektronen und ortsfeste Atomrümpfe über die ganze Schleife (von Ende zu Ende); die Elektronen
  // verschieben sich um MANY_SHIFT · (Lorentzkraft pro Ladung) und drängen sich an einem Ende zusammen
  MANY_COUNT: 21,
  MANY_MARGIN: 0.5,           // Abstand des äußersten Elektrons vom Drahtende in cm
  MANY_PACK: 0.75,            // Mindestabstand dicht gedrängter Elektronen in cm
  MANY_SHIFT: 1000,           // in cm pro V/m
  ARROW_V: 40,                // Pfeillänge in cm pro m/s
  ARROW_F: 400,               // Pfeillänge in cm pro V/m
  ARROW_MAX: 9,
};

// Zeigermessgerät (wie bei der Leiterschaukel): gedämpfter Schwinger
export const METER = {
  FREQ: 1.2,                  // Eigenfrequenz in Hz
  DAMPING: 0.55,              // leicht unterkritisch
  FULL_ANGLE: 50,             // Vollausschlag nach jeder Seite in Grad
  STOP: 1.08,                 // Anschlag knapp hinter dem Skalenende
  RANGES: [3, 10, 15, 30],    // Messbereiche ±3, ±10, ±15, ±30 mV (±15: Leiterschleife und Spule im selben Maßstab)
};

// Antrieb „Wind“, didaktisch vereinfacht: Der Rotor läuft ab CUT_IN an und dreht dann proportional zur
// Windgeschwindigkeit – über den ganzen Regler, ohne Nenndrehzahl (echte Anlagen: siehe README, „Antrieb Wind:
// vereinfacht“). Bei 12 m/s dreht er wie die Windräder im Windpark mit 14 U/min, bei 20 m/s mit gut 23 U/min.
export const TURBINE = {
  CUT_IN: 3,                  // Einschaltgeschwindigkeit in m/s
  RPM_PER_WIND: 14 / 12,      // Drehzahl in U/min je m/s Wind
  SPIN_TIME: 1.5,             // Trägheit: Drehzahl folgt mit dieser Zeitkonstante (s)
};
export const WIND_MAX = 20;   // Wind-Regler bis 20 m/s

// U-t-Diagramm: so viele Sekunden (Simulationszeit) sind sichtbar
export const PLOT_SECONDS = 4;
export const PLOT_SECONDS_WIND = 12;   // beim Antrieb „Wind“ (langsame Rotordrehung: eine Umdrehung dauert 4–10 s)
