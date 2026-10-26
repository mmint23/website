# Generator – vom Windpark zur Leiterschleife

Interaktive 3D-Simulation für den Physikunterricht (Generator, elektromagnetische Induktion; Tablet
geeignet). Geplant sind zwei Szenen: ein Windpark in einer Landschaft als Einstieg und – per Klick auf
ein Windrad, mit Kamerafahrt in die Gondel – ein vereinfachtes Generator-Modell: eine rotierende
Leiterschleife im Magnetfeld.

**Stand: Phase 4 – Windpark, Übergang und Generator-Modell.** Die Simulation startet im Windpark.

## Windpark (Einstieg)

- Stilisierte Hügellandschaft mit Wiesen und Feldern, fünf Windrädern (Nabenhöhe 90 m, Blattlänge 45 m,
  rote Blattspitzen), einem Dorf mit Kirche und einer Stromleitung mit Gittermasten vom Windpark zum Dorf.
- **Wind-Regler** 0–20 m/s mit Windstärke nach Beaufort. Der Wind kommt von links vorne; die Rotoren stehen
  im Wind. Helle Windstreifen ziehen mit dem Wind – bei mehr Wind mehr und schnellere Streifen.
- Windräder wie echte Anlagen: Unter 3 m/s stehen sie, dann drehen sie mit wachsendem Wind schneller (ab
  6 U/min), ab 12 m/s mit Nenndrehzahl 14 U/min. Sie sind träge (laufen in einigen Sekunden hoch bzw. aus).
  Die aktuelle Drehzahl steht im Bedienfeld.
- **Windrad antippen** (jedes der fünf; mit der Maus wird es beim Darüberfahren hervorgehoben): Die Kamera
  fliegt seitlich an die Gondel, das Gehäuse wird durchsichtig, und man sieht Rotorwelle und Generator
  (Schild „Generator“). Dargestellt ist ein Generator ohne Getriebe: Ein Ringgenerator sitzt direkt auf der
  Rotorwelle, sein kupferfarbener Läufer dreht mit dem Rotor im fest stehenden Ständer. Die Ansicht
  bleibt stehen, bis noch einmal getippt wird (Hinweis unten); dann wird ins Generator-Modell übergeblendet,
  kurz erscheint „Vereinfachtes Modell des Generators“. Antippen während der Fahrt überspringt sie. „Direkt zum Generator-Modell“ wechselt ohne Kamerafahrt.
- Alles ist aus einfachen Formen gebaut (keine geladenen 3D-Modelle), damit es schnell lädt und auf Tablets
  flüssig läuft.

## Funktionen (Generator-Modell)

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

Das U-t-Diagramm bleibt einblendbar, so lässt sich vergleichen: F_L am größten, wenn U am größten ist.

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

## Plan

1. Generator-Modell ✓
2. Erklärhilfen: Feldlinien, Pfeile v und F_L, Elektronen im Leiter, Pause, Zeitlupe, Festhalten ✓
3. Windpark-Landschaft: Windräder, Dorf, Stromleitung, Windregler mit sichtbarem Wind ✓
4. Übergang: Windrad antippen → Kamerafahrt in die (durchsichtige) Gondel → Modell; Antrieb „Wind“ ✓
5. Feinschliff: LED und Glühlampe (Gedankenexperiment), QR-Code-Knopf, Test auf dem iPad
6. Später: Belastung mit Gegenmoment (Lenz)

## Starten

Die Simulation lädt [three.js](https://threejs.org) aus dem Internet und muss über einen Webserver
geöffnet werden (ein Doppelklick auf `index.html` reicht nicht):

- **VS Code:** Erweiterung „Live Server“, Rechtsklick auf `index.html` → „Open with Live Server“
- **Terminal:** im Projektordner `python3 -m http.server` ausführen und <http://localhost:8000> öffnen

## Projektstruktur

```text
generator-windpark/
├── index.html          # Seitengerüst, Bedienfeld, Diagramm
├── css/style.css
├── js/
│   ├── main.js         # Start und Render-Schleife
│   ├── config.js       # Maße und Modellgrößen
│   ├── state.js        # Zustand (Antrieb, Drehzahl, Magnet, …)
│   ├── physik.js       # Drehung, Induktionsspannung, Zeiger, Drehzahl der Windräder (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht, Einstellungen je Ansicht
│   ├── landschaft.js   # Windpark: Gelände, Windräder (mit Innenleben der Gondel), Dorf, Stromleitung, Windstreifen
│   ├── uebergang.js    # Windrad antippen, Kamerafahrt, Blick in die Gondel, Überblendung ins Modell
│   ├── modell.js       # Magnet, Welle, Leiterschleife, Schleifringe, Bürsten, Kurbel
│   ├── messgeraet.js   # Zeigermessgerät und Kabel
│   ├── diagramm.js     # U-t-Diagramm
│   ├── erklaerung.js   # Erklärmodus: Elektronen, Pfeile v und F_L
│   ├── ziehen.js       # Kurbel mit Maus/Finger drehen
│   ├── bedienfeld.js   # Knöpfe, Regler, Anzeigen
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # gemeinsame Materialien
├── tests/physik.test.mjs
└── package.json
```

## Tests

```bash
npm test
```
