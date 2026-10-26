// ------------------------------------------------------------------
// Maße und Modellgrößen des Versuchs
// Maße in cm (1 Einheit ≙ 1 cm), physikalische Größen in SI-Einheiten.
// Koordinaten: x = entlang der Schienen, y = nach oben, z = quer zu den Schienen (entlang der Stange)
// ------------------------------------------------------------------
export const RAIL_GAP = 20;          // Abstand der Schienen
export const RAIL_LEN = 60;
export const RAIL_R = 0.5;
export const BAR_LEN = 30;
export const BAR_R = 0.6;
export const I_MAX = 10;             // maximale Stromstärke des Netzgeräts in A

// Kleiner Hufeisenmagnet (Grundversuch): liegt auf der Seite zwischen den Schienen,
// Schenkel entlang der Schienen, ein Pol über, einer unter der Stange
export const SMALL = {
  OUTER_R: 6.3,               // Außenradius des Bogens
  INNER_R: 2.3,               // Innenradius des Bogens
  ARM_LEN: 30,
  DEPTH: 8,                   // Breite der Schenkel (quer zu den Schienen)
  X: 14,                      // x-Position des Bogenmittelpunkts
};

// Großer Hufeisenmagnet (drehbarer Magnet): die Schenkel umschließen Schienen und Stange.
// Er ist um die Stangenachse parallel zu den Schienen drehbar (α = 90° … 180°). Bei α = 90° liegen die Schenkel
// über und unter der Stange (Feld senkrecht), bei α = 180° stehen sie hinter und vor der Stange (Feld parallel),
// der Bogen liegt dann unter den Schienen und verdeckt die Stange nicht.
export const LARGE = {
  GAP_HALF: 16,               // Abstand der Polfläche von der Drehachse
  THICK: 4,                   // Dicke der Schenkel
  WIDTH: 20,                  // Ausdehnung entlang der Schienen
  LEG_Z_MIN: -12,             // Schenkel beginnen hinter der hinteren Schiene ...
  LEG_Z_MAX: 14,              // ... und enden vor der vorderen Schiene
};

// Physikalische Modellgrößen (SI-Einheiten)
export const BAR_MASS = 2700 * Math.PI * 0.006 ** 2 * 0.30;   // Aluminium, r = 6 mm, l = 30 cm → ca. 92 g
export const ROLL_FACTOR = 1.5;                      // rollender Vollzylinder: a = F / (1,5 · m)
export const ROLL_DECEL = 0.02;                      // Bremsung durch Rollreibung in m/s²
export const FRINGE = 2;                             // Randfeld: Abfall auf 0 über 2 cm hinter dem Polende
export const BOUNCE = 0.15;                          // Rückprall am Anschlag (Anteil der Geschwindigkeit)
export const BAR_START_X = 0;
export const RAIL_END_STOP = RAIL_LEN / 2 + 0.6 - 1 - BAR_R;   // Anschlag an den Klemmen der Schienenenden
export const MAGNET_TURN_SPEED = 60;                 // Drehgeschwindigkeit des großen Magneten in °/s

// „Hau den Lukas“: Beim Anschlagen der Stange wird ein Schieber an einer Skala hochgeschleudert.
// Steighöhe h = Verstärkung · v² (v = Aufprallgeschwindigkeit) ist proportional zur Bewegungsenergie.
// Da die Stange im Feld immer etwa dieselbe Strecke beschleunigt wird, ist h ein Maß für die Kraft.
export const LUKAS = {
  Z: -20,                     // Position hinter der hinteren Schiene
  HEIGHT: 26,                 // Skalenlänge in cm (Skalenwerte 0 … 10)
  GRAVITY: 250,               // Fallbeschleunigung des Schiebers in cm/s² (verlangsamt, gut sichtbar)
  MIN_SPEED: 0.03,            // kleinere Aufprallgeschwindigkeiten (in m/s) lösen nichts aus
};

// Die beiden Versuchsaufbauten
export const SETUPS = {
  basic: {
    title: 'Grundversuch',
    railY: 5.5,                               // Höhe der Schienenachse über dem Tisch
    bField: 0.1,                              // Flussdichte zwischen den Polen in T
    lInField: SMALL.DEPTH / 100,              // Länge der Stange im Feld (= Breite der Pole) in m
    fieldXMin: SMALL.X - SMALL.ARM_LEN,       // freies Ende der Schenkel
    fieldXMax: SMALL.X + SMALL.INNER_R,       // Innenseite des Bogens
    rotatable: false,
    lukasGain: 120,                           // Steighöhe in cm pro (m/s)²
    camPos: [-46, 44, 96],
    camTarget: [2, 4, -14],
  },
  angle: {
    title: 'Drehbarer Magnet',
    railY: 32,                                // höher, damit der Bogen des großen Magneten bei 180° über dem Tisch bleibt
    bField: 0.04,
    lInField: RAIL_GAP / 100,                 // stromdurchflossene Länge (Schiene bis Schiene)
    fieldXMin: -LARGE.WIDTH / 2,
    fieldXMax: LARGE.WIDTH / 2,
    rotatable: true,
    lukasGain: 200,                           // höher, da die Stange hier kürzer im Feld beschleunigt wird
    camPos: [-60, 68, 112],
    camTarget: [0, 20, -12],
  },
};

export const barHeight = setup => setup.railY + RAIL_R + BAR_R;

// Anschläge der Stange: links die Klemmen; rechts die Klemmen bzw. der Bogen des kleinen Magneten
export function barLimits(setup) {
  if (setup.rotatable) return [-RAIL_END_STOP, RAIL_END_STOP];
  const dy = barHeight(setup) - SMALL.OUTER_R;
  return [-RAIL_END_STOP, SMALL.X + Math.sqrt(SMALL.INNER_R ** 2 - dy ** 2) - BAR_R];
}
