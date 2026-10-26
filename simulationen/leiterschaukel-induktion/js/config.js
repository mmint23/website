// ------------------------------------------------------------------
// Maße und Modellgrößen des Versuchs
// Maße in cm (1 Einheit ≙ 1 cm), physikalische Größen in SI-Einheiten.
// Koordinaten: x = nach rechts (entlang des Leiterstabs), y = nach oben, z = nach vorne (zum Betrachter).
// Ursprung der Versuchsgeometrie: Lage der Stabmitte, wenn die Schaukel ruhig hängt (AXIS).
// ------------------------------------------------------------------

// Ruhelage der Stabmitte (beim drehbaren Magneten zugleich seine Drehachse). Der lange Magnet braucht eine
// höhere Drehachse, damit sein Bogen beim Drehen nicht in den Tisch fährt.
export const AXIS_Y = 18;
export const AXIS_Y_LONG = 26;

// Leiterschaukel: Kupferstab an zwei starren Messingbügeln, die an einer Querstange hängen
export const SWING = {
  LENGTH: 22,                 // Pendellänge: Querstange bis Stabachse
  BAR_LEN: 15,                // Länge des Kupferstabs
  BAR_R: 0.4,
  HANGER_X: 7,                // Bügel bei x = ±7 (außerhalb der Polschuhe)
  HANGER_R: 0.18,
  MAX_ANGLE: 50,              // größte Auslenkung beim Ziehen in Grad
};
export const PIVOT_Y = AXIS_Y + SWING.LENGTH;   // Höhe der Querstange (drehbarer Magnet)

// Stativ: zwei Stangen links und rechts, verbunden durch die Querstange
export const STAND = { X: 19, R: 0.6, TOP: AXIS_Y_LONG + SWING.LENGTH + 5 };

// Großer Hufeisenmagnet. Maße im Koordinatensystem des Magneten (Grundstellung α = 0°):
// Er liegt auf der Seite, Schenkel entlang z, ein Pol über und einer unter dem Stab, der Bogen hinten.
// Beim Drehen um die Stabachse (x) wandert der Bogen nach unten; bei α = 90° stehen die Schenkel
// hinter und vor dem Stab, das Feld zeigt dann in Schwingrichtung.
export const MAGNET = {
  GAP: 10,                    // Abstand der Polflächen
  THICK: 3,                   // Dicke der Schenkel
  WIDTH: 6,                   // Breite der Pole (entlang des Stabs) = Länge des Stabs im Feld
  Z_IN: -6,                   // Schenkel beginnen am Bogen ...
  Z_OPEN: 5,                  // ... und enden vorne offen (kurzer Magnet)
  FRINGE: 2.5,                // Randfeld: Abfall auf 0 über 2,5 cm außerhalb des Polbereichs
  HOLDER_X: 11,               // Drehgelenk mit Winkelskala rechts neben dem Magneten
};

// Langer Hufeisenmagnet: Schenkel 32 cm, reichen 16 cm vor und hinter den Stab – die Schaukel kann weit
// ausschwingen (bis ca. 37°, dann stößt der hochschwingende Stab an den oberen Schenkel).
export const MAGNET_LONG = { Z_IN: -16, Z_OPEN: 16 };
export const magnetLegs = long => (long ? MAGNET_LONG : MAGNET);

// Die beiden Versuchsaufbauten. Beim Magneten auf dem Tisch liegt der Polspalt tiefer,
// deshalb ist die Querstange am Stativ entsprechend tiefer eingespannt.
export const SETUPS = {
  drehbar: {
    title: 'Drehbarer Magnet',
    camPos: [22, 44, 112],
    camTarget: [28, 20, 0],
  },
  tisch: {
    title: 'Magnet auf dem Tisch',
    camPos: [22, 38, 112],
    camTarget: [28, 14, 0],
  },
};
// Höhe der Stabachse (Ruhelage) je nach Versuch und Magnet
export const axisHeight = (setup, long) =>
  setup === 'tisch' ? MAGNET.THICK + MAGNET.GAP / 2 : long ? AXIS_Y_LONG : AXIS_Y;

// Magnet auf dem Tisch: Verschiebebereich (Lage des Polbereichs relativ zum Stab in cm) und Ziehgeschwindigkeit.
// Nach hinten höchstens so weit, dass der Bogen vor dem hinten verlegten Kabel (z = −44) bleibt.
export const magnetZRange = long => [-38 - magnetLegs(long).Z_IN + MAGNET.GAP / 2 + MAGNET.THICK, 30];
export const MAGNET_DRAG_MAX_SPEED = 1.5;      // in m/s

// Physikalische Modellgrößen (SI)
export const B_FIELD = 0.1;                    // Flussdichte zwischen den Polen in T
export const L_FIELD = MAGNET.WIDTH / 100;     // Länge des Stabs im Feld in m
export const G = 9.81;
export const PENDULUM_L = SWING.LENGTH / 100;  // in m
export const SWING_MASS = 0.08;                // Kupferstab (≈ 60 g) und Bügel, in kg
export const AIR_DAMPING = 0.1;                // Dämpfung durch Luft und Lager in 1/s
export const CIRCUIT_R = 1;                    // Widerstand des Stromkreises bei Strommessung in Ω
export const BRAKE_BOOST = 1000;               // Gedankenexperiment: Bremskraft 1000-fach verstärkt
export const MAGNET_TURN_SPEED = 45;           // Drehgeschwindigkeit des Magneten in °/s
export const DRAG_TIME = 0.05;                 // Ziehen: Schaukel folgt dem Finger mit dieser Zeitkonstante (s)
export const DRAG_MAX_OMEGA = 7;               // ... höchstens mit dieser Winkelgeschwindigkeit (rad/s)
export const PUSH_ANGLE = 15;                  // „Auslenken und loslassen“: Startwinkel in Grad (nach vorne)
export const PUSH_ANGLE_LONG = 25;             // ... beim langen Magneten

// Erklärmodus „Elektron im Leiter“: dickerer, durchsichtiger Stab mit einem Elektron. Das Elektron wandert
// stark verlangsamt entlang des Stabs: Geschwindigkeit = DRIFT · (Lorentzkraft pro Ladung in V/m).
export const EXPLAIN = {
  BAR_R: 1.2,                 // Radius des Stabs im Erklärmodus (auch für Anschläge)
  ELECTRON_R: 0.6,
  DRIFT: 330,                 // in cm/s pro V/m
  ELECTRON_MARGIN: 1,         // Elektron bleibt so weit vor dem Stabende stehen
  // „Viele Elektronen“: so viele Elektronen und ortsfeste positive Atomrümpfe, gleichmäßig verteilt; am Stabende
  // drängen sich die Elektronen mit dem Mindestabstand PACK zusammen
  MANY: { COUNT: 11, SPACING: 1.2, PACK: 0.75, R: 0.36, ION_R: 0.32 },
  ARROW_V: 25,                // Pfeillänge in cm pro m/s
  ARROW_F: 200,               // Pfeillänge in cm pro V/m
  ARROW_MAX: 12,
};

// LED statt Messgerät (Gedankenexperiment, siehe README): Schwellspannung 1 mV statt real etwa 1,8 V.
// Darüber wird sie heller und leuchtet bei THRESHOLD + FULL voll; sie leuchtet nur in Durchlassrichtung
// (Anode an der roten Buchse = rechtes Stabende).
export const LED = { THRESHOLD: 1e-3, FULL: 2e-3, POS: [31, 0, 10] };

// Glühlampe statt Messgerät (Gedankenexperiment, noch unrealistischer als die LED, siehe README):
// Der Glühdraht heizt sich mit der Leistung ∝ U² auf (Zeitkonstante HEAT_TIME) und glüht ab THRESHOLD sichtbar,
// bei FULL voll – unabhängig von der Stromrichtung.
export const LAMP = { THRESHOLD: 1.5e-3, FULL: 5e-3, HEAT_TIME: 0.08, POS: LED.POS };

// Öffentliche Adresse (GitHub Pages): für den QR-Code, wenn die Seite lokal geöffnet ist
export const PUBLIC_URL = 'https://mmint23.github.io/website/simulationen/leiterschaukel-induktion/';

// Zeigermessgerät: Zeiger als gedämpfter Schwinger (Eigenfrequenz, Dämpfungsgrad)
export const METER = {
  FREQ: 1.2,                  // in Hz
  DAMPING: 0.55,              // leicht unterkritisch: Zeiger schwingt etwas nach
  FULL_ANGLE: 50,             // Vollausschlag nach jeder Seite in Grad
  STOP: 1.08,                 // Anschlag knapp hinter dem Skalenende (Anteil des Vollausschlags)
  RANGES: [1, 3, 10],         // Messbereiche: ±1, ±3, ±10 mV bzw. mA
};
