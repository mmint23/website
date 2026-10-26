# Elementarmagnete – Magnetisieren

Simulation zum Modell der Elementarmagnete (Physik, 7. bzw. 10. Jahrgangsstufe). Ein Eisenstück enthält
viele kleine Elementarmagnete (grün = Südpol, rot = Nordpol, wie im Heft). Ungeordnet ist das Stück nicht
magnetisch; geordnet ist es selbst ein Magnet.

## Funktionen

- **Modus „Stabmagnet“:** Den Stabmagneten (senkrecht, unten Nord- oder Südpol) mit Maus oder Finger über
  das Eisenstück ziehen. Die Elementarmagnete richten sich im Feld aus. Am Ende des Strichs entsteht der
  Gegenpol (Strich mit dem Nordpol nach rechts → rechts Südpol). Kompassnadeln an den Enden zeigen, ob und
  wie das Eisenstück magnetisch ist.
- **Modus „Spule mit Eisenkern“:** Strom ein/aus, Stromstärke 0–5 A, Polung umkehren, Eisenkern
  herausziehen/einschieben. Die Anzeige „Stärke des Magnetfelds“ zeigt den Anteil der Spule und den
  zusätzlichen Anteil des Eisenkerns: Mit Kern wird das Feld viel stärker.
- **Material:** Weicheisen (leicht zu magnetisieren, verliert die Ordnung wieder → Kern eines
  Elektromagneten) oder Stahl (schwerer zu magnetisieren, bleibt magnetisch → Dauermagnet).
  Beim Wechsel des Modus wird das passende Material vorgeschlagen (Stabmagnet: Stahl, Spule: Weicheisen).
- **Hammerschlag** (Knopf oder auf das Eisenstück tippen): verdreht die Elementarmagnete zufällig – die
  Ordnung geht verloren (Entmagnetisieren durch Erschütterung).
- **Anzeigen:** Ordnung der Elementarmagnete (Balken, %), Magnetfeldlinien, Kompassnadeln, Pole am Eisenstück.
- Hochformat (Tablet): Bedienfeld unten

## Modell

- Jeder Elementarmagnet dreht sich ins äußere Feld, wenn es stärker ist als die Haftschwelle des Materials
  (Weicheisen klein, Stahl größer). Darunter: Weicheisen verliert die Ordnung durch Wärmebewegung,
  Stahl behält sie; ausgerichtete Elementarmagnete legen sich in Stahl in die Längsrichtung des Stücks
  (ein langes Stück lässt sich längs leichter magnetisieren).
- Felder aus „Polen“ (Nordpol positiv, Südpol negativ), B ~ 1/r². Spule: innen gleichmäßiges Feld.
- Einheiten frei gewählt (Simulationscharakter).

## Starten

Über einen Webserver öffnen (ES-Module): VS Code „Live Server“ oder `python3 -m http.server`.

## Projektstruktur

```text
├── index.html
├── css/style.css
├── js/
│   ├── main.js        # Start und Bildschleife
│   ├── modell.js      # Elementarmagnete, Felder, Hammerschlag, Magnetisierung (testbar)
│   ├── state.js       # Zustand und Maße
│   ├── welt.js        # Felder in der Szene (Stabmagnet, Spule, Eisenstück), Zeitschritt
│   ├── ansicht.js     # Zeichnen, Stabmagnet ziehen, Hammer, Kompass, Feldlinien
│   └── bedienfeld.js  # Knöpfe, Anzeigen, Statustexte
├── tests/modell.test.mjs
└── package.json
```

## Tests

```bash
npm test
```
