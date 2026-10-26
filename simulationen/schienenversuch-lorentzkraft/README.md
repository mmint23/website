# Lorentzkraft: Leiter auf Schienen

Interaktive 3D-Simulation für den Physikunterricht. Eine Aluminiumstange liegt quer auf zwei
Metallschienen, die an ein Netzgerät angeschlossen sind. Im Feld eines Hufeisenmagneten wirkt
auf die stromdurchflossene Stange die Lorentzkraft, und die Stange rollt.

## Funktionen

- **Grundversuch:** kleiner Hufeisenmagnet, ein Pol über, einer unter der Stange
- **Drehbarer Magnet:** großer, drehbarer Hufeisenmagnet. Der Winkel zwischen Feld und Strom lässt sich
  von 90° (maximale Kraft) bis 180° (keine Kraft) einstellen. Beim Drehen wandert der Bogen
  des Magneten unter die Schienen und verdeckt die Stange nicht.
- Strom ein/aus, Stromstärke 0–10 A, Polung umkehren, Magnet umdrehen (N ↔ S)
- Magnetfeldstärke B per Schieberegler von 0 bis zum Doppelten des Normalwerts (Gedankenexperiment –
  bei einem echten Dauermagneten ist B fest), um F ∼ B zu untersuchen
- Kraftmesser („Hau den Lukas“) an beiden Schienenenden, per Knopf ein- und ausblendbar: Je stärker
  die Kraft, desto höher fliegt der Schieber. Eine Marke zeigt die größte erreichte Höhe.
- Drei-Finger-Regel der rechten Hand, zwei Knöpfe:
  - „Hand anzeigen“: feste Hand rechts neben dem Aufbau, die sich nie bewegt oder dreht. In den
    Fingern sind Pfeile eingezeichnet: Stromrichtung I (grün, Daumen), Magnetfeldlinien B (blau,
    Zeigefinger), Lorentzkraft F (rot, Mittelfinger).
  - „Lösung anzeigen“: Hand links neben dem Aufbau, die sich nach Polung, Magnet und Winkel
    ausrichtet und so die tatsächlichen Richtungen im Versuch zeigt.
- Reibung zu- und abschaltbar, Messwerte (Kraft, Geschwindigkeit, Zeit) auf Knopfdruck
- Ansicht mit Maus oder Finger drehen und zoomen, geeignet für Tablets

## Starten

Die Simulation läuft im Browser und lädt die 3D-Bibliothek [three.js](https://threejs.org) aus dem
Internet. Weil sie aus mehreren JavaScript-Modulen besteht, muss sie über einen Webserver geöffnet
werden. Ein Doppelklick auf `index.html` reicht nicht.

- **VS Code:** Erweiterung „Live Server“ installieren, dann Rechtsklick auf `index.html` →
  „Open with Live Server“
- **Terminal:** im Projektordner `python3 -m http.server` ausführen und
  <http://localhost:8000> öffnen

## Projektstruktur

```text
schienenversuch-lorentzkraft/
├── index.html          # Seitengerüst und Bedienfeld
├── css/style.css
├── js/
│   ├── main.js         # Start und Render-Schleife
│   ├── config.js       # Maße, Modellgrößen, die beiden Versuchsaufbauten
│   ├── state.js        # Zustand (Strom, Polung, Winkel, …)
│   ├── physik.js       # Lorentzkraft, Bewegung, Kraftmesser (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht, Tisch
│   ├── aufbau.js       # Schienen, Stange, Magnete, Kraftmesser (Darstellung)
│   ├── netzgeraet.js   # Netzgerät und Kabel
│   ├── bedienfeld.js   # Knöpfe, Regler, Anzeigen
│   ├── hand.js         # Hand zur Drei-Finger-Regel
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # gemeinsame Materialien
├── tests/physik.test.mjs
└── package.json
```

## Physikalisches Modell

- Kraft entlang der Schienen: F = I · l · B · sin α. Die Richtung folgt der Drei-Finger-Regel der
  rechten Hand mit technischer Stromrichtung.
- Grundversuch: B = 0,1 T, l = 8 cm (Breite der Pole).
  Drehbarer Magnet: B = 0,04 T, l = 20 cm (Schienenabstand).
- Aluminiumstange ca. 92 g, rollender Vollzylinder (a = F / 1,5 m), Rollreibung 0,02 m/s².
- Kraftmesser: Steighöhe ∝ v² beim Aufprall, also ∝ Bewegungsenergie. Da die Stange immer etwa
  dieselbe Strecke im Feld beschleunigt wird, ist die Höhe ein qualitatives Maß für die Kraft. Die
  Höhen sind nur innerhalb eines Versuchs vergleichbar.

## Tests

Die Physik wird mit Node.js (ab Version 22) ohne Browser getestet:

```bash
npm test
```
