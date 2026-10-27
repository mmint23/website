# Induktion: Stabmagnet und Spule

Interaktive 3D-Simulation für den Physikunterricht (Jahrgangsstufe 10, elektromagnetische Induktion; Tablet
geeignet). Der klassische Einstiegsversuch zum Induktionsgesetz, rein qualitativ: Ein Stabmagnet und eine Spule
werden gegeneinander verschoben und gedreht, ein Messgerät an der Spule zeigt, wann eine Spannung entsteht. Das
Messgerät schließen die Schüler selbst an.

## Kernidee

**Ändert sich das Magnetfeld im Inneren der Spule, wird an ihren Enden eine Spannung induziert.** Die Feldlinien
des Magneten lassen sich einblenden; die Abschnitte, die gerade im Inneren der Spule liegen, lassen sich violett
färben. So sieht
man beim Verschieben, wie sich „das Feld in der Spule“ ändert – und dass das Messgerät genau dann ausschlägt.

Was sich damit erarbeiten lässt:

- Magnet in Ruhe – auch mitten in der Spule: keine Spannung.
- Hineinschieben und Herausziehen: Ausschläge in entgegengesetzte Richtungen.
- Schneller bewegen: größerer Ausschlag.
- Magnet umdrehen: Ausschläge kehren sich um.
- Mehr Windungen oder stärkerer Magnet: größerer Ausschlag (doppelt so viele Windungen: doppelte Spannung).
- Magnet dicht vor der Spule drehen: auch dabei ändert sich das Feld im Inneren – Ausschlag.
- Spule über den ruhenden Magneten schieben wirkt genauso wie Magnet in die ruhende Spule: Es kommt nur auf die
  Relativbewegung an.
- Weit weg vom Magneten ändert sich beim Bewegen fast nichts im Spuleninneren – kein Ausschlag.
- Einzelne Leiterschleife statt Spule: dasselbe Verhalten, aber nur etwa ein Tausendstel der Spannung (Messbereich
  ±1 mV) – die Windungszahl macht's.
- Magnet seitlich an der Spule vorbei nach oben oder unten bewegen: Auch dabei ändert sich das Feld im Inneren.

**Feldlinienmodell** (Standard, rein didaktisch): Die Spannung kommt nur aus den gezeigten Feldlinien – sie entsteht genau dann, wenn sich die Anzahl der Feldlinien in der Spule oder ihr Verlauf dort ändert
(violette Abschnitte). Liegt keine gezeigte Linie in der Spule oder bleibt das Bild darin gleich, zeigt das
Messgerät 0 – auch wenn sich der Magnet weit weg bewegt (im echten Feld gäbe es dort noch einen winzigen
Ausschlag). So lässt sich das Induktionsgesetz in der Sprache der Feldlinien formulieren: *Ändert sich die Zahl
(oder der Verlauf) der Feldlinien durch die Spule, wird eine Spannung induziert.* Die Feldlinien sind zu Beginn
ausgeblendet („Magnetfeld (Feldlinien)“ blendet sie ein) – gerechnet wird trotzdem mit ihnen. Der Knopf **„Reale Physik“** ganz oben im Bedienfeld schaltet auf das echte Feld des Magneten um
(dann auch Spannung, wo keine Feldlinie gezeichnet ist); nochmal gedrückt geht es zurück ins Feldlinienmodell.

## Funktionen

- **Ziehen** mit Maus oder Finger: Magnet oder Spule greifen und entlang der gemeinsamen Achse verschieben (der
  Magnet passt durch die Spule) – oder auch nach oben und unten, in der ganzen Bildebene (y −10 … 10 cm); nahe der
  gemeinsamen Achse rasten sie auf ihr ein, schräg gegen die Spule gleiten sie an ihr entlang. Schaut man fast von
  oben auf die Szene, geht es nur entlang der Achse. Steckt der Magnet in der Spule, greift man ihn dort; die Spule dann an den
  Flanschen. Daneben ziehen dreht die Ansicht.
- **Drehen** (Regler im Bedienfeld, −180° … 180°): Magnet und Spule drehen sich in der Bildebene. Gedreht passt
  der Magnet nicht mehr durch die Spule – Bewegungen, die ihn in die Wicklung stoßen würden, bleiben stehen
  („Magnet und Spule stoßen aneinander“).
- **Anschließen:** Zu Beginn hängen die beiden Kabel (rot von Anschluss A, schwarz von E) lose unter der Spule.
  Die Stecker zieht man an die Buchsen; in der Nähe einer freien Buchse rasten sie ein, woanders losgelassen
  bleiben sie hängen (und wandern mit der Spule). „Kabel abziehen“ und der Wechsel des Messgeräts ziehen sie heraus.
- **Messgerät verschieben:** Zeigermessgerät und Multimeter am Gehäuse greifen und in ihrer Ebene hinter der
  Achse verschieben; eingesteckte Kabel gehen mit. (Den Drehschalter des Multimeters antippen dreht ihn weiter.)
- **Zeigermessgerät mit Skala** mit Nullpunkt in der Mitte (Messbereich ±1 mV / ±0,1 / ±0,3 / ±1 V; träger Zeiger wie bei
  Leiterschaukel und Generator), Buchsen + und −. Vertauscht angeschlossen schlägt es in die andere Richtung aus.
- **Zeigermessgerät ohne Skala** (qualitativ, empfindlich): nur Bogen und Nullmarke, Buchsen + und −. Der
  Ausschlag wächst logarithmisch mit der Spannung, log(1 + |U|/0,05 mV) / log(1 + 1 V/0,05 mV): Die einzelne
  Leiterschleife (unter 1 mV) schlägt etwa ein Viertel aus, eine Spule (0,1 V) etwa drei Viertel, mehr Windungen
  mehr – ohne Umschalten und ohne am Anschlag zu kleben.
- **Multimeter** mit Drehschalter (OFF, V⎓, V~, mA⎓, A⎓ – Antippen dreht eine Stellung weiter; zu Beginn OFF) und
  vier Buchsen COM, V, mA, 10A. Es misst nur, wenn die Stecker zur Schalterstellung passen: Spannung mit COM und
  V, Strom mit COM und mA bzw. 10A (dann fließt ein Strom durch Spule und Messgerät). Sonst zeigt es 0; vertauscht
  ein Minuszeichen, über dem Messbereich „OL“; Spannungen unter 0,2 V in mV (automatische Bereichswahl). Wie ein echtes Multimeter zeigt es nur dreimal pro Sekunde einen
  neuen Messwert (Mittelwert der letzten 0,1 s) – eine schnelle Bewegung kann es verpassen.
- **Magnet:** Stärke schwach / mittel / stark (0,15 / 0,3 / 0,6 T; mehr Feldlinien beim stärkeren Magneten),
  umdrehen (N ↔ S). **Spule:** 1, 300, 600 oder 1200 Windungen (dichter gewickelt, dünnerer Draht); bei 1 steht
  statt der Spule eine einzelne Leiterschleife da (Drahtring mit dem Radius der Wicklung, Anschlüsse A und E dicht
  nebeneinander darüber).
- **Magnet und Spule zurück an den Start** (Lage und Drehung; die Kabel bleiben gesteckt).
- **Ganz oben im Bedienfeld:** „Reale Physik“ (statt Feldlinienmodell), Magnetfeld (Feldlinien mit Pfeilen; Spule
  und Magnet werden dafür halb durchsichtig) und „Feldlinien im Inneren der Spule färben“ (violett; nur mit
  eingeblendeten Feldlinien, zu Beginn aus).
- **Anzeigen:** B im Spuleninneren (Pfeil entlang der Achse, Länge ∝ mittlere Flussdichte), Diagramme B–t und U–t
  auf derselben Zeitachse (letzte 6 s; U in mV beim Messbereich ±1 mV).

## Physikalisches Modell

- Magnet: 10 cm lang, Querschnitt 2 cm × 2 cm, Flussdichte im Magneten 0,15 / 0,3 / 0,6 T. Spule: 300 / 600 /
  1200 Windungen (Widerstand 3 / 6 / 12 Ω), 9 cm lang, Windungsradius 2,3 cm. Größenordnung: Magnet (mittel) mit
  20–30 cm/s in die Spule mit 600 Windungen schieben gibt etwa 0,1–0,2 V.
- Der Magnet ist eine Kette von 40 Dipolen entlang seiner Achse. Der Fluss durch eine Windung ist das
  Linienintegral des Vektorpotentials um die Windung, Φ = ∮ A · dl – für jede Lage und Drehung, und Φ ändert sich
  stetig, auch wenn der Magnet durch die Spule geht. Auf der gemeinsamen Achse stimmt das mit dem Polmodell
  (Raumwinkel der Pole, dazu der Fluss im Magneten) auf 0,2 % überein. Die Spule zählt als 24 gleichmäßig
  verteilte Windungen, die Leiterschleife als eine Windung in ihrer Mitte; U = −N · dΦ/dt. Magnet (mittel) mit
  20 cm/s durch die Leiterschleife: etwa 0,5 mV.
- Kollision: Der Magnet (Quader) darf nicht in den Spulenkörper zwischen Bohrung und Flanschrand (bzw. in den
  Drahtring und die Zuleitungen der Leiterschleife); geprüft an
  Punkten entlang seiner Kanten und Seitenmitten.
- Feldlinien: Außen folgen sie dem Feld der beiden Polflächen (gleichmäßig belegt, aus Punkten zusammengesetzt),
  innen laufen sie gerade vom Süd- zum Nordpol. Gezeigt ist die Ebene durch die Achse.
- Feldlinienmodell: Gezählt wird die Länge der gezeigten Linienstücke innerhalb der Wicklung in Richtung der
  Spulenachse (gegen die Achse negativ), geteilt durch die Spulenlänge (Leiterschleife: Schicht von 1 cm) – im
  Mittel die Zahl der Feldlinien durch die Spule. Die Stücke werden genau an den Spulenrändern abgeschnitten, das
  Maß ändert sich also stetig. Fluss = dieses Maß · Fluss je Linie; der Faktor ist so gewählt, dass der Magnet
  mittendrin denselben Fluss hat wie im echten Modell. Weil nur eine Ebene gezählt wird, ist der Fluss bei
  halb eingetauchtem Magneten größer als im echten Feld; qualitativ (Vorzeichen, wann, schneller → mehr) stimmt es.
  B-Pfeil und B–t-Diagramm folgen in diesem Modell ebenfalls den Feldlinien.
- Beim Ziehen folgt das Teil dem Finger mit 0,03 s Verzögerung; losgelassen bleibt es stehen.
- „Magnet umdrehen“ gilt als sofort – ohne Spannungsstoß; ebenso das Umschalten von Stärke und Windungszahl. (Wer
  den Magneten mit dem Regler dreht, bekommt den Spannungsstoß.)

## Dateien

```text
index.html           Seite: Szene, Bedienfeld, Diagramme
css/style.css
js/main.js           Start und Render-Schleife
js/config.js         Maße und Modellgrößen
js/state.js          Zustand (Messgerät, Schalter, Stecker, Polung, Stärke, Windungszahl, Anzeigen)
js/physik.js         Fluss, Spannung, Kollision, Ziehen und Drehen, Anschluss, Zeiger, Multimeter (ohne three.js, testbar)
js/modell.js         Stabmagnet, Spule mit Anschlüssen (Wicklung je Windungszahl), B-Pfeil
js/feldlinienModell.js  Feldlinien als Punktfolgen (ohne three.js) und Feldlinien in der Spule fürs Feldlinienmodell
js/feldlinien.js     Darstellung der Feldlinien je Stärke, Hervorhebung im Spuleninneren
js/messgeraet.js     Zeigermessgerät, Multimeter mit Drehschalter und vier Buchsen
js/kabel.js          Kabel mit Steckern: lose hängen, an Buchsen ziehen, einrasten
js/ziehen.js         Maus und Finger: Stecker, Drehschalter, Magnet und Spule
js/diagramm.js       Diagramme B–t und U–t
js/bedienfeld.js     Bedienfeld und Startansicht
js/szene.js, js/materialien.js, js/hilfen.js   wie beim Innenpolgenerator
tests/physik.test.mjs
```

## Starten und testen

Die Simulation lädt [three.js](https://threejs.org) aus dem Internet und muss über einen Webserver geöffnet
werden (ein Doppelklick auf `index.html` reicht nicht), z. B. im Ordner `website/` `python3 -m http.server` und
<http://localhost:8000/simulationen/induktion-spule/>.

Tests der Physik ohne Browser: im Ordner der Simulation `npm test` (bzw. im Ordner `website/` für alle).
