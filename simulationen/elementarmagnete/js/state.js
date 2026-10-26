// ------------------------------------------------------------------
// Zustand der Simulation und feste Maße (Welt-Einheiten, y nach oben)
// ------------------------------------------------------------------
import { erzeugeElementarmagnete } from './modell.js';

export const STUECK = { b: 14, h: 2.4, spalten: 14, zeilen: 3 };   // Eisenstück (Mitte im Ursprung)
export const MAGNET = { b: 1.3, l: 6 };                            // Stabmagnet (senkrecht)
export const SPULE = { halb: 7, r: 1.9, windungen: 15 };           // Spule um das Eisenstück
export const KERN_DRAUSSEN = 17;                                   // so weit wird der Eisenkern herausgezogen
export const I_MAX = 5;                                            // A

export const state = {
  modus: 'streichen',            // 'streichen' (Stabmagnet) oder 'spule' (Spule mit Eisenkern)
  material: 'stahl',             // 'weicheisen' oder 'stahl'
  magnete: erzeugeElementarmagnete(STUECK.spalten, STUECK.zeilen, STUECK.b, STUECK.h),
  // Stabmagnet: Mitte und Pol unten
  magnetX: 9.5, magnetY: 5.2, unten: 'N',
  // Spule
  stromAn: false, strom: 3, polung: 1,
  kernZiel: 0, kernX: 0,         // Verschiebung des Eisenkerns (0 = in der Spule)
  // Anzeigen
  zeigeFeld: false, zeigeKompass: true, zeigePole: true,
};

/** Alle Elementarmagnete wieder ungeordnet */
export function entmagnetisieren() {
  state.magnete = erzeugeElementarmagnete(STUECK.spalten, STUECK.zeilen, STUECK.b, STUECK.h);
}
