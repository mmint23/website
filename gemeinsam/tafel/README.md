# Zeichentafel mit Abgabe an die Lehrkraft

Gemeinsamer Baustein für alle Simulationen der Website. Eine Simulation gibt nur ein Bild vor; daraus wird:

- eine **Zeichentafel** (großes Fenster) mit Apple Pencil, Finger oder Maus: Stifte, Radierer, Freihand oder
  gerader Pfeil, Rückgängig, Alles löschen. Stiftdruck bestimmt die Strichbreite; sobald der Pencil benutzt wurde,
  werden Finger und Handballen ignoriert. Die eigene Zeichnung bleibt im Browser gespeichert.
- **„Teilen“** für Schüler und eine **Lehrerseite**, die alle Abgaben live zeigt – aber nur, wenn die Seite über
  den Abgabe-Server (`website/server/`) läuft. Auf GitHub Pages ist es eine reine Zeichentafel.

Als Beispiel nutzt die Leiterschaukel den Baustein (`simulationen/leiterschaukel-induktion/js/tafel3d.js`).

## In eine Simulation einbauen

1. Ein Bild für die Tafel in den Ordner der Simulation legen, z. B. `bilder/tafel.jpg` (Screenshot der Simulation
   o. Ä.).
2. Einen Knopf zum Öffnen in die `index.html` der Simulation, z. B.
   `<button id="tafelBtn" type="button">Tafel öffnen (zeichnen)</button>`.
3. Im JavaScript der Simulation (z. B. `js/main.js`):

```js
import { initTafel, oeffneTafel } from '../../../gemeinsam/tafel/index.js';   // von simulationen/<name>/js/ aus

initTafel({
  id: 'meine-simulation',          // Kennung: Ordnername der Simulation (Räume auf dem Server, Speicher im Browser)
  bild: 'bilder/tafel.jpg',         // relativ zur index.html der Simulation
  bildText: 'Was auf dem Bild zu sehen ist',
});
document.getElementById('tafelBtn').addEventListener('click', oeffneTafel);
```

Mehr ist nicht nötig: Fenster, Werkzeugleiste, Abgabeleiste und Aussehen legt der Baustein selbst an. Die
Lehrerseite ist dann <http://localhost:8080/lehrer/meine-simulation> (Server siehe unten); beim Start listet der
Server alle Simulationen auf, die den Baustein einbinden.

### Optionen von `initTafel`

| Option | Bedeutung |
|---|---|
| `id` | **Pflicht.** Kennung der Simulation (Buchstaben, Ziffern, `-`, `_`). Jede Simulation hat eigene Räume. |
| `bild` | **Pflicht.** Hintergrundbild der Tafel. |
| `bildText` | Beschreibung des Bilds (Alternativtext). |
| `seiten` | Statt `bild`/`bildText`: mehrere Seiten, Liste `{ bild, bildText, titel }` (höchstens 10, alle im selben Seitenverhältnis). In der Werkzeugleiste erscheint dann je Seite ein Knopf (`titel`, sonst „Seite 1“ …); „Alles löschen“ heißt „Seite löschen“ und löscht nur die gezeigte Seite. Geteilt werden alle Seiten zusammen; die Vorschaubilder der Lehrerseite zeigen die gerade gewählte Seite. |
| `seitenverhaeltnis` | Breite : Höhe der Tafel, z. B. `1.6`. Ohne Angabe wird es aus dem Bild genommen. |
| `stifte` | Liste `{ name, farbe, text }`, z. B. `{ name: 'F', farbe: '#c62828', text: 'F_L' }`. Der erste ist zu Beginn gewählt. Ohne Angabe: Schwarz, Rot, Blau, Grün. |
| `leisteZusatz` | Eigene Knöpfe (DOM-Elemente) für die Werkzeugleiste, z. B. ein Laserpointer. |

Weitere Exporte von `index.js` für Simulationen mit eigener Darstellung der Tafel (wie die kleine Tafel in der
3D-Szene der Leiterschaukel): `tafelOffen()` (z. B. Szene anhalten, solange gezeichnet wird), `aufAnzeige(rückruf)`
(Tafelinhalt hat sich geändert), `aktuellesDokument().striche`, `tafelBild`, `zeichneAlle(ctx, striche, breite)`.
Bei mehreren Seiten: `aktuelleSeite()`, `seitenBild(nummer)`, `aufSeitenwechsel(rückruf)`, `stricheDerSeite(striche)`
(Striche ab der zweiten Seite tragen `s`, die Nummer ihrer Seite ab 0).

**Aussehen anpassen:** Die Regeln stehen in `tafel.css` und werden vor dem eigenen Stylesheet der Seite geladen;
die Simulation kann sie also überschreiben. Hat sie rechts ein festes Bedienfeld, endet die Abgabeleiste davor mit
`:root { --abgaben-rechts: 312px; }`.

**Das Tafelbild nicht mehr austauschen**, wenn schon Zeichnungen geteilt wurden: Koordinaten beziehen sich auf das
Bild, alte Zeichnungen passen sonst nicht mehr dazu.

## Abgabe-Server auf dem Laptop

Ein kleiner Node.js-Server ohne weitere Abhängigkeiten (`website/server/`). Er läuft auf dem Lehrer-Laptop und
liefert die ganze Website selbst mit aus: Alle Geräte im selben WLAN öffnen `http://<Laptop-IP>:8080`.

```bash
cd website
sudo dnf install nodejs        # einmalig; Node.js ab Version 18 (für npm test ab Version 22)
npm run offline                # einmalig, solange Internet da ist: three.js & QR-Code-Bibliothek nach server/offline/
npm start                      # zeigt die Lehrerseiten aller Simulationen mit Tafel an
```

Die Lehrerseite zeigt den QR-Code für die Schüler; er zeigt auf die Adresse des Laptops im WLAN (z. B.
`http://192.168.2.51:8080/simulationen/leiterschaukel-induktion/?raum=k7m2`). Ohne `npm run offline` holen die
Geräte three.js weiter aus dem Internet. Ohne Angabe braucht die Lehrerseite keine PIN. Mit PIN oder anderem Port:
`PIN=2468 PORT=8090 npm start`. Beenden mit Strg+C – dabei sind alle Abgaben weg.

**Lehrerseite zusätzlich auf dem iPad:** „Lehrerseite auf anderem Gerät“ in der Abgabeleiste zeigt einen QR-Code
zur Lehrerseite – mit demselben Raumcode. Beide Geräte sehen dieselben Abgaben live; Bearbeitungen bleiben auf dem
jeweiligen Gerät. Der Code erscheint nur auf Knopfdruck, damit ihn die Schüler am Beamer nicht nebenbei mitscannen.

**Mehrere Klassen gleichzeitig:** Jede neu geöffnete Lehrerseite bekommt ihren eigenen Raumcode und sieht nur
dessen Abgaben. Einen festen Code kann man mit `?lehrer&raum=10b` wählen.

**Firewall (Fedora, firewalld):** Auf Fedora Workstation sind in der Standardzone die Ports 1025–65535 meist schon
offen (`firewall-cmd --list-all`). Sonst:

```bash
sudo firewall-cmd --add-port=8080/tcp                                            # bis zum Neustart
sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload  # dauerhaft
```

Liegt das WLAN in einer anderen Zone (`firewall-cmd --get-active-zones`), `--zone=<Zone>` ergänzen; beim
Laptop-Hotspot heißt sie meist `nm-shared`.

**Wenn das WLAN die Geräte voneinander isoliert** (Schüler erreichen die Laptop-Adresse nicht): Hotspot vom Laptop
(GNOME-Einstellungen → WLAN → ⋮ → „WLAN-Hotspot einschalten …“ oder
`nmcli device wifi hotspot ssid Physik password 'geheim123'`; Server danach starten bzw. Lehrerseite neu laden),
Hotspot vom Handy für alle Geräte, oder die Schul-IT nach einem Netz ohne Client-Isolation fragen.

**Standby:** Der Server wird im Standby nur angehalten; die Abgaben bleiben erhalten, alle Seiten verbinden sich
nach dem Aufwachen von selbst neu. Damit der Laptop im Unterricht gar nicht erst einschläft (auch nicht beim
Zuklappen): `systemd-inhibit --what=idle:sleep:handle-lid-switch npm start`.

## Datenschutz und Schutzmaßnahmen

- Abgaben liegen **nur im Arbeitsspeicher** des Servers; nichts wird auf die Festplatte geschrieben, keine Accounts,
  keine Zugriffsprotokolle (der Server protokolliert nur Fehler). Beim Neustart des Servers ist alles weg;
  verwaiste Räume werden nach 12 Stunden gelöscht. Eigene Zeichnung, Name und eine zufällige Geräte-Kennung
  bleiben nur im Browser des jeweiligen Geräts.
- Empfehlung: Kürzel statt vollständiger Namen.
- Nur Seiten, die vom Server selbst kommen, dürfen sich per WebSocket verbinden (Origin-Prüfung).
- Lehrer-PIN (optional, nur mit `PIN=… npm start`): Dann ist die Lehrerseite (Abgaben sehen, löschen) nur mit PIN
  erreichbar; danach ein Token, das 12 Stunden gilt. Höchstens 5 PIN-Versuche pro Minute je IP-Adresse. Ohne PIN
  kann jeder im WLAN, der den Raumcode kennt, mit `?lehrer&raum=…` die Lehrerseite dieses Raums öffnen.
- Abgeben nur in Räume, die eine Lehrerseite geöffnet hat. Pro Abgabe höchstens 1,5 MB, 1500 Striche und
  60 000 Punkte; höchstens 6 Abgaben pro Minute je Gerät und je IP-Adresse; höchstens 150 Abgaben pro Raum und
  20 Räume.

## Technik

| Datei | Aufgabe |
|---|---|
| `index.js` | Einstieg für Simulationen: `initTafel(optionen)` und die Exporte oben |
| `tafel.js` | Zeichenfenster, Werkzeuge, Dokumente (eigene Zeichnung oder Arbeitskopie einer Abgabe) |
| `abgabe.js` | Server erkennen, Teilen (Schüler), Lehrerseite (Abgaben live, optionale PIN, QR-Code) |
| `striche.js` | Datenformat der Striche, Prüfung, Zeichnen – ohne DOM, auch vom Server genutzt |
| `tafel.css` | Aussehen von Tafel, Abgabeleiste und PIN-Fenster |
| `../link.js` | „Link zeigen“ mit QR-Code (auch ohne Tafel nutzbar) |
| `../../server/server.js` | Erkennung (`GET /api/status`), Anmeldung (`POST /api/login`), WebSocket unter `/ws` (Nachrichten oben in der Datei beschrieben), statische Dateien der Website |
| `../../server/websocket.js` | minimaler WebSocket-Server nur mit Node-Bordmitteln |
| `../../server/offline.js` | sucht und lädt alle Bibliotheken aus dem Internet für den Betrieb ohne Internet |

Zeichnungen werden als **Vektordaten** übertragen: Freihandstriche als Punkte mit Stiftdruck, Pfeile als Anfangs-
und Endpunkt, jeweils mit Farbe. Koordinaten beziehen sich auf das Tafelbild (Breite 1600, Höhe nach
Seitenverhältnis). Räume heißen intern `<id der Simulation>/<Raumcode>`, damit Abgaben nie auf dem Bild einer
anderen Simulation landen.

Tests: `npm test` im Ordner `website/` (prüft u. a. Datenformat und Prüfung der Abgaben).
