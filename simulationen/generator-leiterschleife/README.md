# Generator – Leiterschleife im Magnetfeld

Interaktive 3D-Simulation für den Physikunterricht (Generator, elektromagnetische Induktion; Tablet geeignet):
eine rotierende Leiterschleife im Magnetfeld mit Schleifringen, Bürsten und einem Zeigermessgerät. Im Erklärmodus
sieht man, wie die Lorentzkraft die Elektronen in den Längsseiten verschiebt.

Eigenständige Simulation; die Simulation **Generator-Windpark** bettet sie ein: Das Haus „Generator-Modell“ im Dorf
(oder „Direkt zum Generator-Modell“) öffnet sie mit `?von=windpark&wind=…&zeit=…`. Dann startet sie mit dem Antrieb
„Wind“ und dem Wind von dort, zeigt kurz „Vereinfachtes Modell des Generators“, und ganz oben im Bedienfeld steht
„← Zurück zum Windpark“ (Wind und Uhrzeit gehen zurück mit). Ohne diese Angaben startet sie mit dem Drehzahl-Regler.

## Funktionen

**Bedienfeld im Modell (rechts)**, in derselben Reihenfolge wie das linke Feld im Erklärmodus: oben Link/QR-Code,
Schülermodus und „Erklärung“; **Antrieb** (Wind, Drehzahl oder Kurbel, „Anhalten“, Zeitlupe, Festhalten mit
Drehwinkel-Regler); **Anzeige** (Messgerät, LED oder Glühlampe, Messbereich, U-t-Diagramm); **Aufbau** (Magnet
umdrehen, Spule mit 5 Windungen).

In der Simulation stehen **keine Erklärtexte, die den physikalischen Inhalt vorwegnehmen** (z. B. dass beim Drehen
eine Wechselspannung entsteht oder dass die Spule die Spannung vervielfacht) – das sollen die Schüler selbst
herausfinden. Es bleiben Überschrift, Bedienhinweise und rein beschreibende Angaben.

- Modell auf einem Tisch (wie bei der Leiterschaukel, mit Schatten): Der Hufeisenmagnet **liegt** mit dem Joch auf
  dem Tisch, die Polblöcke stehen hinter (N) und vor (S) der Schleife – das Feld geht waagrecht quer zur Welle, von
  hinten nach vorne (in der Ansicht von rechts: von rechts nach links). Die Welle liegt in zwei Lagerböcken, das
  Messgerät steht daneben. Die Startansicht schaut schräg von links oben in den offenen Spalt des Magneten. Im
  Erklärmodus sind Tisch und Lagerböcke ausgeblendet (dann lässt sich die Ansicht auch von unten drehen). Welle mit rechteckiger
  Leiterschleife, zwei Schleifringe mit Kohlebürsten (die Zuleitungen liegen sichtbar auf der Isolierhülse:
  von der vorderen Längsseite zu Ring 1, von der hinteren unter Ring 1 hindurch zu Ring 2, je mit Lötpunkt), Kabel zu einem Zeigermessgerät (Nullpunkt in der
  Mitte, Messbereiche ±3 / ±10 / ±15 / ±30 mV und ±0,3 / ±1 / ±3 V).
- **Antrieb:**
  - **Wind:** Statt der Kurbel sitzt ein kleiner Rotor am Wellenende. Rotor und Schleife drehen auf derselben
    Welle (Generator ohne Getriebe), Wind-Regler auch hier. **Didaktisch vereinfacht:** Ab 3 m/s dreht der Rotor
    proportional zur Windgeschwindigkeit – doppelter Wind, doppelte Drehzahl, doppelte Spannung, über den ganzen
    Regler bis 20 m/s (siehe „Antrieb Wind: vereinfacht“ unten). Bei 12 m/s sind das wie im Windpark 14 U/min
    (0,23 Umdrehungen pro Sekunde, Scheitelwert etwa 1,2 mV), bei 20 m/s gut 23 U/min (etwa 2 mV). Die neue
    Drehzahl stellt sich nach wenigen Sekunden ein (Zeitkonstante 1,5 s). Der Zeiger pendelt langsam mit, das
    Diagramm zeigt 12 s statt 4 s. Nach dem Antippen eines
    Windrads ist dieser Antrieb eingestellt.
  - **Drehzahl-Regler** −3 … +3 Umdrehungen pro Sekunde (rückwärts, Stillstand, vorwärts), „Anhalten“.
  - **Kurbel:** Kurbel am linken Wellenende mit Maus oder Finger drehen. Wer die Kurbel greift, schaltet
    automatisch auf diesen Antrieb. Lässt man los, läuft die Schleife durch Reibung langsam aus.
- **U-t-Diagramm** (Knopf „U-t-Diagramm“, zu Beginn aus; im Erklärmodus ebenso): Es lässt sich überall anfassen und
  mit Maus oder Finger verschieben, mit dem Griff unten rechts vergrößern (bis
  fensterfüllend; am Rand weicht es aus), mit ⤢ fast bildschirmgroß machen (nochmal: zurück), mit × schließen. Schrift,
  Achsen und Kurve wachsen mit der Größe mit (bis dreifach), damit es am Beamer lesbar bleibt. Die **U-Achse** folgt
  zunächst dem Messbereich; an der Achse (links, Zahlen) nach unten ziehen staucht die Kurve (größerer Bereich, z. B.
  bei hoher Drehzahl), nach oben ziehen streckt sie. Am Laptop geht das auch mit dem Mausrad über der Achse.
  Doppeltippen auf die Achse oder ein anderer Messbereich stellt sie zurück. Es schreibt die
  Spannung der letzten 4 s mit – die Sinuskurve der Wechselspannung wird sichtbar. Die U-Achse folgt dem Messbereich.
- **Festhalten** (im Modell unter dem Antrieb, nach „Zeitlupe“): Die Schleife bleibt in ihrer Stellung (auch wenn der Drehzahl-Regler
  läuft). Mit der Kurbel oder dem Regler „Drehwinkel“ (0°–360°) lässt sie sich in jede Stellung drehen;
  beim Loslassen bleibt sie stehen.
- Magnet umdrehen (N ↔ S), Zeitlupe (¼).
- Beobachtung: Bei langsamer Drehung pendelt der Zeiger mit. Ab etwa 2 Umdrehungen pro Sekunde kann der
  träge Zeiger (Eigenfrequenz 1,2 Hz) nicht mehr folgen und zittert nur um die Null – wie bei einem echten
  Demonstrations-Messgerät. Das Diagramm zeigt die Wechselspannung trotzdem.

## Spule statt Leiterschleife

Der Knopf **„Spule mit 5 Windungen“** (im Bedienfeld unter „Aufbau“, auch im Erklärmodus) ersetzt die Leiterschleife
durch eine Spule: Die Leiterschleife ist die erste Windung, vier weitere liegen darüber (quer zur Ebene der Schleife),
alle hintereinander verbunden – nur Anfang und Ende führen zu den Schleifringen. Die Spannung wird fünfmal so groß
(U = −N · B · A · ω · sin φ).

Der Umbau ist zu sehen (3 s): Die Zuleitung von Ende B zum Schleifring wird abgebaut, dann wickelt sich der Draht
Windung für Windung weiter, zuletzt wächst vom Ende der letzten Windung die neue Zuleitung zum Ring; beim Zurück auf
die Leiterschleife rückwärts. Solange Ende B nicht angeschlossen ist, ist der Kreis offen – keine Spannung (im
Diagramm eine kurze Nulllinie). Der Umbau läuft auch in der Pause.

- Beim Umschalten bleiben Messbereich und U-Achse, wie sie sind, und die Kurve von davor bleibt im Diagramm
  stehen – so sieht man im selben Maßstab, dass die Spannung mit der Windungszahl wächst. Dafür gibt es den
  Messbereich **±15 mV**: Bei 0,5 U/s liegt die Leiterschleife (etwa 2,5 mV) bei rund 17 %, die Spule (etwa
  12,6 mV) bei rund 84 % der U-Achse. (Im Bereich ±3 mV schlägt die Spule über den Anschlag.)
- Im Erklärmodus: dünnere, durchsichtige Windungen mit größerem Abstand; Elektron(en) und Pfeile v, F_L bleiben auf
  der ersten Windung (der Leiterschleife). „Viele e⁻“ gibt es nur bei der Leiterschleife
  (die Kette läuft von Ende zu Ende).

## Bauteile tauschen: Leiterschleife, Spule, Spule mit Eisenkern

Wie die Rotoren in der Simulation **Gleichstrommotor** lassen sich die Bauteile auf der Welle austauschen. Unter
„Aufbau“ (unter „Spule mit 5 Windungen“) steht die Auswahl **„Auf der Welle“: Leiterschleife | Spule | Spule mit
Eisenkern**. Die Bauteile, die nicht eingebaut sind, liegen links hinter dem Aufbau in einer **Ablage** – jedes auf
seinem Platz auf zwei Böcken, mit Schild auf dem Tisch. Die Spulen sehen aus wie im Gleichstrommotor: einzelne
Windungen in zwei Lagen (hell und dunkel), in zwei Paketen mit einer Lücke für die Welle; der Eisenkern ist ein
hellgrauer Block, um den sie gewickelt sind.

- **Tausch (animiert, etwa 5 s):** Die Bürsten gehen nach unten, die Welle bleibt stehen, das bisherige Bauteil wird
  nach oben aus dem Spalt des liegenden Magneten gezogen und in seine Ablage gelegt, das neue in derselben Stellung eingesetzt, dann
  kommen die Bürsten wieder hoch und die Welle läuft weiter. Solange ist der Stromkreis offen (keine Spannung),
  Auswahl, „Spule mit 5 Windungen“ und „Erklärung“ sind gesperrt, darunter steht „Bauteil wird getauscht …“.
- **Spule (300 Windungen):** dieselbe Fläche wie die Leiterschleife, also 300-fache Spannung – 1,5 V Scheitelwert je
  Umdrehung pro Sekunde. Bei 0,5 U/s (0,75 V) bleibt die Glühlampe gerade noch dunkel, **beim Kurbeln leuchtet sie**
  (ab etwa 1 U/s sichtbar, bei 2 U/s hell).
- **Mit Eisenkern:** Der Kern verstärkt den magnetischen Fluss durch die Spule – vereinfacht um den Faktor 4 (in
  Wirklichkeit hängt das stark von Kern und Luftspalt ab). Die Lampe leuchtet schon bei 0,5 U/s.
- Messgerät dazu am besten im Volt-Bereich (siehe unten); im mV-Bereich schlägt es an.
- „Spule mit 5 Windungen“ gibt es nur, solange die Leiterschleife eingebaut ist (beim Tausch wird sie zurückgebaut).
  Im Erklärmodus ist immer die Leiterschleife zu sehen und wirksam, die Ablage ist ausgeblendet; nach „Zurück zum
  Modell“ ist das gewählte Bauteil wieder eingebaut.
- Live-Steuerung: Das eingebaute Bauteil geht mit (`state.bauteil`); das zuschauende Gerät übernimmt den Tausch am
  Ende, ohne Animation.
- Technik: `js/bauteile.js` (Bauteile, Ablage, Ablaufsteuerung wie `teile.js` im Gleichstrommotor), Tauschzustand
  `umbau` und Spannung (`windungen()`) in `physik.js`, Bürsten in `modell.js`, Größen in `config.js` (`ANKER`).

## Messbereich in mV oder V

Unter **„Anzeige“** wählt man zuerst die Einheit (**mV** oder **V**), darunter den Bereich: ±3 / ±10 / ±15 / ±30 mV
bzw. ±0,3 / ±1 / ±3 V. Skala, Drehschalter am Messgerät und U-t-Diagramm folgen der Einheit; beim Umschalten kommt
der zuletzt gewählte Bereich dieser Einheit zurück (zu Beginn ±15 mV bzw. ±0,3 V). Im Volt-Bereich zuckt der Zeiger
kaum: Die Schleife liefert nur Millivolt (bei 1 U/s etwa 5 mV Scheitelwert) – genau das lässt sich damit zeigen.

## LED (Gedankenexperiment) und Glühlampe (realistisch)

Unter **„Anzeige“** lässt sich statt des Zeigermessgeräts eine **LED** oder eine **Glühlampe** auf einer Steckplatte an
die Bürsten anschließen. Ring 1 (rotes Kabel) führt zur roten Buchse (Anode der LED), Ring 2 (blaues Kabel) zur schwarzen.
In der Simulation steht bewusst kein Erklärtext – die Einordnung gehört in den Unterricht.

- **Glühlampe – realistisch:** ein Lämpchen 3,5 V. Der Glühdraht glüht ab etwa 0,8 V sichtbar dunkelrot und ist bei
  3,5 V voll hell; die Helligkeit folgt der Leistung (∝ U²), der Draht glüht kurz nach (0,08 s) – in beiden
  Stromrichtungen. **Hier bleibt sie dunkel:** Die Leiterschleife liefert bei 0,5 U/s etwa 2,5 mV, die Spule mit
  5 Windungen etwa 12,5 mV, selbst beim schnellsten Kurbeln (gut 6 U/s) höchstens gut 0,1 V.
- **Messgerät parallel zur Glühlampe:** Bei der Glühlampe erscheint der Knopf **„Messgerät parallel anschließen“**.
  Die Lampe steht dann vor den Bürsten, von ihren Buchsen führen zwei weitere Kabel zum Messgerät. Es misst die
  Spannung an der Lampe – ideal, also dieselbe wie ohne Lampe (kein Innenwiderstand berücksichtigt). So sieht man
  gleichzeitig: Es wird Spannung induziert, aber viel zu wenig für die Lampe.
- **LED – Gedankenexperiment** (wie in `leiterschaukel-induktion`): In Wirklichkeit bräuchte sie etwa 1,8 V (rot). Hier
  leuchtet sie ab 1 mV und voll ab 3 mV, **nur in Durchlassrichtung** (Ring 1 Pluspol): Sie blitzt bei jeder zweiten
  Halbschwingung auf, nach „Magnet umdrehen“ in der jeweils anderen. Mit der Leiterschleife blitzt sie kurz auf, mit
  der Spule leuchtet sie hell.
- Im Erklärmodus sind Messgerät, LED, Lampe und Kabel ausgeblendet.

## Erklärmodus

Der Knopf „Erklärung: Elektronen in der Schleife“ blendet Messgerät und Kabel aus, zeigt die Schleife dick
und durchsichtig – zunächst mit zwei **offenen Enden** (A vorne, B hinten), ohne Schleifringe und Bürsten – und
geht mit der Kamera näher heran. Dann gibt es **nur ein Bedienfeld (links)** – bewusst ohne Erklärtexte, nur mit
Schaltern (zu Beginn ist keine Größe eingeblendet). Von oben nach unten: **Tafel** (grün), Link/QR-Code und „Zurück
zum Modell“, **Antrieb** (Wind, Drehzahl oder Kurbel; Pause und Zeitlupe nebeneinander, Festhalten mit
Drehwinkel-Regler), **Erklärung** (B, v, F_L, Elektronen, Ansicht von rechts, Magnet durchsichtig, U-t-Diagramm) und
**Aufbau** (Magnet umdrehen, Schleifringe, Spule mit 5 Windungen). „Anhalten“ gibt es nur im Modell. Das Modell
rückt in die freie Fläche neben dem Feld, das U-t-Diagramm steht unten rechts. Die einzelnen Schalter:

- **B:** Feldlinien zwischen den Polen (von N nach S)
- **v:** Geschwindigkeit der beiden Längsseiten
- **F_L:** Lorentzkraft auf die Elektronen in den beiden Längsseiten
- **e⁻:** ein einzelnes Elektron in der Mitte der vorderen Längsseite (weißer Rand). Es pendelt im Takt der
  Wechselspannung entlang des Drahts.
- **2 e⁻:** zwei hervorgehobene Elektronen, je eines in der Mitte von Längsseite A und B – beim Drehen liegt eines
  oben, eines unten. Beide werden von der Lorentzkraft in dieselbe Umlaufrichtung geschoben: So sieht man, dass sich
  die Spannungen der beiden Längsseiten addieren. Zusammen mit „viele e⁻“ bleiben beide hervorgehoben.
- **viele e⁻:** Elektronen (blau, „−“) und ortsfeste Atomrümpfe (rot, „+“) über die ganze Schleife, von Ende
  zu Ende. Die Lorentzkraft schiebt die Elektronen in beiden Längsseiten in dieselbe Umlaufrichtung; sie
  drängen sich an einem Ende zusammen, am anderen bleiben nur die Atomrümpfe. An den Enden zeigen „−“
  (Elektronenüberschuss) und „+“ (Elektronenmangel) die Pole – mit der Wechselspannung wechseln sie hin und her.
- **Schleifringe:** baut Schleifringe, Zuleitungen (Ende A → Ring 1, Ende B → Ring 2) und Bürsten animiert an:
  Erst gleiten die Ringe von rechts auf die Welle, dann wachsen die Zuleitungen zu den Ringen, zuletzt kommen
  die Bürsten von unten (beim Abnehmen rückwärts, insgesamt 1,8 s).
  Die Pole „−“ und „+“ stehen dann über den Ringen – so sieht man, welcher Pol an welchem Ring liegt.
- **Pause / Weiter, Zeitlupe, Festhalten** (dieselben Schalter wie rechts); festgehalten erscheint der
  Drehwinkel-Regler im Erklärmodus direkt darunter im linken Feld (sonst rechts unter „Festhalten“)
- **Magnet durchsichtig:** Polblöcke und Joch werden durchsichtig (Deckkraft 0,3), so sieht man die Schleife auch
  von vorne durch den vorderen Pol. Beim Verlassen des Erklärmodus wieder aus.
- **Ansicht von rechts:** Blick genau entlang der Welle, von der Seite der Schleifringe. Die Schleife erscheint als
  Strich, der sich dreht, die Längsseiten laufen auf einem Kreis, das Feld geht waagrecht vom Nordpol (rechts) zum
  Südpol (links) – so sieht man gut, wann v senkrecht zu B steht
  (größte Spannung) und wann parallel (keine Spannung). Nochmal gedrückt geht es zurück zur schrägen Ansicht;
  „Ansicht zurücksetzen“ bleibt in der gewählten Ansicht. Dreht man die Ansicht selbst, ist der Knopf wieder aus.

Das U-t-Diagramm lässt sich auch hier per Knopf einblenden, so lässt sich vergleichen: F_L am größten, wenn U am größten ist.

### Tafel

„Tafel öffnen (zeichnen)“ (unten im Bedienfeld des Erklärmodus) öffnet eine große Zeichentafel mit zwei Seiten
(Knöpfe in der Werkzeugleiste):

- **Seite 1: 3D-Modell** (`bilder/tafel.svg`): Screenshots des 3D-Modells im Erklärmodus in den Stellungen φ = 0°,
  90°, 180°, 270° und 360°, groß in zwei Reihen (oben drei, darunter zwei), jeweils mit der Gradzahl darunter – nur
  mit dem einzelnen Elektron in Längsseite A (weißer Rand), ohne Feldlinien und Pfeile. So lassen sich B, v und die
  Lorentzkraft direkt an das Elektron zeichnen.
- **Seite 2: U-t-Diagramm** (`bilder/tafel2.svg`): dieselben fünf Bilder kleiner nebeneinander, darunter ein leeres
  U-t-Diagramm. Die Zeitmarken 0, T/4, T/2, 3T/4 und T stehen genau unter den Bildern (gestrichelte Hilfslinien):
  Aus den Stellungen – Schleife quer zum Feld (senkrecht): U = 0, Schleife parallel zum Feld (waagrecht): |U| am größten – lässt sich die Sinuskurve
  punktweise einzeichnen.

Die Bilder stecken als JPEG in den SVG-Dateien: Aufnahmen des Erklärmodus mit durchsichtigem Magneten, schräg von links
oben (Nordpol hinten, Elektron in der Mitte der Längsseite A; für 360° steht dasselbe Bild wie für 0°). Beide Seiten werden
zusammen geteilt; „Seite löschen“ löscht nur die gezeigte Seite. Bis Ende Oktober 2026 zeigte Seite 1 ein
gezeichnetes Schema mit U-t-Diagramm; ältere Zeichnungen auf Seite 1 passen nicht mehr zum neuen Bild.

Zeichnen mit Apple Pencil oder Maus (Finger zeichnen nicht, mit zwei Fingern wird das Tafelbild gezoomt); über den
Abgabe-Server können Schüler ihre Zeichnung an die Lehrkraft schicken (gemeinsamer Baustein der Website,
siehe [`gemeinsam/tafel/README.md`](../../gemeinsam/tafel/README.md); Lehrerseite:
<http://localhost:8080/lehrer/generator-leiterschleife>).

Das Bild ist eine SVG-Datei und lässt sich mit einem Texteditor ändern – aber nicht mehr verschieben, sobald
Zeichnungen geteilt wurden (die Koordinaten beziehen sich auf das Bild).

## Schülermodus (z. B. für eine Lehrprobe)

Der **Erklärmodus ohne den Knopf F_L**: Die Schüler arbeiten mit B, v, Elektronen, Schleifringen, Spule, Pause,
Zeitlupe, Festhalten, Ansichten, U-t-Diagramm und Tafel, ohne dass die Simulation die Lorentzkraft vorwegnimmt.

- **Nur ein Bedienfeld (links)**, aufgebaut wie im Erklärmodus (siehe dort), nur ohne F_L. Nach „Zurück zum
  Modell“ bleibt das Feld mit Antrieb und Aufbau (Magnet umdrehen; Messgerät mit ±3 mV).
- **„Schülermodus (ohne F_L)“** (oben im Bedienfeld) schaltet ihn auf diesem Gerät ein und aus, z. B. am
  Beamer; beim Einschalten geht es gleich in den Erklärmodus.
- **„QR-Code für den Schülermodus“** zeigt einen QR-Code zu `…/generator-leiterschleife/?schueler`. Wer ihn scannt,
  ist fest im Schülermodus (die beiden Knöpfe fehlen dort). Ist die Seite über den Abgabe-Server als Lehrerseite
  geöffnet (`/lehrer/generator-leiterschleife`), enthält der QR-Code den Raumcode: **„Teilen“** auf der Tafel kommt
  dann in der Abgabeleiste dieser Lehrerseite an. Ohne Server (GitHub Pages) geht alles außer Teilen.
- **Live-Steuerung im Schülermodus:** Ist der Schülermodus auf der Lehrerseite an, öffnet auch der QR-Code von
  „Steuerung abgeben“ das Schülergerät im Schülermodus.
- „Zurück zum Modell“ bleibt; auch dort und beim erneuten Öffnen des Erklärmodus fehlt F_L.
- Kein Schutz: Wer `?schueler` aus der Adresse löscht, hat wieder alle Knöpfe.
- Technik: `modus` in `state.js` (gehört zum Gerät, wird nicht live übertragen); im Schülermodus ist die Klasse
  `ohne-im-schuelermodus` (F_L) ausgeblendet, auf dem Schülergerät zusätzlich `nur-lehrkraft`.
  `bedienfeld.js` hängt im Erklär- und Schülermodus die Bedienelemente aus dem rechten Feld ins linke um (`UMZUG`)
  und zurück; `nur-erklaerung` gibt es nur im Erklärmodus; das Bild rückt
  per `setBildVersatz` (szene.js) neben das Feld, die Kamera selbst bleibt.

## Laserpointer

Der Knopf **„Laserpointer“** (oben im Bedienfeld unter „Link / QR-Code zeigen“, im Erklär- und Schülermodus oben im linken Feld, und in der Werkzeugleiste der Tafel, am Laptop auch die Taste **L**) schaltet einen Zeigestift ein: Mit
**Apple Pencil oder Maus** markiert man Stellen, um zu zeigen, wovon man gerade spricht. Die Spur leuchtet rot über
allem und verblasst etwa 1,5 Sekunden nach dem Absetzen; an der Simulation und an der Tafel ändert sich nichts.
Solange er an ist, bedienen Stift und Maus die Simulation nicht (kein Drehen der Ansicht, keine Kurbel, kein Schreiben auf der Tafel);
**Finger** funktionieren weiter wie gewohnt, Knöpfe und Regler auch mit Stift oder Maus. Läuft auch ohne
Abgabe-Server. Bei der **Live-Steuerung** erscheinen die Spuren des steuernden Geräts auch auf dem anderen – in der
Szene am selben Teil des Modells, auf der Tafel an derselben Stelle des Tafelbilds; der Laserpointer-Knopf bleibt auch beim Zuschauen bedienbar (die Spuren
sieht dann nur das eigene Gerät). Gemeinsamer Baustein der Website: `gemeinsam/laser/` (wie in der Leiterschaukel).

## Live-Steuerung: Schüler steuert am Beamer

Über den Abgabe-Server (gemeinsamer Baustein `gemeinsam/live/`, wie bei der Leiterschaukel): In der Abgabeleiste der
Lehrerseite zeigt **„Steuerung abgeben“** einen QR-Code; das Schülergerät sieht nach dem Scannen zuerst mit und
steuert die Simulation am Beamer, sobald die Lehrkraft „Schüler steuert“ wählt.
Gespiegelt werden alle Einstellungen, Drehung, Elektronen, Zeiger, LED/Glühlampe, Umbau Leiterschleife ↔ Spule,
Windrotor, U-t-Diagramm, Ansicht, Laserpointer-Spuren und die **Tafel** des steuernden Geräts (offen/zu, Seite, Striche schon beim
Zeichnen). Eigene Tafel und Abgaben des zuschauenden Geräts bleiben unberührt; Teilen funktioniert wie immer.
„Ich steuere“ / „Schüler steuert“ schaltet hin und her (bei offener Tafel steht „Ich steuere“ im Hinweis unten).
Technik: `js/live.js`.

## Physikalisches Modell

- Leiterschleife: Längsseiten l = 10 cm im Abstand r = 4 cm von der Achse, Fläche A = 80 cm²;
  homogenes Feld B = 0,1 T zwischen den Polen.
- Die Spannung wird über die Lorentzkraft auf die Ladungen in den beiden Längsseiten berechnet:
  U = Σ l · (v × B) · Laufrichtung. Die Querseiten tragen nichts bei (dort steht v × B senkrecht zum
  Draht). Das ergibt U = −B · A · ω · sin φ, also z. B. bei 1 U/s einen Scheitelwert von etwa 5 mV.
  φ = 0: Schleife steht senkrecht (quer zum waagrechten Feld, Längsseite A oben), die Längsseiten bewegen sich
  längs der Feldlinien → U = 0; Schleife waagrecht: größte Spannung.
- Liegender Magnet, technisch: Magnet und Feldlinien werden „stehend“ gebaut (Pole oben und unten) und als Ganzes um
  −90° um die Welle gedreht (`LIEGEND` in `config.js`), die Schleife um denselben Winkel (Lage φ + LIEGEND in
  `modell.js` und `physik.js`, Kurbel in `ziehen.js`). So bleiben Drehsinn, φ und alle Spannungen wie beim früheren
  stehenden Magneten. Die Polblöcke sind 10,5 cm hoch, damit man über den vorderen Pol auf die Schleife sieht.
- Verdrahtung: Ring 1 (näher an der Schleife, rotes Kabel) → vordere Längsseite A (von rechts nach links) →
  Querseite → hintere Längsseite B (von links nach rechts) → Ring 2. Die Umlaufspannung in dieser Richtung
  schiebt positive Ladungen zu Ring 2; zwischen den Ringen gilt U = φ₁ − φ₂ = −U_Umlauf. Positive Anzeige:
  Ring 1 ist Pluspol.
- Elektronen im Erklärmodus: Verschiebung = 120 cm pro V/m (einzelnes Elektron, höchstens 2,8 cm) bzw.
  1000 cm pro V/m („viele e⁻“, bis alle am Ende gedrängt sind) · (Lorentzkraft pro Ladung in Laufrichtung), mit
  0,12 s Verzögerung – stark übertrieben; sie zeigt die Ladungstrennung (∝ Spannung) bei offenem Stromkreis.
- Drehung als Bewegungsgleichung (Drehzahl-Regler stellt die Drehzahl mit 0,4 s Zeitkonstante ein, Kurbel
  folgt dem Finger, freies Auslaufen mit Reibung) – vorbereitet für ein späteres Gegenmoment bei Belastung.

## Antrieb Wind: vereinfacht – wie es in echt ist

In der Simulation gilt der Einfachheit halber: **mehr Wind → schnellere Drehung → größere Spannung**, über den
ganzen Regler. Eine echte Windkraftanlage verhält sich anders:

- **Unter etwa 3 m/s** steht sie (Einschaltgeschwindigkeit) – wie in der Simulation.
- **Zwischen etwa 3 und 12 m/s** dreht sie mit wachsendem Wind schneller. Die Leistung des Windes wächst dabei mit
  der dritten Potenz der Windgeschwindigkeit (doppelter Wind: achtfache Leistung).
- **Ab etwa 12 m/s (Nennwind)** erreicht sie ihre **Nenndrehzahl** (große Anlagen etwa 10–15 U/min) und ihre
  **Nennleistung**. Mehr Wind würde Rotor und Generator überlasten. Deshalb werden die Rotorblätter etwas aus
  dem Wind gedreht (Pitch-Regelung): Drehzahl und Leistung bleiben gleich, obwohl der Wind weiter zunimmt.
- **Ab etwa 25 m/s (Sturm)** wird die Anlage abgeschaltet: Blätter ganz aus dem Wind, Rotor steht.
- **Spannung:** Sie hängt bei echten Anlagen kaum vom Wind ab. Der Generator speist über Umrichter und
  Transformator ins Netz ein, dessen Spannung (z. B. 230 V im Haus, 20 000 V im Mittelspannungsnetz) und Frequenz
  (50 Hz) fest sind. Mit dem Wind ändert sich vor allem der **Strom**, also die eingespeiste Leistung.
- **Getriebe:** Viele Anlagen haben ein Getriebe (etwa 1 : 100), das die langsame Rotordrehung für den Generator
  stark beschleunigt; andere haben einen großen, langsam drehenden Ringgenerator mit vielen Polen ohne Getriebe.
  Hier sitzt die Leiterschleife direkt auf der Rotorwelle – deshalb ist die Spannung so klein.

Die Simulation **Generator-Windpark** bildet die echte Kennlinie mit Nenndrehzahl ab; dort dreht sich ein Windrad
bei mehr als 12 m/s also nicht mehr schneller als hier bei 12 m/s.

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
├── bilder/tafel.svg    # Tafelbild Seite 1: 3D-Modell in fünf Stellungen, groß
├── bilder/tafel2.svg   # Tafelbild Seite 2: dieselben Bilder kleiner, leeres U-t-Diagramm
├── js/
│   ├── main.js         # Start, Render-Schleife, Tafel einrichten (gemeinsam/tafel/)
│   ├── config.js       # Maße und Modellgrößen
│   ├── state.js        # Zustand (Antrieb, Drehzahl, Magnet, …); Angaben aus dem Windpark
│   ├── physik.js       # Drehung, Induktionsspannung, Zeiger, Rotor beim Antrieb „Wind“ (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht
│   ├── modell.js       # Magnet, Welle, Leiterschleife, Schleifringe, Bürsten, Kurbel
│   ├── messgeraet.js   # Zeigermessgerät (mV/V) und Kabel; Umschalten auf LED bzw. Glühlampe, auch beides
│   ├── led.js          # LED statt Messgerät (Gedankenexperiment, wie in leiterschaukel-induktion)
│   ├── bauteile.js     # Bauteile tauschen: Leiterschleife, Spule 300 Windungen, mit Eisenkern (Ablage, Animation)
│   ├── gluehlampe.js   # Glühlampe 3,5 V (realistisch), allein oder mit Messgerät parallel
│   ├── diagramm.js     # U-t-Diagramm
│   ├── erklaerung.js   # Erklärmodus: Elektronen, Pfeile v und F_L
│   ├── ziehen.js       # Kurbel mit Maus/Finger drehen
│   ├── bedienfeld.js   # Knöpfe, Regler, Anzeigen; Rückweg zum Windpark
│   ├── live.js         # Live-Steuerung (gemeinsam/live/), auch Tafel
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # gemeinsame Materialien
├── tests/physik.test.mjs
└── package.json
```

## Tests

```bash
npm test
```
