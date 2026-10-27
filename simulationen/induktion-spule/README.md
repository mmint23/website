# Induktion: Stabmagnet und Spule

Interaktive 3D-Simulation für den Physikunterricht (Jahrgangsstufe 10, elektromagnetische Induktion; Tablet
geeignet). Der klassische Einstiegsversuch zum Induktionsgesetz, rein qualitativ: Ein Stabmagnet und eine Spule
werden gegeneinander verschoben, ein Messgerät an der Spule zeigt, wann eine Spannung entsteht.

## Kernidee

**Ändert sich das Magnetfeld im Inneren der Spule, wird an ihren Enden eine Spannung induziert.** Die Feldlinien
des Magneten lassen sich einblenden; die Abschnitte, die gerade im Inneren der Spule liegen, sind violett. So sieht
man beim Verschieben, wie sich „das Feld in der Spule“ ändert – und dass das Messgerät genau dann ausschlägt.

Was sich damit erarbeiten lässt:

- Magnet in Ruhe – auch mitten in der Spule: keine Spannung.
- Hineinschieben und Herausziehen: Ausschläge in entgegengesetzte Richtungen.
- Schneller bewegen: größerer Ausschlag.
- Magnet umdrehen: Ausschläge kehren sich um.
- Spule über den ruhenden Magneten schieben wirkt genauso wie Magnet in die ruhende Spule: Es kommt nur auf die
  Relativbewegung an.
- Weit weg vom Magneten ändert sich beim Bewegen fast nichts im Spuleninneren – kein Ausschlag.

## Funktionen

- **Ziehen** mit Maus oder Finger: Magnet oder Spule greifen und entlang der gemeinsamen Achse verschieben (der
  Magnet passt durch die Spule). Steckt der Magnet in der Spule, greift man ihn dort; die Spule dann an den
  Flanschen. Daneben ziehen dreht die Ansicht.
- **Messgerät:** Zeigermessgerät mit Nullpunkt in der Mitte (Messbereich ±0,1 / ±0,3 / ±1 V; träger Zeiger wie
  bei Leiterschaukel und Generator) oder **kleines Multimeter** (Gleichspannung). Das Multimeter zeigt wie ein
  echtes nur dreimal pro Sekunde einen neuen Messwert (Mittelwert der letzten 0,1 s) – eine schnelle Bewegung kann
  es verpassen. Die Kabel (rot an Anschluss A, schwarz an E) folgen der Spule.
- **Magnet umdrehen (N ↔ S)**, **Magnet und Spule zurück an den Start**.
- **Anzeigen:** Magnetfeld (Feldlinien mit Pfeilen; Spule und Magnet werden dafür durchsichtig), B im
  Spuleninneren (Pfeil entlang der Achse, Länge ∝ mittlere Flussdichte), Diagramme B–t und U–t auf derselben
  Zeitachse (letzte 6 s).

## Physikalisches Modell

- Magnet: 10 cm lang, Querschnitt 2 cm × 2 cm, Flussdichte im Magneten 0,3 T. Spule: 600 Windungen, 9 cm lang,
  Windungsradius 2,3 cm. Größenordnung: Magnet mit 20–30 cm/s hineinschieben gibt etwa 0,1 V.
- Polmodell: je ein Pol der Stärke p = B · A auf den Stirnflächen. Durch eine Windung geht vom Pol der Anteil
  des Raumwinkels, Φ = ±p/2 · (1 − |d|/√(d² + R²)); schneidet die Windung den Magneten, kommt der Fluss im
  Magneten dazu. Φ ändert sich damit stetig. Die Spule zählt als 48 gleichmäßig verteilte Windungen;
  U = −N · dΦ/dt.
- Feldlinien: Außen folgen sie dem Feld der beiden Polflächen (gleichmäßig belegt, aus Punkten zusammengesetzt),
  innen laufen sie gerade vom Süd- zum Nordpol. Gezeigt ist die Ebene durch die Achse.
- Beim Ziehen folgt das Teil dem Finger mit 0,03 s Verzögerung; losgelassen bleibt es stehen.
- Magnet umdrehen gilt als sofort – ohne Spannungsstoß (in echt entstünde beim Umdrehen nahe der Spule einer).

## Dateien

```text
index.html           Seite: Szene, Bedienfeld, Diagramme
css/style.css
js/main.js           Start und Render-Schleife
js/config.js         Maße und Modellgrößen
js/state.js          Zustand (Messgerät, Messbereich, Polung, Anzeigen)
js/physik.js         Fluss, Spannung, Ziehen, Zeiger, Multimeter (ohne three.js, testbar)
js/modell.js         Stabmagnet, Spule mit Anschlüssen, B-Pfeil
js/feldlinien.js     Feldlinien des Magneten, Hervorhebung im Spuleninneren
js/messgeraet.js     Zeigermessgerät, Multimeter, Kabel
js/ziehen.js         Magnet und Spule mit Maus oder Finger verschieben
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
