# Generator – Leiterschleife im Magnetfeld

Interaktive 3D-Simulation für den Physikunterricht (Generator, elektromagnetische Induktion; Tablet geeignet):
eine rotierende Leiterschleife im Magnetfeld mit Schleifringen, Bürsten und einem Zeigermessgerät. Im Erklärmodus
sieht man, wie die Lorentzkraft die Elektronen in den Längsseiten verschiebt.

Eigenständige Simulation; die Simulation **Generator-Windpark** bettet sie ein: Das Haus „Generator-Modell“ im Dorf
(oder „Direkt zum Generator-Modell“) öffnet sie mit `?von=windpark&wind=…&zeit=…`. Dann startet sie mit dem Antrieb
„Wind“ und dem Wind von dort, zeigt kurz „Vereinfachtes Modell des Generators“, und ganz oben im Bedienfeld steht
„← Zurück zum Windpark“ (Wind und Uhrzeit gehen zurück mit). Ohne diese Angaben startet sie mit dem Drehzahl-Regler.

## Funktionen

- Freischwebendes Modell: Hufeisenmagnet mit Polblöcken oben (N) und unten (S), Welle mit rechteckiger
  Leiterschleife, zwei Schleifringe mit Kohlebürsten (die Zuleitungen liegen sichtbar auf der Isolierhülse:
  von der vorderen Längsseite zu Ring 1, von der hinteren unter Ring 1 hindurch zu Ring 2, je mit Lötpunkt), Kabel zu einem Zeigermessgerät (Nullpunkt in der
  Mitte, Messbereiche ±3 / ±10 / ±30 mV).
- **Antrieb:**
  - **Wind:** Statt der Kurbel sitzt ein kleiner Rotor am Wellenende. Rotor und Schleife drehen auf derselben
    Welle genau so schnell wie die Windräder im Windpark (Generator ohne Getriebe), Wind-Regler auch hier.
    Bei Nenndrehzahl 14 U/min sind das 0,23 Umdrehungen pro Sekunde, im Modell also etwa 1,2 mV –
    der Zeiger pendelt langsam mit, das Diagramm zeigt dann 12 s statt 4 s. Nach dem Antippen eines
    Windrads ist dieser Antrieb eingestellt.
  - **Drehzahl-Regler** −3 … +3 Umdrehungen pro Sekunde (rückwärts, Stillstand, vorwärts), „Anhalten“.
  - **Kurbel:** Kurbel am linken Wellenende mit Maus oder Finger drehen. Wer die Kurbel greift, schaltet
    automatisch auf diesen Antrieb. Lässt man los, läuft die Schleife durch Reibung langsam aus.
- **U-t-Diagramm** (einblendbar): schreibt die Spannung der letzten 4 s mit – die Sinuskurve der
  Wechselspannung wird sichtbar. Die U-Achse folgt dem Messbereich.
- **Leiterschleife festhalten:** Die Schleife bleibt in ihrer Stellung (auch wenn der Drehzahl-Regler
  läuft). Mit der Kurbel oder dem Regler „Drehwinkel“ (0°–360°) lässt sie sich in jede Stellung drehen;
  beim Loslassen bleibt sie stehen.
- Magnet umdrehen (N ↔ S), Zeitlupe (¼).
- Beobachtung: Bei langsamer Drehung pendelt der Zeiger mit. Ab etwa 2 Umdrehungen pro Sekunde kann der
  träge Zeiger (Eigenfrequenz 1,2 Hz) nicht mehr folgen und zittert nur um die Null – wie bei einem echten
  Demonstrations-Messgerät. Das Diagramm zeigt die Wechselspannung trotzdem.

## Erklärmodus

Der Knopf „Erklärung: Elektronen in der Schleife“ blendet Messgerät und Kabel aus, zeigt die Schleife dick
und durchsichtig – zunächst mit zwei **offenen Enden** (A vorne, B hinten), ohne Schleifringe und Bürsten – und
geht mit der Kamera näher heran. Links erscheint ein kleines Bedienfeld – bewusst ohne
Erklärtexte, nur mit Schaltern (zu Beginn ist keine Größe eingeblendet):

- **B:** Feldlinien zwischen den Polen (von N nach S)
- **v:** Geschwindigkeit der beiden Längsseiten
- **F_L:** Lorentzkraft auf die Elektronen in den beiden Längsseiten
- **e⁻:** ein einzelnes Elektron in der Mitte der vorderen Längsseite (weißer Rand). Es pendelt im Takt der
  Wechselspannung entlang des Drahts.
- **viele e⁻:** Elektronen (blau, „−“) und ortsfeste Atomrümpfe (rot, „+“) über die ganze Schleife, von Ende
  zu Ende. Die Lorentzkraft schiebt die Elektronen in beiden Längsseiten in dieselbe Umlaufrichtung; sie
  drängen sich an einem Ende zusammen, am anderen bleiben nur die Atomrümpfe. An den Enden zeigen „−“
  (Elektronenüberschuss) und „+“ (Elektronenmangel) die Pole – mit der Wechselspannung wechseln sie hin und her.
- **Schleifringe:** baut Schleifringe, Zuleitungen (Ende A → Ring 1, Ende B → Ring 2) und Bürsten animiert an:
  Erst gleiten die Ringe von rechts auf die Welle, dann wachsen die Zuleitungen zu den Ringen, zuletzt kommen
  die Bürsten von unten (beim Abnehmen rückwärts, insgesamt 1,8 s).
  Die Pole „−“ und „+“ stehen dann über den Ringen – so sieht man, welcher Pol an welchem Ring liegt.
- **Pause / Weiter, Zeitlupe, Festhalten** (dieselben Schalter wie rechts)
- **Magnet durchsichtig:** Polblöcke und Joch werden durchsichtig (Deckkraft 0,3), so sieht man die Schleife auch
  von oben oder unten durch den Magneten. Beim Verlassen des Erklärmodus wieder aus.
- **Ansicht von rechts:** Blick genau entlang der Welle, von der Seite der Schleifringe. Die Schleife erscheint als
  Strich, der sich dreht, die Längsseiten laufen auf einem Kreis – so sieht man gut, wann v senkrecht zu B steht
  (größte Spannung) und wann parallel (keine Spannung). Nochmal gedrückt geht es zurück zur schrägen Ansicht;
  „Ansicht zurücksetzen“ bleibt in der gewählten Ansicht. Dreht man die Ansicht selbst, ist der Knopf wieder aus.

Das U-t-Diagramm bleibt einblendbar, so lässt sich vergleichen: F_L am größten, wenn U am größten ist.

### Tafel

„Tafel öffnen (zeichnen)“ (unten im Bedienfeld des Erklärmodus) öffnet eine große Zeichentafel mit dem Bild
`bilder/tafel.svg`: oben die Leiterschleife zwischen Nord- und Südpol in den Stellungen φ = 0°, 90°, 180°, 270°
und 360° (Blick entlang der Welle von rechts, Längsseite A ausgefüllt, B hohl, Drehsinn wie in der Simulation),
darunter ein leeres U-t-Diagramm. Die Zeitmarken 0, T/4, T/2, 3T/4 und T stehen genau unter den Bildern
(gestrichelte Hilfslinien): Aus den Stellungen – Schleife waagrecht: U = 0, Schleife senkrecht: |U| am größten –
lässt sich die Sinuskurve punktweise einzeichnen.

**Seite 2** (Knopf „Seite 2: 3D-Modell“ in der Werkzeugleiste, `bilder/tafel2.svg`): dieselbe Aufteilung, oben
aber Screenshots des 3D-Modells im Erklärmodus in den fünf Stellungen – nur mit dem einzelnen Elektron in
Längsseite A (weißer Rand), ohne Feldlinien und Pfeile. So lassen sich B, v und die Lorentzkraft direkt an das
Elektron zeichnen. Die Bilder stecken als JPEG in der SVG-Datei: Nahaufnahmen der Schleife mit gerundeten Ecken (Elektron in der
Mitte der Längsseite A; 90° von der anderen Seite aufgenommen; für 360° steht dasselbe Bild wie für 0°). Beide Seiten werden zusammen geteilt; „Seite löschen“ löscht nur die gezeigte Seite.

Zeichnen mit Apple Pencil, Finger oder Maus; über den
Abgabe-Server können Schüler ihre Zeichnung an die Lehrkraft schicken (gemeinsamer Baustein der Website,
siehe [`gemeinsam/tafel/README.md`](../../gemeinsam/tafel/README.md); Lehrerseite:
<http://localhost:8080/lehrer/generator-leiterschleife>).

Das Bild ist eine SVG-Datei und lässt sich mit einem Texteditor ändern – aber nicht mehr verschieben, sobald
Zeichnungen geteilt wurden (die Koordinaten beziehen sich auf das Bild).

## Physikalisches Modell

- Leiterschleife: Längsseiten l = 10 cm im Abstand r = 4 cm von der Achse, Fläche A = 80 cm²;
  homogenes Feld B = 0,1 T zwischen den Polen.
- Die Spannung wird über die Lorentzkraft auf die Ladungen in den beiden Längsseiten berechnet:
  U = Σ l · (v × B) · Laufrichtung. Die Querseiten tragen nichts bei (dort steht v × B senkrecht zum
  Draht). Das ergibt U = −B · A · ω · sin φ, also z. B. bei 1 U/s einen Scheitelwert von etwa 5 mV.
  φ = 0: Schleife liegt waagrecht (senkrecht zum Feld), die Längsseiten bewegen sich längs der Feldlinien
  → U = 0; Schleife senkrecht: größte Spannung.
- Verdrahtung: Ring 1 (näher an der Schleife, rotes Kabel) → vordere Längsseite A (von rechts nach links) →
  Querseite → hintere Längsseite B (von links nach rechts) → Ring 2. Die Umlaufspannung in dieser Richtung
  schiebt positive Ladungen zu Ring 2; zwischen den Ringen gilt U = φ₁ − φ₂ = −U_Umlauf. Positive Anzeige:
  Ring 1 ist Pluspol.
- Elektronen im Erklärmodus: Verschiebung = 120 cm pro V/m (einzelnes Elektron, höchstens 2,8 cm) bzw.
  1000 cm pro V/m („viele e⁻“, bis alle am Ende gedrängt sind) · (Lorentzkraft pro Ladung in Laufrichtung), mit
  0,12 s Verzögerung – stark übertrieben; sie zeigt die Ladungstrennung (∝ Spannung) bei offenem Stromkreis.
- Drehung als Bewegungsgleichung (Drehzahl-Regler stellt die Drehzahl mit 0,4 s Zeitkonstante ein, Kurbel
  folgt dem Finger, freies Auslaufen mit Reibung) – vorbereitet für ein späteres Gegenmoment bei Belastung.

## Starten

Die Simulation lädt [three.js](https://threejs.org) aus dem Internet und muss über einen Webserver
geöffnet werden (ein Doppelklick auf `index.html` reicht nicht). Weil sie die Tafel aus `website/gemeinsam/`
lädt, muss der Webserver im Ordner `website/` laufen, nicht im Ordner der Simulation:

- **Mit Abgabe-Funktion:** im Ordner `website/` `npm start`, dann <http://localhost:8080/simulationen/generator-leiterschleife/>
- **Terminal:** im Ordner `website/` `python3 -m http.server` ausführen und
  <http://localhost:8000/simulationen/generator-leiterschleife/> öffnen
- **VS Code:** Erweiterung „Live Server“ mit dem Ordner `website/` als Arbeitsbereich

## Projektstruktur

```text
generator-leiterschleife/
├── index.html          # Seitengerüst, Bedienfeld, Diagramm
├── css/style.css
├── bilder/tafel.svg    # Tafelbild Seite 1: Schleife in fünf Stellungen, leeres U-t-Diagramm
├── bilder/tafel2.svg   # Tafelbild Seite 2: dieselben Stellungen als Bilder des 3D-Modells
├── js/
│   ├── main.js         # Start, Render-Schleife, Tafel einrichten (gemeinsam/tafel/)
│   ├── config.js       # Maße und Modellgrößen
│   ├── state.js        # Zustand (Antrieb, Drehzahl, Magnet, …); Angaben aus dem Windpark
│   ├── physik.js       # Drehung, Induktionsspannung, Zeiger, Rotor beim Antrieb „Wind“ (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht
│   ├── modell.js       # Magnet, Welle, Leiterschleife, Schleifringe, Bürsten, Kurbel
│   ├── messgeraet.js   # Zeigermessgerät und Kabel
│   ├── diagramm.js     # U-t-Diagramm
│   ├── erklaerung.js   # Erklärmodus: Elektronen, Pfeile v und F_L
│   ├── ziehen.js       # Kurbel mit Maus/Finger drehen
│   ├── bedienfeld.js   # Knöpfe, Regler, Anzeigen; Rückweg zum Windpark
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # gemeinsame Materialien
├── tests/physik.test.mjs
└── package.json
```

## Tests

```bash
npm test
```
