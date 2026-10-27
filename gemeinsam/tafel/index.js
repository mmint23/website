// ------------------------------------------------------------------
// Zeichentafel mit Abgabe an die Lehrkraft – Einstieg für eine Simulation (Anleitung: README.md)
//
//   import { initTafel, oeffneTafel } from '../../gemeinsam/tafel/index.js';
//   initTafel({ id: 'meine-simulation', bild: 'bilder/tafel.jpg' });
//   meinKnopf.addEventListener('click', oeffneTafel);
//
// Läuft die Seite über den Abgabe-Server (website/server), gibt es zusätzlich „Teilen“ (Schüler) und die
// Lehrerseite (?lehrer); sonst ist es eine reine Zeichentafel.
// ------------------------------------------------------------------
import { initTafel as tafelEinrichten } from './tafel.js';
import { initAbgabe } from './abgabe.js';

export function initTafel(optionen) {
  tafelEinrichten(optionen);
  initAbgabe();
}

export {
  oeffneTafel, schliesseTafel, tafelOffen, aufAnzeige, aktuellesDokument, tafelBild, tafelHoehe,
  aktuelleSeite, seitenBild, aufSeitenwechsel, stricheDerSeite,
} from './tafel.js';
export { zeichneAlle, seiteVon, TAFEL_BREITE } from './striche.js';
