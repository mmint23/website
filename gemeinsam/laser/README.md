# Laserpointer: mit Stift oder Maus zeigen, wovon man spricht

Gemeinsamer Baustein für alle Simulationen der Website (genutzt von Leiterschaukel, Generator-Modell und
Innenpolgenerator). Der Knopf **„Laserpointer“** (am Laptop auch die Taste **L**) schaltet ihn ein: Mit **Apple
Pencil oder Maus** markiert man Stellen; die Spur leuchtet rot über allem und verblasst etwa 1,5 Sekunden nach dem
Absetzen. An Simulation und Tafel ändert sich nichts.

- Solange er an ist, bedienen Stift und Maus die Simulation nicht (Ansicht drehen, Ziehen, Schreiben auf der Tafel).
  **Finger** funktionieren weiter; Knöpfe, Regler und Eingabefelder auch mit Stift oder Maus.
- Läuft vollständig im Browser, also auch auf GitHub Pages ohne Abgabe-Server.
- **Tafel** (gemeinsam/tafel/): Ist sie offen, markiert der Laser auf dem Tafelbild. Einen Knopf für ihre
  Werkzeugleiste liefert `laserKnopf()`.
- **Live-Steuerung** (gemeinsam/live/): Die sichtbaren Spuren des steuernden Geräts gehen mit. Szenenspuren als
  Punkte in der 3D-Szene (auf der Ebene durch den Drehpunkt der Ansicht), damit sie auf jedem Bildschirm am selben
  Teil des Modells liegen; Tafelspuren in Tafeleinheiten, damit sie an derselben Stelle des Tafelbilds liegen. An/aus
  bleibt auf jedem Gerät für sich, der Knopf ist auch beim Zuschauen bedienbar (`live-frei`).

## In eine Simulation einbauen

1. Knopf in die `index.html` (z. B. oben ins Bedienfeld):

   ```html
   <button class="laser-btn live-frei" data-laser type="button" aria-pressed="false"
     title="Mit Apple Pencil oder Maus markieren (Taste L)">Laserpointer</button>
   ```

2. Im JavaScript der Simulation (z. B. `js/main.js`), mit Renderer, Kamera und OrbitControls der Simulation:

   ```js
   import { initLaser, laserKnopf } from '../../../gemeinsam/laser/laser.js';
   import { initTafel, tafelOffen, zuTafel, vonTafel } from '../../../gemeinsam/tafel/index.js';

   initTafel({ /* … */, leisteZusatz: [laserKnopf()] });          // nur mit Tafel
   initLaser({ renderer, camera, controls,
     tafel: { offen: tafelOffen, zu: zuTafel, von: vonTafel } });   // ohne Tafel: tafel weglassen
   ```

3. Live-Steuerung (in `js/live.js` der Simulation): in `lesen` `laserSpuren: laserDaten()` mitschicken, in
   `schreiben` `fremdeLaser(daten.laserSpuren)` aufrufen und in `beiWechsel` `fremdeLaser([])`. Nicht in `glaetten`
   eintragen.

Aussehen (`laser.css`, lädt der Baustein selbst): Zeichenfläche über allem, Fadenkreuz, roter Knopf (in `.panel`,
`.popup` und `.tafel-leiste`). Die Simulation kann es in ihrem eigenen Stylesheet überschreiben.

| Export | Aufgabe |
|---|---|
| `initLaser({ renderer, camera, controls, tafel? })` | Einmal beim Start; legt die Zeichenfläche an, verbindet alle Knöpfe mit `data-laser`, Taste L |
| `laserKnopf()` | Fertiger Knopf, z. B. für `leisteZusatz` der Tafel (vor oder nach `initLaser`) |
| `setzeLaser(an)`, `laserAn()` | Ein-/Ausschalten bzw. abfragen |
| `laserDaten()`, `fremdeLaser(daten)` | Live-Steuerung: eigene Spuren senden bzw. fremde zeichnen (leere Liste: keine) |
