# Innenpolgenerator

Interaktive 3D-Simulation für den Physikunterricht (Jahrgangsstufe 10, elektromagnetische Induktion; Tablet
geeignet). In der Mitte dreht sich ein Magnet (Polrad), außen stehen Spulen mit Eisenkern fest – so sind echte
Kraftwerksgeneratoren und viele Windkraftgeneratoren aufgebaut.

Die Simulation setzt beim Induktionsgesetz in der Form an, die die Schüler kennen: **Ändert sich das Magnetfeld
im Inneren einer Spule, wird an ihren Enden eine Spannung induziert.** Sie braucht keine Lorentzkraft (anders als
die rotierende Leiterschleife in `generator-windpark`).

## Kernidee

Zu jeder Spule sieht man das Magnetfeld B im Spuleninneren (Pfeil) und zwei Diagramme übereinander auf derselben
Zeitachse: oben B–t, unten U–t. So wird sichtbar, was oft falsch vermutet wird:

- Die Spannung ist **nicht** am größten, wenn ein Pol auf die Spule zeigt (B am größten) – dort ändert sich B
  gerade nicht, also ist U = 0.
- Sie ist am größten, wenn sich B am schnellsten ändert: beim Nulldurchgang von B (Magnet quer zur Spule).
- Steht der Magnet still, ist U = 0 – auch wenn B groß ist.

Hilfen dafür: **Magnet festhalten** (mit Drehwinkel-Regler oder Kurbel Stellung für Stellung durchgehen),
**Zeitlupe** und **Änderung von B (Tangente)** an die B-Kurve im aktuellen Punkt.

## Funktionen

- **Aufbau**
  - **1 Spule** (oben): Stabmagnet dreht sich vor einer Spule mit Eisenkern und Polschuh.
  - **2 Spulen**: zweite Spule unten, dazu ein Eisenjoch (Ring), das die Kerne außen verbindet – wie der Stator
    eines echten Generators. Die Spulen sind in Reihe geschaltet; zwei Möglichkeiten zum Verbinden:
    **Ende – Ende** (E₁ mit E₂): Spannungen addieren sich, doppelte Spannung.
    **Ende – Anfang** (E₁ mit A₂): Spannungen heben sich auf, das Messgerät zeigt nichts.
    Die Kabel liegen dabei sichtbar anders. Die Knöpfe beschreiben nur die Verbindung, nicht, welche richtig ist.
    Im U–t-Diagramm stehen dann U₁, U₂ (dünn) und U am Messgerät (dick); im B–t-Diagramm B in beiden Spulen.
- **Antrieb:** Drehzahl-Regler −3 … +3 Umdrehungen pro Sekunde, „Anhalten“; oder **Kurbel** vorne an der Welle
  mit Maus oder Finger drehen (wer die Kurbel greift, schaltet auf diesen Antrieb; losgelassen läuft der Magnet
  langsam aus).
- **Magnet festhalten** mit Drehwinkel-Regler (0°–360°), Zeitlupe (¼).
- **Frequenz der Wechselspannung** (bei einem Polpaar gleich der Drehzahl).
- **Anzeigen:** B im Spuleninneren (Pfeil; Wicklung und Kern werden dafür durchsichtig), Diagramme B–t und U–t,
  Änderung von B (Tangente).
- **Zeigermessgerät** mit Nullpunkt in der Mitte, Messbereiche ±0,3 / ±1 / ±3 V. Ab etwa 2 Umdrehungen pro
  Sekunde kann der träge Zeiger nicht mehr folgen und zittert nur um die Null – wie ein echtes
  Demonstrations-Messgerät. Das Diagramm zeigt die Wechselspannung trotzdem.
- **Link / QR-Code zeigen** (gemeinsamer Baustein `gemeinsam/link.js`).
- Die Startansicht passt sich der Fenstergröße an (Laptop, iPad quer und hochkant), solange man die Ansicht nicht
  selbst gedreht hat.

## Physikalisches Modell

- Magnet: Drehwinkel φ gegen den Uhrzeigersinn von vorne, φ = 0: Nordpol zeigt auf Spule 1 (oben).
- Flussdichte im Kern einer Spule an der Lage θ (Spule 1: 0°, Spule 2: 180°), gezählt nach außen:
  **B = B_max · cos(φ − θ)** mit B_max = 100 mT. Das ist eine Vereinfachung – eine echte Feldberechnung wäre
  aufwendig und für das Verständnis nicht nötig. Echte Generatoren formen ihre Polschuhe aber genau so, dass B
  annähernd sinusförmig von der Stellung abhängt.
- Induktionsgesetz: **U = −N · A · dB/dt** mit N = 500 Windungen und dem Kernquerschnitt A ≈ 9 cm²; daraus
  U = N · A · B_max · ω · sin(φ − θ). Bei 1 Umdrehung pro Sekunde ist der Scheitelwert einer Spule etwa 0,29 V.
- Zwei Spulen: Wendet der Magnet Spule 1 den Nordpol zu, wendet er Spule 2 den Südpol zu – also B₂ = −B₁ und
  U₂ = −U₁. Ende – Ende ergibt U = U₁ − U₂ = 2 · U₁, Ende – Anfang U = U₁ + U₂ = 0.
- Drehung als Bewegungsgleichung (Drehzahl-Regler stellt die Drehzahl mit 0,4 s Zeitkonstante ein, Kurbel folgt
  dem Finger, freies Auslaufen mit Reibung) – vorbereitet für ein späteres Gegenmoment bei Belastung (Lenz).
- Zeiger: gedämpfter Schwinger (Eigenfrequenz 1,2 Hz, Dämpfungsgrad 0,55), Anschlag bei 108 %.

## Plan

1. Eine Spule, B im Spuleninneren, Diagramme B–t und U–t, Tangente ✓
2. Zwei Spulen in Reihe mit Eisenjoch, Ende – Ende / Ende – Anfang ✓
3. Drei Spulen um 120° versetzt: Drehstrom
4. Polrad mit mehreren Polpaaren: f = p · n (warum langsame Windräder viele Pole haben)
5. Polrad als Elektromagnet (Erregerspule über Schleifringe – dort fließt nur der kleine Erregerstrom)
6. Tafel (gemeinsamer Baustein `gemeinsam/tafel/`): Polrad in mehreren Stellungen, darunter leere B–t- und
   U–t-Diagramme
7. Später: Belastung mit Gegenmoment, Glühlampe als Gedankenexperiment

## Starten

Die Simulation lädt [three.js](https://threejs.org) aus dem Internet und muss über einen Webserver geöffnet
werden (ein Doppelklick auf `index.html` reicht nicht). Weil sie den QR-Code-Baustein aus `website/gemeinsam/`
lädt, muss der Webserver im Ordner `website/` laufen:

- **Terminal:** im Ordner `website/` `python3 -m http.server` ausführen und
  <http://localhost:8000/simulationen/innenpolgenerator/> öffnen
- **VS Code:** Erweiterung „Live Server“ mit dem Ordner `website/` als Arbeitsbereich

## Projektstruktur

```text
innenpolgenerator/
├── index.html          # Seitengerüst, Bedienfeld, Diagramme
├── css/style.css
├── js/
│   ├── main.js         # Start und Render-Schleife
│   ├── config.js       # Maße und Modellgrößen
│   ├── state.js        # Zustand (Aufbau, Antrieb, Anzeigen, Messbereich)
│   ├── physik.js       # Drehung, B in den Spulen, Induktionsspannung, Zeiger (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht, Startansicht einpassen
│   ├── modell.js       # Polrad mit Kurbel, Spulen mit Eisenkern, Joch, B-Pfeile
│   ├── messgeraet.js   # Zeigermessgerät und Kabel (je nach Schaltung verlegt)
│   ├── diagramm.js     # Diagramme B–t und U–t, Tangente
│   ├── ziehen.js       # Kurbel mit Maus/Finger drehen
│   ├── bedienfeld.js   # Knöpfe, Regler, Anzeigen, freie Fläche für die Startansicht
│   ├── hilfen.js       # Hilfsfunktionen (Beschriftungen)
│   └── materialien.js  # gemeinsame Materialien
├── tests/physik.test.mjs
└── package.json
```

## Tests

```bash
npm test
```

Prüft u. a.: B am größten bei U = 0, |U| am größten beim Nulldurchgang von B, U = −N·A·dB/dt, Scheitelwert
proportional zur Drehzahl, zwei Spulen (doppelt bzw. null), Frequenz, Zeiger, Kurbel und Festhalten.
