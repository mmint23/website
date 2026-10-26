# Geladenes Teilchen im Magnetfeld – interaktive Simulation

Eine kleine HTML/CSS/JavaScript-Simulation zur Lorentzkraft für den
Physikunterricht. Ein geladenes Teilchen bewegt sich in einem homogenen
Magnetfeld senkrecht zur Bildschirmebene und läuft auf einer Kreisbahn.

## Starten

- `lorentzkraft-simulation.html` per Doppelklick im Browser öffnen –
  diese eine Datei enthält alles und lässt sich einfach weitergeben
  (USB-Stick, Moodle, E-Mail).
- Alternativ `index.html` öffnen (nutzt die Dateien in `css/` und `js/`).

Keine Installation und keine Internetverbindung nötig.

## Funktionen

- Magnetfeld: Flussdichte 0–50 mT, Richtung ⊗ in / ⊙ aus der Ebene
- Teilchen: Ladung positiv oder negativ, Geschwindigkeit 0,5–10 · 10⁵ m/s,
  Bewegungsrichtung per Regler oder durch Ziehen der Spitze des v-Pfeils
- Ort des Teilchens per Drag & Drop (Maus oder Finger), alternativ Pfeiltasten
- Pfeile für Geschwindigkeit v und Lorentzkraft F (längenproportional)
- Bahnspur und gestrichelte Vorhersage der Kreisbahn
- Anzeige von F_L, Bahnradius r, Umlaufzeit T und Umlaufsinn
- Start/Pause, Zurücksetzen (an den zuletzt abgelegten Ort),
  Startposition (Bildmitte, Richtung 0°), Tempo 0,25×–2×
- Erreicht das Teilchen den Rand, hält die Simulation an; per Button
  „Abprallen am Rand“ wird es stattdessen wie an einer Bande reflektiert
- Parameter lassen sich auch während der Bewegung ändern

## Modell

- Masse m = 1,67 · 10⁻²⁷ kg (Proton), Ladung ±e – positives und negatives
  Teilchen unterscheiden sich nur im Vorzeichen.
- Zeichenfläche 80 cm breit, ein Kästchen = 5 cm.
- Zeitlupe: 1 s Animation ≙ 1 µs.

## Projektstruktur

```text
lorentzkraft-simulation/
├── lorentzkraft-simulation.html   # Einzeldatei (CSS + JS eingebettet)
├── index.html
├── css/style.css
├── js/app.js
└── README.md
```

Hinweis: `lorentzkraft-simulation.html` ist eine Kopie von `index.html` mit
eingebettetem CSS/JS. Nach Änderungen an `css/` oder `js/` muss sie neu
erzeugt werden.
