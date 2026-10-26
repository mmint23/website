// ------------------------------------------------------------------
// Zustand der Simulation und Farben der Stellenwerte
// ------------------------------------------------------------------
import { EINHEIT, STELLEN } from './zahl.js';

// Je Stufe eine Farbe: Fläche im Quadrat (hell) und Schrift in der Stellenwerttafel (kräftig)
export const FARBEN = [
  { flaeche: '#9fa8da', schrift: '#283593' },   // Ganze
  { flaeche: '#64b5f6', schrift: '#1565c0' },   // Zehntel
  { flaeche: '#81c784', schrift: '#2e7d32' },   // Hundertstel
  { flaeche: '#ffb74d', schrift: '#e65100' },   // Tausendstel
  { flaeche: '#ce93d8', schrift: '#7b1fa2' },   // Zehntausendstel
];

const beobachter = [];

export const STRAHL_BIS = 3;     // Zahlenstrahl von −3 bis 3
export const STRAHL_STELLEN = 3; // Zahlenstrahl bis zu den Tausendsteln

export const state = {
  n: 0,                 // dargestellte Zahl in Zehntausendsteln (3470 = 0,347)
  quadrate: 1,          // Anzahl der Quadrate (1, 2 oder 3)
  darstellung: 'quadrat',   // 'quadrat' oder 'strahl' (Zahlenstrahl)
  einteilung: 'rechtecke',   // 'rechtecke' (Zehnerfeld 5 × 2) oder 'streifen' (10 Streifen), siehe zahl.js
  lupe: false,          // Antippen zoomt statt zu färben
  zeigeTafel: false,    // Stellenwerttafel eingeblendet (per Knopf)
  skala: 0,             // Zahlenstrahl: feinste Einteilung (0 Ganze, 1 Zehntel, 2 Hundertstel, 3 Tausendstel)
  antippen: false,      // Zahlenstrahl: Antippen markiert die Zahl am nächsten Strich (per Knopf, anfangs aus)
  zeigeStrecke: true,   // Zahlenstrahl: Zahl als dicke farbige Strecke ab 0 (je Stelle in ihrer Farbe; anfangs an)
  aufKnopfdruck: true,  // Zahlenstrahl: eingegebene Zahl erst markieren, wenn man es per Knopf will (anfangs an)
  verdeckt: false,      // Zahlenstrahl: Zahl ist eingegeben, aber noch nicht markiert
  bruch: null,          // als Bruch eingegeben: { negativ, ganze, zaehler, nenner } (sonst null)
  get strahl() { return this.darstellung === 'strahl'; },
  get max() { return (this.strahl ? STRAHL_BIS : this.quadrate) * EINHEIT; },
  get min() { return this.strahl ? -STRAHL_BIS * EINHEIT : 0; },
  /**
   * Zahl setzen (begrenzt: Quadrat 0 … Anzahl der Quadrate, Zahlenstrahl −3 … 3 auf Tausendstel) und alle Anzeigen
   * auffrischen. bruch: so wurde die Zahl eingegeben; verdeckt: am Zahlenstrahl noch nicht markieren.
   */
  setze(n, { bruch = null, verdeckt = false } = {}) {
    if (this.strahl) n = Math.round(n / 10 ** (STELLEN - STRAHL_STELLEN)) * 10 ** (STELLEN - STRAHL_STELLEN);
    const vorher = Math.round(n);
    this.n = Math.max(this.min, Math.min(this.max, vorher));
    this.bruch = this.n === vorher ? bruch : null;
    this.verdeckt = this.strahl && verdeckt;
    for (const f of beobachter) f();
  },
  beiAenderung(f) { beobachter.push(f); },
};
