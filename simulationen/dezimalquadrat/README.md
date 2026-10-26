# Dezimalzahlen am Quadrat

Interaktive Simulation für die 6. Jahrgangsstufe (Mathematik, Dezimalbrüche): Ein Quadrat ist ein Ganzes.
Jedes Teil wird in 10 gleiche Teile zerlegt. Da sich ein Quadrat nicht in 10 gleiche Quadrate teilen lässt
(10 ist keine Quadratzahl), wechseln sich Rechtecke und Quadrate ab:

- **Rechtecke (Zehnerfeld, Standard):** Quadrat → 5 × 2 Rechtecke (**Zehntel**, 0,2 × 0,5) → je 2 × 5 Quadrate
  (**Hundertstel**) → 5 × 2 Rechtecke (**Tausendstel**) → 2 × 5 Quadrate (**Zehntausendstel**)
- **Streifen:** Quadrat → 10 Streifen (Zehntel) → je 10 Quadrate (Hundertstel) → 10 Streifen → 10 Quadrate

In beiden Fällen bilden die Hundertstel das bekannte Hunderterfeld. Die Teile werden wie beim Lesen
gefüllt (zeilenweise von links nach rechts). Eine Dezimalzahl wird als gefärbte Fläche dargestellt, jede
Stufe in ihrer Farbe – passend zur Stellenwerttafel.

## Funktionen

- **Darstellung:** Quadrat oder **Zahlenstrahl**. Zahl, Eingabe und Stellenwerttafel gelten für beide.
- **Zahlenstrahl von −3 bis 3** zum Einführen der Dezimalbrüche: anfangs nur ganze Zahlen. Mit
  „feiner +“ / „− gröber“ wird die Einteilung um eine Stufe verändert (Ganze → Zehntel → Hundertstel →
  Tausendstel), jede Stufe in der Farbe der Stellenwerttafel. Sind die Striche zu eng, erscheinen sie erst
  beim Hineinzoomen. Nur die ganzen Zahlen sind beschriftet. Beim Verfeinern wachsen die neuen
  Striche langsam heraus; die Leiste E | z | h | t zeigt die eingestellte Einteilung. Antippen zeigt eine farbige Strecke von 0 bis zum nächsten Strich der feinsten
  sichtbaren Stufe (nochmal antippen: weg), die eingegebene Zahl bleibt. Mit „Zahl durch Antippen markieren“
  (anfangs aus) setzt Antippen stattdessen die Zahl auf diesen Strich; „Zahl als Strecke ab 0 zeigen“ (anfangs an) zeichnet die Zahl als dicke Strecke auf der Achse, jede Stelle in
  ihrer Farbe (1,529: bis 1 in der Farbe der Ganzen, dann Zehntel bis 1,5, Hundertstel bis 1,52, Tausendstel
  bis 1,529). Zahlen (auch negative, bis Tausendstel) lassen sich eingeben. Die Lupe zoomt so weit hinein, dass
  die eingestellte Einteilung sichtbar wird.

- **Zahl eingeben** (z. B. `0,347`, auch mit Punkt) → die Fläche wird gefärbt. Auch **Brüche** gehen:
  `1/10`, `-3/4`, `1 1/2` – sie erscheinen in Bruchschreibweise mit Dezimalzahl (3/4 = 0,75), auch an der
  Markierung auf dem Zahlenstrahl. Brüche ohne passende Dezimalzahl (1/3) werden abgelehnt.
- **„Eingabe erst auf Knopfdruck markieren“** (Zahlenstrahl, anfangs an): Die eingegebene Zahl erscheint zunächst nur im
  Bedienfeld („Wo liegt diese Zahl auf dem Zahlenstrahl?“; Dezimalzahl, Zerlegung und Stellenwerttafel
  verdeckt). Erst „Auf dem Zahlenstrahl markieren“ zeigt Markierung und Strecke.
- **Antippen** färbt bis einschließlich des angetippten Teils (feinste sichtbare Stufe); dasselbe Teil
  nochmal antippen nimmt es wieder weg
- **Zahl über dem Zahlenstrahl:** Die Zahl (bzw. der Bruch) steht am Zahlenstrahl auch direkt über dem Strahl,
  links neben der Stellenwerttafel. Das Zahlfeld lässt sich mit Maus oder Finger frei verschieben
  (Doppelklick: zurück an seinen Platz).
- **Stellenwerttafel** – vorerst *frei*: Sie hat ihre eigene Zahl, unabhängig von der dargestellten. Ziffer antippen
  und eintippen (springt zur nächsten Stelle), ▲/▼ mit Übertrag, ± schaltet das Vorzeichen um (Zahlenstrahl).
  Mit `TAFEL_GEKOPPELT = true` in `js/bedienfeld.js` ist sie wieder an die dargestellte Zahl gekoppelt.
  (per Knopf ein- und ausblendbar, anfangs ausgeblendet; am Zahlenstrahl direkt über dem
  Strahl, mit Vorzeichenspalte und bis zu den Tausendsteln) E | z | h | t | zt mit ▲/▼: ein Teil dieser Stufe dazu bzw. weg, mit Übertrag
  (0,09 + 0,01 = 0,1)
- **Zerlegung**: „= 3 Zehntel + 4 Hundertstel + 7 Tausendstel = 347 Tausendstel“
- **1, 2 oder 3 Quadrate** (Zahlen bis 3)
- **Einteilung** umschaltbar: Rechtecke (5 × 2) oder Streifen
- **Zoom**: Mausrad, zwei Finger, Knöpfe +/−, „Übersicht“; Ziehen verschiebt. Die Einteilung erscheint
  je nach Vergrößerung: in der Übersicht Zehntel und Hundertstel, hineingezoomt auch Tausendstel und
  Zehntausendstel. **Lupe**: Antippen zoomt auf das angetippte Hundertstel. Beim Hineinzoomen zeigt
  eine kleine Übersichtskarte, wo man gerade ist.
- Hochformat (Tablet): Bedienfeld unten
- **iPad / Tablet:** Statt der Bildschirmtastatur (die den halben Bildschirm verdeckt) erscheint ein eigenes
  Ziffernfeld direkt am Eingabefeld (Ziffern, Komma, −, /, Leerzeichen für gemischte Zahlen, ⌫, OK) bzw. an
  der Stellenwerttafel (0–9, nach jeder Ziffer weiter zur nächsten Stelle). Das verschobene Zahlfeld kommt mit ↺
  zurück. Die Seite selbst zoomt nicht mit (kein Doppeltipp-/Zwei-Finger-Zoom), langes Drücken markiert
  nichts; Tippflächen mindestens 44 px. (`js/tastenfeld.js`)

## Starten

Über einen Webserver öffnen (ES-Module):

- **VS Code:** „Live Server“ → `index.html`
- **Terminal:** im Projektordner `python3 -m http.server` und <http://localhost:8000> öffnen

## Projektstruktur

```text
├── index.html
├── css/style.css
├── js/
│   ├── main.js        # Start
│   ├── zahl.js        # Zahl (in Zehntausendsteln), Einlesen, Text, Einteilung, Antippen (ohne Zeichnen, testbar)
│   ├── state.js       # Zustand, Farben der Stellenwerte
│   ├── ansicht.js     # Quadrat: Zeichenfläche, Zoom, Verschieben, Antippen, Übersichtskarte
│   ├── strahl.js      # Zahlenstrahl −3 … 3: Einteilung, Markierung, Zoom, Verschieben, Antippen, Übersichtskarte
│   ├── bedienfeld.js  # Zahlanzeige, Eingabe, Stellenwerttafel, Anzahl der Quadrate
│   └── tastenfeld.js  # eigenes Ziffernfeld für iPad / Tablet
├── tests/zahl.test.mjs
└── package.json
```

## Tests

```bash
npm test
```
