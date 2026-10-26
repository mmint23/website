# Physik-Simulationen

Interaktive Physik-Simulationen für den Unterricht. Reine statische Website
(HTML, CSS, JavaScript) ohne Build-Schritt – läuft auf GitHub Pages und später
auf einem eigenen Server.

## Aufbau

```
index.html            Übersichtsseite mit allen Simulationen
assets/               gemeinsames Aussehen (style.css, favicon.svg)
gemeinsam/            gemeinsame Bausteine für alle Simulationen
  config.js           öffentliche Einstellungen (Website-Adresse, Supabase-URL, publishable-Schlüssel)
  link.js             „Link / QR-Code zeigen“
  tafel/              Zeichentafel mit Abgabe an die Lehrkraft (Anleitung: gemeinsam/tafel/README.md)
  live/               Live-Steuerung: Schülergerät steuert die Simulation am Beamer (gemeinsam/live/README.md)
  verbindung.js       Verbindung zum Abgabe-Server (von tafel/ und live/ genutzt)
simulationen/<name>/  je eine Simulation mit eigener index.html
server/               Abgabe-Server für das Klassenzimmer (Node.js, läuft auf dem Lehrer-Laptop)
downloads/            Offline-Versionen einzelner Simulationen (erzeugt mit npm run downloads)
werkzeuge/            downloads.mjs: erzeugt die Offline-Versionen
```

## Lokal ansehen

Im Repo-Ordner einen kleinen Webserver starten und im Browser öffnen:

```sh
python3 -m http.server 8000
# dann http://localhost:8000
```

Mit Abgabe-Funktion (Schüler teilen Zeichnungen, Lehrerseite zeigt sie live):

```sh
npm start
# dann die Lehrerseite öffnen, die im Terminal steht, z. B. http://localhost:8080/lehrer/leiterschaukel-induktion
```

Einzelheiten (WLAN, Firewall, Hotspot, Datenschutz): `gemeinsam/tafel/README.md`.

## Offline-Versionen zum Herunterladen

Für ausgewählte Simulationen gibt es eine einzige HTML-Datei, die per Doppelklick im Browser läuft – ohne
Webserver und ohne Internet (three.js, Stylesheets, Bilder und QR-Code-Bibliothek stecken in der Datei). Sie liegt
in `downloads/` und ist auf der Übersichtsseite an der Karte verlinkt („Offline-Version herunterladen“).

```sh
npm install          # einmalig: Werkzeuge (esbuild, three.js, qrcode-generator) nach node_modules/
npm run downloads    # alle Offline-Versionen neu erzeugen (Liste in werkzeuge/downloads.mjs)
```

**Nach Änderungen an einer solchen Simulation neu erzeugen und mit committen** – sonst veraltet die
Offline-Version. Teilen und Live-Steuerung sind darin ausgeblendet (sie brauchen den Abgabe-Server). Auf dem iPad
startet eine heruntergeladene HTML-Datei nicht (die Dateivorschau führt kein JavaScript aus) – gedacht ist sie für
Laptops. Weitere Simulation: Namen in `SIMULATIONEN` in `werkzeuge/downloads.mjs` ergänzen, Link an der Karte.

## Tests

```sh
npm test    # alle Tests der Simulationen und der gemeinsamen Bausteine (Node.js ab Version 22)
```

## Neue Simulation hinzufügen

1. Ordner `simulationen/<name>/` mit einer `index.html` anlegen.
2. In `index.html` (Übersicht) eine Karte nach dem vorhandenen Muster einfügen.
3. Optional: Zeichentafel mit Abgabe einbauen – drei Zeilen, siehe `gemeinsam/tafel/README.md`.

## Sicherheit

Nur öffentliche Werte gehören ins Repo. Der Supabase-`secret`-/`service_role`-
Schlüssel und das Datenbank-Passwort kommen nie hierher.
