// ------------------------------------------------------------------
// Zustand der Simulation an einer Stelle: Einstellungen (Bedienfeld), bewegte Teile (Physik), Ansicht und Tafel.
// Die Darstellung wird in jedem Bild daraus gezeichnet. Alles außer tafel.dokument (enthält den Verlauf
// für „Rückgängig“) ist reines JSON – zustandAlsDaten() liefert eine Kopie, z. B. um später eine Simulation
// live auf ein anderes Gerät zu spiegeln.
// ------------------------------------------------------------------
export const state = {
  setup: 'drehbar',   // 'drehbar' (Magnet im Drehgelenk) oder 'tisch' (Magnet liegt auf dem Tisch, verschiebbar)
  longMagnet: false,  // langer Hufeisenmagnet (Schenkel 32 statt 11 cm)
  northUp: true,      // Nordpol am oberen Schenkel (in Grundstellung α = 0°)
  angle: 0,           // eingestellter Drehwinkel α des Magneten in Grad (0° … 90°)
  magnetAngle: 0,     // aktueller Drehwinkel (läuft dem eingestellten Winkel hinterher)
  cablesSwapped: false, // Kabel am Messgerät bzw. an der LED vertauscht (rot an −, schwarz an +)
  display: 'meter',   // Anzeige am Ende der Kabel: 'meter' (Zeigermessgerät), 'led' oder 'lamp' (Gedankenexperimente)
  meterMode: 'U',     // 'U': Spannung messen (hochohmig, kein Strom) · 'I': Strom messen (Kreis geschlossen)
  range: 3,           // Messbereich ±3 mV bzw. ±3 mA
  brakeBoost: false,  // Gedankenexperiment: Bremskraft bei Strommessung stark verstärkt
  slowMotion: false,
  showValue: false,   // Messwert zusätzlich als Zahl
  explain: false,     // Erklärmodus: nur Magnet und Schaukel, Elektron im Leiter mit Pfeilen und Hand
  showExplainHand: false,
  showElectron: true, // Erklärmodus: beobachtetes Elektron zeigen (bei „Viele Elektronen“: hervorheben)
  manyElectrons: false, // Erklärmodus: viele Elektronen und positive Atomrümpfe statt eines Elektrons
  showV: false,       // Erklärmodus: Pfeil v, Feldlinien B, Pfeil F_L ein-/ausblenden (zu Beginn aus)
  showB: false,
  showF: false,
  hold: false,        // Erklärmodus: Leiter festgehalten (pendelt nicht), Lage per Schieberegler oder Ziehen
  paused: false,      // Pause (Versuch und Erklärmodus): alles steht im aktuellen Zustand, Pfeile zeigen den Augenblick
  meterAngle: -0.3,   // Drehung des Messgeräts um die senkrechte Achse in rad (zu Beginn leicht zum Betrachter)

  // ---- bewegte Teile (fortgeschrieben von physik.js)
  // Schaukel: Auslenkwinkel θ gegen die Senkrechte (positiv = Stab nach vorne), Winkelgeschwindigkeit ω
  // Festhalten: holdTarget ist die Lage, der der Leiter folgt (Regler bzw. Finger)
  swing: { theta: 0, omega: 0, dragging: false, target: 0, holdTarget: 0 },
  // Magnet auf dem Tisch: Verschiebung z entlang der Schwingrichtung in cm (0 = Stab mitten im Polbereich),
  // Geschwindigkeit v in m/s. Beim drehbaren Magneten bleibt beides 0.
  magnetMotion: { z: 0, v: 0, dragging: false, target: 0 },
  // Zeiger des Messgeräts: Ausschlag als Anteil des Vollausschlags (−1 … 1), Geschwindigkeit
  needle: { pos: 0, vel: 0 },
  // Glühlampe: Temperatur des Glühdrahts als Anteil der Volllast (1 = Leistung bei voller Helligkeit)
  lamp: { heat: 0 },
  // Erklärmodus: Lage des Elektrons entlang des Stabs in cm (0 = Mitte, positiv = rechts).
  // Bei „Viele Elektronen“ ist x die gemeinsame Verschiebung aller Elektronen (siehe electronPositions).
  electron: { x: 0 },
  // Magnet umdrehen: Fortschritt der Animation (ausblenden, Pole tauschen, einblenden)
  flip: { active: false, t: 0, swapped: false },

  // ---- Ansicht (Kamera; wird jedes Bild aus der Maus-/Fingersteuerung übernommen)
  view: { position: [0, 0, 0], target: [0, 0, 0] },

  // ---- Laserpointer (laser.js): Stift und Maus markieren, statt die Simulation zu bedienen
  laser: { on: false },

  // ---- Tafel im Erklärmodus
  tafel: {
    open: false,      // groß geöffnet
    color: 'v',       // Stift: 'v', 'B', 'F', 'schwarz' (siehe FARBEN in striche.js)
    eraser: false,
    mode: 'frei',     // 'frei' (Freihand) oder 'pfeil' (gerader Pfeil)
    eigene: [],       // eigene Zeichnung (Striche, Format siehe striche.js); im Browser gespeichert
    // Was gerade auf der Tafel liegt: { striche, verlauf, bearbeitet } – die eigene Zeichnung oder auf der
    // Lehrerseite die Arbeitskopie einer Abgabe (tafel.js)
    dokument: null,
  },
};

// Kopie des Zustands als reine Daten (ohne Verlauf für „Rückgängig“)
export function zustandAlsDaten() {
  const { dokument, ...tafel } = state.tafel;
  return structuredClone({ ...state, tafel: { ...tafel, striche: dokument?.striche ?? tafel.eigene } });
}
