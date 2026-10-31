# Innenpolgenerator

Interaktive 3D-Simulation für den Physikunterricht (Jahrgangsstufe 10, elektromagnetische Induktion; Tablet
geeignet). In der Mitte dreht sich ein Magnet (Polrad), außen stehen Spulen fest – zu Beginn als Luftspulen, auf
Knopfdruck mit Eisenkern. Mit Eisenkern sind echte Kraftwerksgeneratoren und viele Windkraftgeneratoren aufgebaut.
Der Aufbau liegt waagrecht und steht auf einem Tisch (mit Schatten): Eine Säule hinter dem Polrad trägt die Welle,
ein waagrechter Balken darauf hält die Spulen an ihrem äußeren Flansch; das Messgerät steht daneben.

Die Simulation setzt beim Induktionsgesetz in der Form an, die die Schüler kennen: **Ändert sich das Magnetfeld
im Inneren einer Spule, wird an ihren Enden eine Spannung induziert.** Sie braucht keine Lorentzkraft (anders als
die rotierende Leiterschleife in `generator-leiterschleife`).

## Kernidee

In der Standardansicht sieht man den Generator mit zwei Spulen (ohne Beschriftung von Spulen und Anschlüssen),
Kabeln und Messgerät (U–t-Diagramm auf Wunsch). Das Magnetfeld gibt es nur im **Erklärmodus** („Erklärung: Magnetfeld in
den Spulen“): Dort sieht man zu jeder Spule B im Spuleninneren (Pfeil) und die Feldlinien, auf Wunsch dazu das
U–t-Diagramm. So wird sichtbar, was oft falsch vermutet wird:

- Die Spannung ist **nicht** am größten, wenn ein Pol auf die Spule zeigt (B am größten) – dort ändert sich B
  gerade nicht, also ist U = 0.
- Sie ist am größten, wenn sich B am schnellsten ändert. Mit Eisenkern ist das beim Nulldurchgang von B (Magnet
  quer zur Spule); ohne Eisenkern schon früher, etwa 25° nach der Stellung „Pol auf die Spule“ – dort fällt B am
  steilsten ab.
- Steht der Magnet still, ist U = 0 – auch wenn B groß ist.

**Feldlinienmodell** (Standard, wie bei `induktion-spule`): Die Feldlinien des Magneten lassen sich einblenden,
die Abschnitte im Inneren der Spule violett färben. Beim Drehen sieht man, wie sich die Zahl der Feldlinien durch
die Spule ändert: Zeigt ein Pol auf die Spule, gehen die meisten Linien hindurch – aber ihre Zahl ändert sich
gerade nicht (U = 0). Steht der Magnet quer, geht keine Linie hindurch – aber die Zahl wechselt gerade am
schnellsten von „nach außen“ zu „nach innen“ (|U| am größten). Im Feldlinienmodell werden B und U aus der Zahl der
gezeigten Feldlinien berechnet: *Ändert sich die Zahl der Feldlinien durch die Spule, wird eine Spannung
induziert.* Der Knopf **„Reale Physik“** im Erklärmodus schaltet auf das cos-Modell um (siehe unten);
nochmal gedrückt geht es zurück. Weil die Linien so gebaut sind, dass ihre Zahl fast wie cos verläuft, stimmen
beide Modelle annähernd überein (Abweichung von B höchstens etwa 10 %).

**Ohne / mit Eisenkern** (Standard: ohne): Ohne Eisen gehen bei „Nordpol auf die Spule“ knapp 2 der 10 Feldlinien
durch die Spule, mit Eisenkern gut 6 – der Kern bündelt die Feldlinien, B und U werden etwa dreimal so groß. So
lässt sich begründen, warum Generatorspulen einen Eisenkern haben. Ohne Eisen hängt B nicht wie cos vom Drehwinkel
ab: Der Magnet ist kaum kürzer als sein Abstand zur Spule, B fällt beim Wegdrehen schnell ab.

Hilfen dafür: **Magnet festhalten** (mit Drehwinkel-Regler oder Kurbel Stellung für Stellung durchgehen),
**Zeitlupe** und **Änderung von B (Tangente)** an die B-Kurve im aktuellen Punkt.

## Funktionen

In der Simulation stehen **keine Erklärtexte, die den physikalischen Inhalt vorwegnehmen** (z. B. dass eine
Spannung induziert wird, wenn sich das Magnetfeld ändert, oder dass der Eisenkern die Feldlinien bündelt) – das
sollen die Schüler selbst herausfinden. Es bleiben die Überschrift (ohne Untertitel), Bedienhinweise und rein beschreibende Angaben.

- **Aus dem Windpark** (Windrad antippen in der Simulation Generator-Windpark, Adresse `?von=windpark&wind=…&zeit=…`):
  Ganz oben im Bedienfeld erscheint „← Zurück zum Windpark“; Wind und Uhrzeit gehen zurück mit.
- **Erklärung: Magnetfeld in den Spulen** (oben im Bedienfeld; „Zurück zum Modell“ beendet ihn). Die Schalter zum
  Magnetfeld stehen dann in einem eigenen Feld links unter der Überschrift (wie in `generator-leiterschleife`;
  schmale Fenster: oben), die Spulen sind im ganzen Erklärmodus stark durchsichtig. Nur im Erklärmodus:
  **Magnetfeld (Feldlinien)** (10 Linien in der Bildebene
  mit Pfeilen; Spulen, Magnet und Joch werden dafür durchsichtig), **Feldlinien im Inneren der Spule färben**
  (kräftig violett und breiter darübergezeichnet; nur mit eingeblendeten Feldlinien), **B im Spuleninneren**
  (Pfeil; Wicklung und Kern werden dafür durchsichtig; zu Beginn aus). Ein B–t-Diagramm gibt es nicht (mehr).
  Beim Verlassen des Erklärmodus geht alles zum Magnetfeld wieder aus.
  Im Erklärmodus gibt es **nur ein Bedienfeld (links)**, das rechte ist ausgeblendet: oben Link/QR-Code und
  „Zurück zum Modell“, dann der **Antrieb** (wie in `generator-leiterschleife`): Wind, Drehzahl oder Kurbel mit
  Regler, darunter **Pause** und **Zeitlupe** nebeneinander, dann **Magnet festhalten** mit Drehwinkel-Regler;
  danach das Magnetfeld und ganz unten die Anzeige (Diagramme, Messbereich). Der Antrieb sieht im Modell genauso aus
  (rechts); „Anhalten“ gibt es nicht mehr. (`bedienfeld.js` hängt die Abschnitte aus dem rechten Feld um und wieder zurück.) **Aufbau** (Eisenkern, Verbindung der Spulen) gibt es
  nur im Modell, ganz unten im rechten Bedienfeld; darüber, ebenfalls nur im Modell, **Rechnung**:
  „Reale Physik“ und „Feldlinienmodell“ als zwei Knöpfe nebeneinander (Standard: Feldlinienmodell).
- **Anzeige** (nur im Modell): statt des Messgeräts eine **LED** oder eine **Glühlampe** auf einer Steckplatte
  (Gedankenexperiment wie in `generator-leiterschleife`; in der Simulation steht dazu kein Erklärtext). Die LED
  leuchtet ab 0,05 V, voll ab 0,15 V, nur in Durchlassrichtung (rote Buchse an A₁, wie die Plus-Buchse); die
  Glühlampe glüht ab 0,08 V sichtbar, voll bei 0,2 V, in beiden Richtungen, mit kurzem Nachglühen. Bei 0,5 U/s und
  „Ende – Ende“: mit Eisenkern (Scheitelwert etwa 0,23 V im Feldlinienmodell) leuchten beide hell, ohne Eisenkern
  (etwa 0,1 V) blitzt die LED schwach und die Lampe bleibt fast dunkel – so wird sichtbar, wozu der Eisenkern da
  ist; bei „Ende – Anfang“ bleibt alles dunkel. Real bräuchte eine LED etwa 1,8 V.
  Zu Beginn: Standardansicht, Feldlinienmodell, ohne Eisenkern, Diagramme aus (auch im Erklärmodus erst auf
  Wunsch).
- **Aufbau:** immer zwei Spulen (rechts Spule 1, links Spule 2), in Reihe geschaltet.
  - **Ohne Eisenkern** (Luftspulen, Standard) / **Mit Eisenkern** (Kern mit Polschuh und Eisenjoch – ein Ring, der
    die Kerne außen verbindet, wie der Stator eines echten Generators).
  - Verbinden: **Ende – Ende** (E₁ mit E₂): Spannungen addieren sich, doppelte Spannung.
    **Ende – Anfang** (E₁ mit A₂): Spannungen heben sich auf, das Messgerät zeigt nichts.
    Die Kabel liegen dabei sichtbar anders (alle schwarz – Wechselspannung; das Kabel von Spule 2 zum Messgerät
    liegt vorne auf dem Tisch); Spulen und Anschlüsse sind in der Szene nicht beschriftet. Die Knöpfe
    beschreiben nur die Verbindung, nicht, welche richtig ist.
    Im U–t-Diagramm stehen U₁, U₂ (dünn) und U am Messgerät (dick).
  - Physik und Tests können weiterhin mit einer Spule rechnen (`state.coils = 1`); im Bedienfeld gibt es das nicht
    mehr.
- **Antrieb:**
  - **Wind** (wie in `generator-leiterschleife`): Statt der Kurbel sitzt ein kleiner Rotor mit drei Blättern hinter
    dem Ständer auf der verlängerten Welle (vorne würde er den Magneten verdecken). Rotor und Magnet drehen auf
    derselben Welle (Generator ohne Getriebe), Wind-Regler 0 … 20 m/s. **Didaktisch vereinfacht:** Ab 3 m/s dreht
    der Rotor proportional zum Wind, bei 12 m/s wie im Windpark 14 U/min; die Drehzahl stellt sich träge ein
    (Zeitkonstante 1,5 s). Scheitelwert bei 12 m/s mit Eisenkern und „Ende – Ende“ etwa 0,13 V, ohne Eisenkern
    etwa ein Drittel davon. Die Diagramme zeigen dann 12 s statt 4 s.
    Aus dem Windpark gekommen (`?von=windpark&wind=…`) ist dieser Antrieb mit dem Wind von dort eingestellt;
    „← Zurück zum Windpark“ nimmt den hier eingestellten Wind mit.
  - **Drehzahl-Regler** −3 … +3 Umdrehungen pro Sekunde (Mitte: Stillstand).
  - **Kurbel** vorne an der Welle mit Maus oder Finger drehen (wer die Kurbel greift, schaltet auf diesen Antrieb;
    losgelassen läuft der Magnet langsam aus).
- **Pause** und **Zeitlupe** (¼) nebeneinander und **Magnet festhalten** als Knöpfe unter dem Antrieb (im Modell
  rechts, im Erklärmodus links): Festgehalten
  erscheint darunter der Drehwinkel-Regler (0°–360°), mit dem man den Magneten von Hand Stellung für Stellung dreht.
- **Frequenz der Spannung** (bei einem Polpaar gleich der Drehzahl).
- **Diagramm U–t** (Haken bei der Anzeige, zu Beginn aus).
- **Zeigermessgerät** mit Nullpunkt in der Mitte, Messbereiche ±0,3 / ±1 / ±3 V. Ab etwa 2 Umdrehungen pro
  Sekunde kann der träge Zeiger nicht mehr folgen und zittert nur um die Null – wie ein echtes
  Demonstrations-Messgerät. Das Diagramm zeigt die Wechselspannung trotzdem.
- **Link / QR-Code zeigen** (gemeinsamer Baustein `gemeinsam/link.js`).
- **QR-Code für den Erklärmodus:** Adresse mit `?erklaerung` – wer sie öffnet, landet gleich im Erklärmodus (wie der
  Schülermodus-QR-Code in `generator-leiterschleife`). Über den Abgabe-Server mit der Adresse des Laptops im WLAN.
  „Zurück zum Modell“ bleibt möglich.
- Die Startansicht passt sich der Fenstergröße an (Laptop, iPad quer und hochkant), solange man die Ansicht nicht
  selbst gedreht hat.

## Laserpointer

Der Knopf **„Laserpointer“** (oben im Bedienfeld unter „Link / QR-Code zeigen“, im Erklärmodus oben im linken Feld, am Laptop auch die Taste **L**) schaltet einen Zeigestift ein: Mit
**Apple Pencil oder Maus** markiert man Stellen, um zu zeigen, wovon man gerade spricht. Die Spur leuchtet rot über
allem und verblasst etwa 1,5 Sekunden nach dem Absetzen; an der Simulation ändert sich nichts.
Solange er an ist, bedienen Stift und Maus die Simulation nicht (kein Drehen der Ansicht, keine Kurbel);
**Finger** funktionieren weiter wie gewohnt, Knöpfe und Regler auch mit Stift oder Maus. Läuft auch ohne
Abgabe-Server. Bei der **Live-Steuerung** erscheinen die Spuren des steuernden Geräts auch auf dem anderen – in der
Szene am selben Teil des Modells; der Laserpointer-Knopf bleibt auch beim Zuschauen bedienbar (die Spuren
sieht dann nur das eigene Gerät). Gemeinsamer Baustein der Website: `gemeinsam/laser/` (wie in der Leiterschaukel).

## Live-Steuerung: Schüler steuert am Beamer

Über den Abgabe-Server (im Ordner `website/` `npm start`, Lehrerseite <http://localhost:8080/lehrer/innenpolgenerator>;
gemeinsamer Baustein `gemeinsam/live/`, wie bei `induktion-spule`): Der Innenpolgenerator hat keine Tafel, deshalb
steht das Bedienfeld der Live-Steuerung als kleiner Kasten unten links (im Erklärmodus unten rechts, wo dann kein
Bedienfeld ist), mit „Steuerung abgeben“ (QR-Code), „Schüler steuert“ / „Ich steuere“, „Trennen“ und „Lehrerseite
auf anderem Gerät“. Gespiegelt werden alle Einstellungen (auch Erklärmodus, Feldlinien, Anzeige), die Drehung des
Magneten, Zeiger, Glühdraht, Windrotor, U–t-Diagramm, die Ansicht und die Laserpointer-Spuren; Feldlinien, B-Pfeile, Spannung und LED rechnet
das zuschauende Gerät aus der übernommenen Stellung selbst. Technik: `js/live.js`.

## Physikalisches Modell

- Magnet: Drehwinkel φ gegen den Uhrzeigersinn von vorne, φ = 0: Nordpol zeigt auf Spule 1 (rechts).
- Flussdichte im Kern einer Spule an der Lage θ (Spule 1: 0°, Spule 2: 180°), gezählt nach außen:
  **B = B_max · cos(φ − θ)** mit B_max = 100 mT. Das ist eine Vereinfachung – eine echte Feldberechnung wäre
  aufwendig und für das Verständnis nicht nötig. Echte Generatoren formen ihre Polschuhe aber genau so, dass B
  annähernd sinusförmig von der Stellung abhängt.
- Induktionsgesetz: **U = −N · A · dB/dt** mit N = 500 Windungen und dem Kernquerschnitt A ≈ 9 cm²; daraus
  U = N · A · B_max · ω · sin(φ − θ). Bei 1 Umdrehung pro Sekunde ist der Scheitelwert einer Spule etwa 0,29 V.
- Zwei Spulen: Wendet der Magnet Spule 1 den Nordpol zu, wendet er Spule 2 den Südpol zu – also B₂ = −B₁ und
  U₂ = −U₁. Ende – Ende ergibt U = U₁ − U₂ = 2 · U₁, Ende – Anfang U = U₁ + U₂ = 0.
- **Ohne Eisenkern, reale Physik** (`luftfeld.js`): Der Magnet ist räumlich aus seinen Polflächen zusammengesetzt;
  gemittelt wird die Feldkomponente entlang der Spulenachse über das Innere der Wicklung. Der Höchstwert von B ist
  so gewählt, dass er zum Feldlinienmodell passt (Verhältnis der Linienzahlen ohne/mit Eisen, etwa 29 mT). Bei
  1 Umdrehung pro Sekunde: Scheitelwert etwa 0,1 V, größte Spannung bei etwa 23°.
- **Feldlinienmodell** (`feldlinienModell.js`, ebenes Modell in der Bildebene): Der Magnet besteht aus zwei
  Polflächen mit gleichmäßig verteilter Polstärke, innen gleichmäßig magnetisiert. Jeder Eisenkern wird vom Magneten
  magnetisiert (nur „Mit Eisenkern“) und wirkt selbst wie ein Stabmagnet entlang der Spulenachse, mit der Stärke 0,3 · cos(φ − θ) (Anteil
  der Polstärke des Magneten) – so bündelt der Kern die Linien, wenn ein Pol auf ihn zeigt. Die 10 gezeichneten
  Linien verlassen den Nordpol in gleichen Flussabständen. Weil Feldlinien Höhenlinien einer Stromfunktion ψ sind,
  ist die Zahl der Linien durch die Spule = Fluss durch den Querschnitt (Mitte der Wicklung, ganze Breite) / Fluss
  je Linie; sie ändert sich stetig (eine Linie am Rand der Wicklung zählt zum Teil). Nordpol auf Spule 1: gut 6 von
  10 Linien gehen hindurch. B = B_max · n / n₀, U = −N · A · dB/dt. **Vereinfachung:** Das Joch lenkt die Linien
  nicht um (bei zwei Spulen laufen sie über den Ring hinweg). Linien, die quer durch die Wicklung laufen, werden
  violett gefärbt, zählen aber nicht (nur der Fluss entlang der Achse zählt).
- Drehung als Bewegungsgleichung (Drehzahl-Regler stellt die Drehzahl mit 0,4 s Zeitkonstante ein, Kurbel folgt
  dem Finger, freies Auslaufen mit Reibung) – vorbereitet für ein späteres Gegenmoment bei Belastung (Lenz).
- Zeiger: gedämpfter Schwinger (Eigenfrequenz 1,2 Hz, Dämpfungsgrad 0,55), Anschlag bei 108 %.

## Plan

1. Eine Spule, B im Spuleninneren, Diagramme B–t und U–t, Tangente ✓ (B–t und Tangente später wieder entfernt)
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
│   ├── physik.js       # Drehung, B in den Spulen (real oder Feldlinienmodell), Induktionsspannung, Zeiger (ohne 3D, testbar)
│   ├── feldlinienModell.js  # Feldlinien als Punktfolgen, Zahl der Linien durch eine Spule (ohne 3D, testbar)
│   ├── luftfeld.js     # reale Physik ohne Eisenkern: räumliches Feld des Magneten in der Luftspule
│   ├── feldlinien.js   # Darstellung der Feldlinien, violette Abschnitte im Spuleninneren
│   ├── szene.js        # Renderer, Kamera, Licht, Startansicht einpassen
│   ├── modell.js       # Polrad mit Kurbel, Spulen mit Eisenkern, Joch, B-Pfeile
│   ├── messgeraet.js   # Zeigermessgerät und Kabel (je nach Schaltung verlegt)
│   ├── led.js          # LED statt Messgerät (Gedankenexperiment, wie in generator-leiterschleife)
│   ├── gluehlampe.js   # Glühlampe statt Messgerät (Gedankenexperiment)
│   ├── diagramm.js     # U–t-Diagramm
│   ├── ziehen.js       # Kurbel mit Maus/Finger drehen
│   ├── bedienfeld.js   # Knöpfe, Regler, Anzeigen, freie Fläche für die Startansicht
│   ├── live.js         # Live-Steuerung (gemeinsam/live/)
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
proportional zur Drehzahl, zwei Spulen (doppelt bzw. null), Frequenz, Zeiger, Kurbel und Festhalten; im
Feldlinienmodell: Linienzahl stetig und etwa ∝ cos, |U| am größten bei quer stehendem Magneten, Linien durch die
Wicklung.
