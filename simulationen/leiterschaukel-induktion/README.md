# Induktion: Leiterschaukel im Magnetfeld

Interaktive 3D-Simulation für den Physikunterricht (Jahrgangsstufe 10, elektromagnetische Induktion,
Tablet geeignet). Eine Leiterschaukel – ein Kupferstab an zwei Messingbügeln – hängt an einem Stativ
zwischen den Polen eines großen Hufeisenmagneten. Bewegt man die Schaukel, wird im Stab eine Spannung
induziert, die ein großes Demonstrations-Zeigermessgerät (Nullpunkt in der Mitte) anzeigt.

## Funktionen

Zwei Versuche, per Knopf umschaltbar:

- **Drehbarer Magnet:** Der Magnet sitzt in einem Drehgelenk mit Winkelskala (siehe unten).
- **Magnet auf dem Tisch:** Der Magnet liegt flach auf dem Tisch und lässt sich mit Maus/Finger nach vorne
  und hinten schieben. Die Querstange ist dafür tiefer am Stativ eingespannt. Entscheidend für die
  Spannung ist die Relativbewegung: Magnet nach hinten ziehen wirkt wie Schaukel nach vorne bewegen.
  Schiebt man den Magneten gegen den Stab, drückt der Bogen die Schaukel mit.

- **Schaukel bewegen:** Stab oder Bügel mit Maus/Finger fassen und ziehen. Beim Loslassen schwingt die
  Schaukel gedämpft weiter. „Auslenken und loslassen“ startet eine gleichmäßige Schwingung, „Zurücksetzen“
  bringt sie sofort in die Ruhelage. Am Magneten schlägt die Schaukel an.
- **Pause / Weiter:** friert den Versuch im aktuellen Zustand ein – Schaukel, Magnet, Zeigerausschlag und eine
  leuchtende LED oder Glühlampe bleiben stehen. Ziehen ist in der Pause gesperrt. „Auslenken und loslassen“ und
  „Zurücksetzen“ beenden die Pause. Derselbe Schalter wie „Pause“ im Erklärmodus.
- **Zeitlupe** (¼ der Geschwindigkeit), damit man Bewegung und Zeiger gleichzeitig verfolgen kann
- **Magnet umdrehen (N ↔ S):** Der Zeiger schlägt andersherum aus.
- **Langer Hufeisenmagnet** (in beiden Versuchen): Schenkel 32 statt 11 cm, sie reichen 16 cm vor und hinter
  den Stab. Die Schaukel kann bis etwa 37° ausschwingen, ohne anzustoßen („Auslenken und loslassen“ startet
  hier mit 25°). Beim drehbaren Magneten liegt die Drehachse dafür höher (26 statt 18 cm), damit der Bogen
  beim Drehen nicht in den Tisch fährt; Querstange und Drehgelenk sind entsprechend höher eingespannt.
- **Magnet drehen (α = 0° … 90°):** Der Magnet sitzt in einem Drehgelenk mit Winkelskala und dreht sich
  um die Achse des Stabs. Bei 0° steht das Feld senkrecht zur Bewegung (größte Spannung), bei 90°
  stehen die Schenkel vor und hinter dem Stab, das Feld zeigt in Schwingrichtung – keine Spannung.
  Dazwischen gilt U ∼ cos α.
- **Messgerät:** Spannung (mV) oder Stromstärke (mA), Messbereiche ±1, ±3, ±10. Der Zeiger ist träge,
  schwingt leicht nach und bleibt bei Überlast am Anschlag. Wahlweise Messwert zusätzlich als Zahl.
  „Zurücksetzen“ setzt den Zeiger sofort auf 0. Das Messgerät lässt sich anfassen und durch seitliches Ziehen
  um die senkrechte Achse drehen; „Messgerät zu mir drehen“ richtet die Skala zur aktuellen Ansicht aus.
  Die Kabel laufen dabei um das Gerät herum mit.
- **Kabel vertauschen** (Messgerät und LED): Das rote Kabel vom rechten Stabende steckt dann in der
  Minus-Buchse bzw. an der Kathode, das schwarze in der Plus-Buchse bzw. an der Anode. Der Zeiger schlägt
  andersherum aus, die LED leuchtet bei der jeweils anderen Halbschwingung.
- **Strommessung und Lenz'sche Regel:** Bei Strommessung ist der Kreis geschlossen, der Induktionsstrom
  bremst die Schaukel. Bei einem echten Aufbau ist das kaum zu merken; per Gedankenexperiment lässt sich
  die Bremskraft 1000-fach verstärken.

## LED statt Messgerät (Gedankenexperiment)

Unter „Anzeige“ lässt sich statt des Zeigermessgeräts eine LED auf einer Steckplatte anschließen
(rote Buchse = Anode, am rechten Stabende; schwarze Buchse = Kathode). In der Simulation steht dazu bewusst
kein Erklärtext – die Einordnung gehört in den Unterricht:

- **In Wirklichkeit leuchtet hier keine LED.** Die Leiterschaukel liefert nur U = B · l · v ≈ 0,1 T · 0,06 m
  · 0,3 m/s ≈ 2 mV (kräftig gezogen höchstens einige mV). Eine LED braucht etwa 1,8 V (rot) bis 3 V
  (weiß/blau), ein Glühlämpchen mindestens rund 1 V und einige 10 mA – es fehlt ein Faktor 300 bis 1000.
- **Im Gedankenexperiment** ist die Schwellspannung der LED auf 1 mV herabgesetzt (statt etwa 1,8 V). Darüber
  wird sie mit wachsender Spannung heller, ab 3 mV leuchtet sie voll. Die LED wirkt nicht auf die Schaukel
  zurück (keine Bremsung).
- Wie eine echte LED leuchtet sie **nur in Durchlassrichtung**, also nur, wenn das rechte Stabende Pluspol ist.
  Beim Pendeln blitzt sie deshalb nur bei jeder zweiten Halbschwingung auf; nach „Magnet umdrehen“ in der
  jeweils anderen.
- **Wie es wirklich geht:** Mit einer Spule aus vielen Windungen addieren sich die Spannungen der einzelnen
  Leiterstücke. Mit einigen hundert bis tausend Windungen und schneller Bewegung erreicht man Volt –
  so arbeiten Fahrraddynamo und Generator.

## Glühlampe statt Messgerät (Gedankenexperiment)

Als dritte Anzeige lässt sich eine Glühlampe in einer Fassung anschließen. Auch hier steht in der Simulation
kein Erklärtext:

- **Noch unrealistischer als die LED.** Ein kleines Glühlämpchen (z. B. 3,8 V / 0,07 A) braucht rund 1 V, um
  überhaupt sichtbar zu glühen, und vor allem Leistung: einige 10 mW. Die Leiterschaukel liefert etwa 2 mV
  und – bei einem Kreiswiderstand um 1 Ω – nur Mikrowatt; es fehlen mehrere Zehnerpotenzen.
- **Im Gedankenexperiment** glüht der Draht sichtbar ab 1,5 mV und ist bei 5 mV voll hell. Die Helligkeit folgt
  der Leistung (∝ U²); der Draht heizt sich kurz auf und glüht nach (Zeitkonstante 0,08 s). Er glüht erst
  dunkelrot, dann orange, bei voller Leistung warmweiß. Die Lampe wirkt nicht auf die Schaukel zurück.
- **Unterschied zur LED:** Die Glühlampe leuchtet **in beiden Stromrichtungen**, also bei jeder Halbschwingung;
  „Kabel vertauschen“ ändert nichts. Bei kleinen Schwingungen bleibt sie dunkel, während die LED (Schwelle
  1 mV) schon aufblitzt.

## Erklärung: Elektron im Leiter

Der Knopf „Erklärung: Elektron im Leiter“ blendet alles Störende aus (Stative, Querstange, Halter, Messgerät,
Kabel, Tisch). Es bleiben der Magnet und die Schaukel. Der Stab ist dicker und
durchsichtig; in seiner Mitte sitzt ein (stark vergrößertes) Elektron, dargestellt als blaue Kugel mit
„−“ darin (Atomrümpfe bei „Viele Elektronen“: rote Kugeln mit „+“). Die Zeitlupe ist eingeschaltet, die
Kamera schaut schräg von vorne auf den Stab. Schaukel (und auf dem Tisch der Magnet) lassen sich weiter ziehen.
Links erscheint ein eigenes Bedienfeld für den Erklärmodus:

- **Pause / Weiter:** friert die Bewegung ein (Schaukel, Magnet, Elektron; gekoppelt mit „Pause“ im Versuch). Die Pfeile zeigen den Augenblick,
  so bleibt z. B. der Geschwindigkeitspfeil v sichtbar, obwohl nichts mehr läuft.
- **Zeitlupe:** wie im Bedienfeld rechts (beide Schalter sind gekoppelt).
- **Leiter festhalten:** Der Leiter pendelt nicht mehr, er bleibt, wo er ist. Mit dem Regler „Lage des
  Leiters“ (Winkel in Grad, vorne +, hinten −) oder durch Ziehen lässt er sich bewegen; er folgt direkt und
  bleibt beim Loslassen stehen. „Auslenken und loslassen“ beendet das Festhalten.
- **v, B, F_L, Hand:** Pfeil v, Feldlinien B, Pfeil F_L und Hand einzeln ein- und ausblenden; beim Wechsel
  in den Erklärmodus sind alle vier zunächst ausgeschaltet.
- **Viele Elektronen:** 11 Elektronen (blau) und ebenso viele ortsfeste positive Atomrümpfe (rot) im Stab.
  Die Lorentzkraft schiebt alle Elektronen zum selben Ende; sie drängen sich dort zusammen
  (Elektronenüberschuss, Minuspol), am anderen Ende bleiben nur die Atomrümpfe (Elektronenmangel, Pluspol).
  Beschriftungen an den Stabenden erscheinen, sobald sich die Elektronen merklich verschoben haben.
- **Elektron:** beobachtetes Elektron ein-/ausblenden (zu Beginn an). Bei „Viele Elektronen“ bleibt es in der
  Reihe, nur seine Hervorhebung (weißer Rand) verschwindet.
- **Magnet umdrehen (N ↔ S)** – derselbe Knopf wie in der rechten Leiste
- **Elektronen zurücksetzen**
- **Tafel:** Unter dem Magneten steht eine kleine Tafel mit einem festen Bild des Leiters im Magnetfeld
  (`bilder/tafel.jpg`). Antippen (oder „Tafel öffnen“ im Bedienfeld) öffnet sie groß. Dort zeichnet man mit
  Apple Pencil, Finger oder Maus: Stifte v (grün), B (blau), F_L (rot), Stift (schwarz), Radierer, Freihand oder
  gerader Pfeil, Rückgängig, Alles löschen. Der Stiftdruck bestimmt die Strichbreite; sobald der Pencil benutzt
  wurde, werden Finger und Handballen auf der Zeichenfläche ignoriert. Die Zeichnung bleibt im Browser gespeichert.
  Läuft die Seite über den Abgabe-Server (siehe unten), können Schüler sie mit „Teilen“ abgeben.

- Pfeile am Elektron: Geschwindigkeit v des Leiters (grün) und Lorentzkraft F_L auf das Elektron (rot);
  die Längen wachsen mit v bzw. v·B. Das Magnetfeld B zeigen Feldlinien im Polspalt (blau, von N nach S).
- Das Elektron wandert stark verlangsamt entlang des Stabs, solange die Lorentzkraft wirkt, und bleibt
  am Stabende stehen. Schwingt die Schaukel zurück, wandert es zurück. „Auslenken und loslassen“ und
  „Elektron in die Mitte“ setzen es wieder in die Mitte.
- Rechte Hand zur Drei-Finger-Regel (abschaltbar): Daumen v (Bewegung der positiven Ladungen mit dem Leiter),
  Zeigefinger B, Mittelfinger Kraft auf eine positive Ladung. Sie dreht sich mit der Bewegungsrichtung.
  Die Kraft auf das Elektron zeigt entgegengesetzt zum Mittelfinger.
- Beim Magneten auf dem Tisch zählt die Bewegung des Leiters relativ zum Magneten (Schulmodell).

## Laserpointer

Der Knopf **„Laserpointer“** (oben im Bedienfeld rechts und in der Werkzeugleiste der großen Tafel, am Laptop auch
die Taste **L**) schaltet einen Zeigestift ein: Mit **Apple Pencil oder Maus** markiert man Stellen, um zu zeigen,
wovon man gerade spricht. Die Spur leuchtet rot über allem und verblasst etwa 1,5 Sekunden nach dem Absetzen; an
der Simulation und an der Tafel ändert sich nichts.

- Solange der Laser an ist, bedienen Stift und Maus die Simulation nicht (kein Drehen der Ansicht, kein Ziehen der
  Schaukel, kein Schreiben auf der Tafel). **Finger** funktionieren weiter wie gewohnt – mit einer Hand bedienen,
  mit dem Stift zeigen.
- Knöpfe, Regler und Eingabefelder lassen sich auch mit Stift oder Maus weiter bedienen, z. B. um den Laser wieder
  auszuschalten.
- Die Markierung ist nur auf dem eigenen Gerät zu sehen (für die Klasse: iPad per AirPlay/Kabel auf den Beamer
  spiegeln). Läuft vollständig im Browser, also auch auf GitHub Pages ohne Abgabe-Server.

## Link zeigen

Der Knopf „Link / QR-Code zeigen“ (ganz oben im Bedienfeld rechts) öffnet ein großes Fenster mit QR-Code und
Adresse der Simulation zum Abscannen vom Beamer. Bei lokal geöffneter Seite (localhost) zeigt er die öffentliche
Adresse <https://mmint23.github.io/website/simulationen/leiterschaukel-induktion/>. Das Fenster kommt aus dem
gemeinsamen Baustein [`gemeinsam/link.js`](../../gemeinsam/link.js).

## Abgabe im Unterricht (Abgabe-Server)

Schüler zeichnen auf der Tafel und schicken ihre Zeichnung mit **„Teilen“** an die Lehrkraft. Die Lehrerseite
zeigt alle Abgaben live; ein Klick öffnet eine Abgabe groß auf der Tafel. Tafel, Teilen und Lehrerseite sind der
gemeinsame Baustein der Website – **Server starten, Firewall, Hotspot, Datenschutz und Technik:
[`gemeinsam/tafel/README.md`](../../gemeinsam/tafel/README.md)**. Ohne Server (GitHub Pages, Live Server) ist
„Teilen“ ausgeblendet; die Simulation funktioniert wie bisher.

### Ablauf in der Stunde

1. Im Ordner `website/` den Server mit `npm start` starten und die Lehrerseite
   <http://localhost:8080/lehrer/leiterschaukel-induktion> öffnen (nur falls mit PIN gestartet: PIN eingeben). Die
   Seite erzeugt einen zufälligen **Raumcode** (z. B. `k7m2`) und schreibt ihn in die Adresse – Neuladen bleibt im
   selben Raum. Unten erscheint die Leiste **„Abgaben“** mit Raumcode, Adresse und QR-Code („Groß“ zeigt den
   QR-Code groß und alle Abgaben als Raster).
2. Schüler scannen den QR-Code (er enthält den Raumcode), öffnen „Erklärung: Elektron im Leiter“, tippen auf die
   Tafel und zeichnen. Optional Name/Kürzel, dann **„Teilen“** → „Geteilt ✓“. Erneutes Teilen ersetzt die vorige
   Abgabe dieses Geräts. Ohne Raumcode in der Adresse gibt es keinen „Teilen“-Knopf.
3. Neue Abgaben erscheinen in der Leiste ohne Neuladen (kurz grün umrandet). Ein Klick öffnet die Abgabe auf der
   Tafel; die kleine Tafel in der Szene zeigt dann ebenfalls diese Abgabe.
4. Die geöffnete Abgabe lässt sich mit denselben Werkzeugen ergänzen und radieren – nur als **Arbeitskopie auf dem
   Lehrergerät**: Der Schüler sieht nichts davon, das Original bleibt erhalten. „Original wiederherstellen“
   verwirft die Änderungen. Teilt der Schüler erneut, während die Kopie bearbeitet ist, steht „neue Version
   eingegangen“ im Titel – „Original wiederherstellen“ lädt sie.
5. „Abgabe löschen“ (in der Tafel) bzw. „Alle löschen“ (in der Leiste) fragen einmal nach („Wirklich …?“).
   „Eigene Tafel“ in der Leiste führt zurück zur eigenen Zeichnung.

### Live-Steuerung: Schüler steuert am Beamer

In der Abgabeleiste der Lehrerseite: **„Steuerung abgeben“** zeigt einen QR-Code. Ein Schüler scannt ihn und
bedient die Leiterschaukel auf seinem iPad – der Beamer zeigt genau das, auch Erklärmodus, Kamera und Messgerät.
**„Ich steuere“ / „Schüler steuert“** schaltet hin und her, ohne neues Scannen; „Trennen“ beendet. Laserpointer
und „Link / QR-Code zeigen“ bleiben am Beamer bedienbar. Benutzt das steuernde Gerät den Laserpointer, erscheint die
Spur auch am Beamer (bzw. umgekehrt auf dem Schülergerät, wenn die Lehrkraft steuert) – am selben Teil der
Simulation, auch bei anderer Bildschirmgröße. Einzelheiten:
[`gemeinsam/live/README.md`](../../gemeinsam/live/README.md).

### Technik (Leiterschaukel)

- `js/live.js` bindet die Live-Steuerung an: Zustand aus `state.js` (ohne Laserpointer) senden bzw. übernehmen
  und dabei nur neu aufbauen, was sich geändert hat (Versuch, Anzeige, Kabel, Polung).
- `js/tafel3d.js` richtet die gemeinsame Tafel ein (Bild, Stifte v/B/F_L/Stift, Laserpointer in der
  Werkzeugleiste) und zeigt ihren Inhalt als kleine Tafel in der 3D-Szene.
- Der **Zustand der Simulation** liegt zentral in `js/state.js`: Einstellungen, bewegte Teile (Schaukel, Zeiger,
  Magnet, Elektronen), Drehung des Messgeräts und Kameraansicht. Die Darstellung wird in jedem Bild daraus
  gezeichnet; `zustandAlsDaten()` liefert eine JSON-fähige Kopie. Das ist die Grundlage für einen späteren
  Live-Modus (Simulation eines Schülers auf den Beamer spiegeln): Der Schüler schickt diese Daten regelmäßig über
  seinen WebSocket, der Server reicht sie an die Lehrerseite weiter.
- Das Tafelbild `bilder/tafel.jpg` ist ein Screenshot des Erklärmodus (Startansicht, drehbarer kurzer Magnet,
  Nordpol oben) mit einem schwarzen Pfeil rechts neben dem Stab, der die Bewegungsrichtung vorgibt (nach innen,
  in den Magneten hinein). Es lässt sich durch ein anderes Bild im Seitenverhältnis 16 : 10 ersetzen – dann passen aber
  bereits geteilte Zeichnungen nicht mehr dazu.

## Starten

Die Simulation lädt [three.js](https://threejs.org) aus dem Internet und muss über einen Webserver
geöffnet werden (ein Doppelklick auf `index.html` reicht nicht). Weil sie die gemeinsamen Bausteine aus
`website/gemeinsam/` lädt, muss der Webserver im Ordner `website/` laufen, nicht im Ordner der Simulation:

- **Mit Abgabe-Funktion (lokal):** im Ordner `website/` `npm start`, dann <http://localhost:8080/simulationen/leiterschaukel-induktion/>
- **Terminal:** im Ordner `website/` `python3 -m http.server` ausführen und
  <http://localhost:8000/simulationen/leiterschaukel-induktion/> öffnen
- **VS Code:** Erweiterung „Live Server“ mit dem Ordner `website/` als Arbeitsbereich

## Projektstruktur

```text
leiterschaukel-induktion/
├── index.html          # Seitengerüst und Bedienfeld
├── css/style.css
├── bilder/tafel.jpg    # Bild auf der Tafel (Leiter im Magnetfeld)
├── js/
│   ├── main.js         # Start und Render-Schleife
│   ├── config.js       # Maße und Modellgrößen
│   ├── state.js        # zentraler Zustand (Einstellungen, bewegte Teile, Ansicht)
│   ├── tafel3d.js      # gemeinsame Tafel einrichten und als kleine Tafel in der Szene zeigen
│   ├── live.js         # Live-Steuerung anbinden (gemeinsam/live/)
│   ├── laser.js        # Laserpointer: Stift/Maus markieren, Spur verblasst
│   ├── physik.js       # Schaukel, Induktionsspannung, Strom, Bremskraft, Zeiger (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht, Tisch
│   ├── aufbau.js       # Stativ, Leiterschaukel, Hufeisenmagnet mit Drehgelenk
│   ├── messgeraet.js   # Zeigermessgerät und Kabel
│   ├── led.js          # LED statt Messgerät (Gedankenexperiment)
│   ├── gluehlampe.js   # Glühlampe statt Messgerät (Gedankenexperiment)
│   ├── erklaerung.js   # Erklärmodus: Elektron, Pfeile v/B/F_L, Hand zur Drei-Finger-Regel
│   ├── ziehen.js       # Schaukel bzw. Magnet (auf dem Tisch) mit Maus/Finger ziehen
│   ├── bedienfeld.js   # Knöpfe, Regler, Anzeigen
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # gemeinsame Materialien
├── tests/physik.test.mjs
└── package.json

Gemeinsam mit anderen Simulationen genutzt (Ordner website/gemeinsam/):
  link.js               # „Link zeigen“: QR-Code und Adresse
  tafel/                # Zeichentafel, Teilen, Lehrerseite (Abgabe-Server: website/server/)
  live/                 # Live-Steuerung: Schülergerät steuert am Beamer
  verbindung.js         # Verbindung zum Abgabe-Server
```

## Physikalisches Modell

- Induktionsspannung U = l · (v × B) · x̂ mit der Länge l = 6 cm des Stabs im Feld (Breite der Pole),
  B = 0,1 T zwischen den Polen, Randfeld fällt außerhalb der Pole über 2,5 cm linear ab.
  Positive Anzeige: rechtes Stabende (rote Buchse) ist der Pluspol.
- Schaukel als Pendel (Länge 22 cm, Masse 80 g) mit leichter Luft-/Lagerdämpfung. Typisch:
  v ≈ 0,3 m/s → U ≈ 2 mV.
- Strommessung: Widerstand des Kreises 1 Ω, also I in mA = U in mV. Kraft auf den Stab
  F = I · l × B, immer gegen die Bewegung (Lenz). Real ist die Bremsung etwa 1000-mal schwächer als die
  Luftdämpfung, deshalb die verstärkbare Bremskraft als Gedankenexperiment.
- Zeiger: gedämpfter Schwinger (Eigenfrequenz 1,2 Hz, Dämpfungsgrad 0,55), Anschlag bei 108 %.
- Magnet auf dem Tisch: In U geht die Geschwindigkeit des Stabs relativ zum Magneten ein
  (`relativeVelocity`).
- Erklärmodus: Lorentzkraft pro Ladung auf das Elektron F/e = −(v × B) (`electronForce`); das Elektron
  wandert mit 330 cm/s pro V/m entlang des Stabs (stark übertrieben, real driften Elektronen sehr langsam).
- Für die mikroskopische Ansicht liefert `physik.js` Geschwindigkeit des Stabs (`barVelocity`),
  Feld am Stab (`fieldAtBar`) und Spannung (`emf`); der Stab hat in `aufbau.js` eine eigene Gruppe
  (`swingGroup`/`bar`), an die sich Elektronen anhängen lassen.

## Tests

```bash
npm test
```
