# Physik-Simulationen

Interaktive Physik-Simulationen für den Unterricht. Reine statische Website
(HTML, CSS, JavaScript) ohne Build-Schritt – läuft auf GitHub Pages und später
auf einem eigenen Server.

## Aufbau

```
index.html            Übersichtsseite mit allen Simulationen
assets/               gemeinsames Aussehen (style.css, favicon.svg)
gemeinsam/            gemeinsame Bausteine für alle Simulationen
  config.js           öffentliche Einstellungen (Supabase-URL, publishable-Schlüssel)
simulationen/<name>/  je eine Simulation mit eigener index.html
```

## Lokal ansehen

Im Repo-Ordner einen kleinen Webserver starten und im Browser öffnen:

```sh
python3 -m http.server 8000
# dann http://localhost:8000
```

## Neue Simulation hinzufügen

1. Ordner `simulationen/<name>/` mit einer `index.html` anlegen.
2. In `index.html` (Übersicht) eine Karte nach dem vorhandenen Muster einfügen.

## Sicherheit

Nur öffentliche Werte gehören ins Repo. Der Supabase-`secret`-/`service_role`-
Schlüssel und das Datenbank-Passwort kommen nie hierher.
