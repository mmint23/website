// ------------------------------------------------------------------
// Maße und Größen des Windparks (Landschaft in Metern) und Dauern der Übergänge
// ------------------------------------------------------------------

// Windpark (Landschaft in Metern): Windräder laufen ab CUT_IN an, drehen mit wachsendem Wind schneller und
// ab RATED mit Nenndrehzahl (wie echte Anlagen mit drehzahlvariablem Betrieb, ohne Abschaltung bei Sturm)
export const TURBINE = {
  CUT_IN: 3,                  // Einschaltgeschwindigkeit in m/s
  RATED: 12,                  // ab hier Nenndrehzahl
  RPM_MIN: 6,                 // Drehzahl beim Anlaufen in U/min
  RPM_RATED: 14,              // Nenndrehzahl in U/min
  SPIN_TIME: 3,               // Trägheit: Drehzahl folgt mit dieser Zeitkonstante (s)
  HUB_HEIGHT: 90,             // Nabenhöhe in m
  BLADE: 45,                  // Blattlänge in m
};
export const WIND_MAX = 20;   // Wind-Regler bis 20 m/s

// Übergänge (Dauern in s): Kamerafahrt zur Gondel bzw. vor die Haustür, Gondel wird durchsichtig (danach bleibt die
// Ansicht stehen, bis noch einmal getippt wird), Ausblenden vor dem Wechsel, Einblenden im Wohnzimmer
export const TRANSITION = { FLY: 2.8, REVEAL: 1.1, FADE_OUT: 0.7, FADE_IN: 0.7 };
