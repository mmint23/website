# Windpark – vom Wind zum Licht im Dorf

Interaktive 3D-Simulation für den Physikunterricht (Energieumwandlung, Generator, elektromagnetische Induktion;
Tablet geeignet): ein Windpark in einer Landschaft mit Dorf und Stromleitung, mit Tageszeit und einem Wohnzimmer im
Dorf. Er ist der Einstieg zu zwei eigenständigen Simulationen, die er nur einbettet (Seitenwechsel, Wind und Uhrzeit
gehen in der Adresse mit und beim Zurückkommen wieder zurück):

- **Generator-Leiterschleife** (`../generator-leiterschleife/`): rotierende Leiterschleife im Magnetfeld mit
  Erklärmodus und Tafel – über das Haus „Generator-Modell“ im Dorf.
- **Innenpolgenerator** (`../innenpolgenerator/`): so sind getriebelose Windkraftgeneratoren gebaut – über ein
  Windrad (Blick in die Gondel, dann noch einmal tippen).

## Funktionen

- Stilisierte Hügellandschaft mit Wiesen und Feldern, fünf Windrädern (Nabenhöhe 90 m, Blattlänge 45 m,
  rote Blattspitzen), einem Dorf mit Kirche und einer Stromleitung mit Gittermasten vom Windpark zum Dorf.
- **Wind-Regler** 0–20 m/s mit Windstärke nach Beaufort. Der Wind kommt von links vorne; die Rotoren stehen
  im Wind. Helle Windstreifen ziehen mit dem Wind – bei mehr Wind mehr und schnellere Streifen.
- Windräder wie echte Anlagen: Unter 3 m/s stehen sie, dann drehen sie mit wachsendem Wind schneller (ab
  6 U/min), ab 12 m/s mit Nenndrehzahl 14 U/min. Sie sind träge (laufen in einigen Sekunden hoch bzw. aus).
  Die aktuelle Drehzahl steht im Bedienfeld.
- **Uhrzeit-Regler** (0–24 Uhr, Start 12 Uhr): Die Sonne geht um 6 Uhr auf und um 20 Uhr unter und zieht von
  links (morgens) nach rechts (abends); abends steht sie tief, das Licht wird warm, der Himmel rötlich, dann
  dunkelblau. Nachts bleibt die Landschaft im schwachen Mondlicht erkennbar, die Windstreifen werden blass.
  In der Dämmerung gehen im Dorf nach und nach die Lichter an (Fenster mit Lichtschein, auch in der Kirche),
  und auf den Gondeln blinkt die rote Flugsicherungsbefeuerung. So lässt sich die Energiekette beschreiben:
  Wind → Rotor → Generator → Stromleitung → Licht in den Häusern.
- **Haus antippen** (das Haus am Dorfrand mit dem Schild „Hineinschauen“; mit der Maus wird es hervorgehoben):
  Kamerafahrt vor die Haustür, Überblendung in ein Wohnzimmer. Durchs Fenster sieht man die Windräder – sie
  drehen so schnell wie im Windpark, der Himmel passt zur Uhrzeit, nachts blinkt die Befeuerung. Eine Stehlampe
  hängt an der Steckdose und brennt abends. Am Fenster steht jemand und fragt sich: „Wie wird aus der Energie der
  Windräder eigentlich elektrische Energie?“ – Einstieg in die Energiekette. Im Bedienfeld: „Zurück zum
  Windpark“ und „Zum Generator-Modell“ (dort die Antwort; eigene Simulation).
- **Windrad antippen** (jedes der fünf; mit der Maus wird es beim Darüberfahren hervorgehoben): Die Kamera
  fliegt seitlich an die Gondel, das Gehäuse wird durchsichtig, und man sieht Rotorwelle und Generator
  (Schild „Generator“). Dargestellt ist ein Generator ohne Getriebe: Ein Ringgenerator sitzt direkt auf der
  Rotorwelle, sein kupferfarbener Läufer dreht mit dem Rotor im fest stehenden Ständer. Die Ansicht
  bleibt stehen, bis noch einmal getippt wird (Hinweis unten); dann wird ausgeblendet und die Simulation
  **Innenpolgenerator** geöffnet (eigene Seite; so sind getriebelose Windkraftgeneratoren gebaut: das Magnetfeld
  dreht sich innen, die Spulen stehen außen fest). Wind und Uhrzeit gehen in der Adresse mit; „Zurück zum
  Windpark“ im Innenpolgenerator bringt in denselben Windpark zurück. Antippen während der Fahrt überspringt sie.
  Der Windpark übernimmt `?wind=…&zeit=…` aus der Adresse auch sonst (z. B. für einen Link mit Abendstimmung).
- **Haus „Generator-Modell“ antippen** (im Dorf, Schild darüber): Kamerafahrt vor die Haustür, Ausblenden und
  Wechsel zur Simulation **Generator-Leiterschleife** (eigene Seite, Antrieb „Wind“ mit dem Wind von hier, kurz
  „Vereinfachtes Modell des Generators“). „Direkt zum Generator-Modell“ im Bedienfeld und der Knopf im
  Wohnzimmer wechseln ohne Kamerafahrt dorthin. „← Zurück zum Windpark“ dort bringt in denselben Windpark zurück.
- Die Startansicht zeigt alle fünf Windräder und das Dorf links vom Bedienfeld; die Schilder der betretbaren Häuser
  bleiben auch aus der Ferne gleich groß.
- Alles ist aus einfachen Formen gebaut (keine geladenen 3D-Modelle), damit es schnell lädt und auf Tablets
  flüssig läuft.

## Starten

Die Simulation lädt [three.js](https://threejs.org) aus dem Internet und muss über einen Webserver
geöffnet werden (ein Doppelklick auf `index.html` reicht nicht), am besten im Ordner `website/`, damit die
Wechsel zu den anderen Simulationen funktionieren:

- **Terminal:** im Ordner `website/` `python3 -m http.server` ausführen und
  <http://localhost:8000/simulationen/generator-windpark/> öffnen
- **VS Code:** Erweiterung „Live Server“ mit dem Ordner `website/` als Arbeitsbereich

Die Adresse kann Wind und Uhrzeit vorgeben, z. B. `…/generator-windpark/?wind=12&zeit=21` (Abendstimmung).

## Projektstruktur

```text
generator-windpark/
├── index.html          # Seitengerüst, Bedienfelder (Windpark, Wohnzimmer)
├── css/style.css
├── js/
│   ├── main.js         # Start, Render-Schleife (Windpark oder Wohnzimmer)
│   ├── config.js       # Windräder, Dauern der Übergänge
│   ├── state.js        # Zustand (Ansicht, Wind, Uhrzeit); Wind und Uhrzeit aus der Adresse
│   ├── physik.js       # Drehzahl der Windräder (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Einstellungen je Ansicht
│   ├── landschaft.js   # Gelände, Windräder (mit Innenleben der Gondel), Dorf, betretbare Häuser, Stromleitung, Windstreifen
│   ├── tageszeit.js    # Uhrzeit: Sonnenstand, Himmel, Licht, Lichter im Dorf, Befeuerung der Windräder
│   ├── raum.js         # Wohnzimmer im Dorf: Blick auf die Windräder, Lampe an der Steckdose, Person mit Frage
│   ├── uebergang.js    # Windrad bzw. Haus antippen, Kamerafahrt, Wechsel ins Wohnzimmer bzw. zu den anderen Simulationen
│   ├── bedienfeld.js   # Regler, Knöpfe, Anzeigen
│   └── hilfen.js       # Hilfsfunktionen
├── tests/physik.test.mjs
└── package.json
```

## Tests

```bash
npm test
```
