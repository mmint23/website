// ------------------------------------------------------------------
// Zustand des Versuchs (wird vom Bedienfeld geändert und von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
import { SETUPS } from './config.js';

export const state = {
  mode: 'basic',      // 'basic' (Grundversuch) oder 'angle' (drehbarer Magnet)
  powerOn: false,
  current: 4,         // eingestellte Stromstärke in A
  polarity: 1,        // +1: Plus an vorderer Schiene, −1: Plus an hinterer Schiene
  northUp: true,      // Nordpol oben, Südpol unten (beim drehbaren Magneten in Grundstellung α = 90°)
  fieldScale: 1,      // Vielfaches der Flussdichte des Magneten (Gedankenexperiment, 0 … 2)
  angle: 90,          // eingestellter Winkel α zwischen Feld und Strom in Grad
  magnetAngle: 90,    // aktueller Drehwinkel des Magneten (läuft dem eingestellten Winkel hinterher)
  friction: true,
  showLukas: false,   // Kraftmesser („Hau den Lukas“) eingeblendet
  showHand: false,    // feste Merkhand zur Drei-Finger-Regel eingeblendet
  showSolution: false, // mitdrehende Lösungshand eingeblendet
};

export const currentSetup = () => SETUPS[state.mode];
