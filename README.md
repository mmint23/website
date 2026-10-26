# mmint23.de

Website mit interaktiven Simulationen für den Physik- und Mathematikunterricht.

Die Simulationen liegen weiterhin in ihren eigenen Repos. Dieses Repo sammelt sie: Es holt jede Simulation aus
`simulationen.json` von GitHub, baut sie bei Bedarf, erzeugt die Übersichtsseite und kopiert alles auf den
Hetzner-Server.

## Aufbau

| Datei | Inhalt |
|---|---|
| `simulationen.json` | Liste der Simulationen: Repo, Adresse auf der Website, Titel, Fach, kurzer Text |
| `seite/` | Übersichtsseite (`vorlage.html`), Stil, Impressum, Datenschutz |
| `scripts/bauen.mjs` | baut alles nach `_site/` (nur Node.js und git nötig) |
| `.github/workflows/veroeffentlichen.yml` | baut und kopiert per SSH auf den Server |
| `server/einrichten.sh` | richtet den Hetzner-Server einmalig ein (Caddy, HTTPS, Firewall, Deploy-Benutzer) |

## Eine Simulation hinzufügen

Einen Eintrag in `simulationen.json` ergänzen und auf `main` pushen:

```json
{
  "repo": "marco230199/neue-simulation",
  "pfad": "neue-simulation",
  "titel": "Neue Simulation",
  "fach": "Physik",
  "text": "Ein Satz, worum es geht."
}
```

Die Simulation erscheint dann unter `https://mmint23.de/neue-simulation/`. Das Repo muss öffentlich sein.
Braucht sie einen Build (z. B. Vite), kommen `"bauen": "npm ci && npm run build"` und `"ausgabe": "dist"` dazu.
Pfade in der Simulation müssen relativ sein (`js/main.js`, nicht `/js/main.js`), bei Vite `base: './'`.

Nicht mit veröffentlicht werden `tests/`, `server/`, `docs/`, `README.md` und `package*.json`.

## Wann wird veröffentlicht?

- bei jedem Push auf `main` in diesem Repo
- auf Knopfdruck: **Actions → Veröffentlichen → Run workflow**
- stündlich automatisch, aber nur wenn sich eine Simulation geändert hat (Vergleich mit `https://mmint23.de/version.json`)

Nach einem Push in einem Simulations-Repo ist die Änderung also spätestens nach einer Stunde online, sofort per Knopfdruck.

## Lokal ansehen

```bash
node scripts/bauen.mjs
cd _site && python3 -m http.server 8000     # dann http://localhost:8000
```

## Server einrichten (einmalig)

1. DNS bei INWX: A-Eintrag für `mmint23.de` und `www.mmint23.de` auf die IPv4-Adresse des Servers
   (und AAAA auf die IPv6-Adresse, falls vorhanden).
2. Auf dem Laptop einen eigenen Schlüssel nur für GitHub erzeugen:
   `ssh-keygen -t ed25519 -N "" -C github-deploy -f deploy_key`
3. Skript auf den Server kopieren und ausführen:
   ```bash
   scp server/einrichten.sh root@mmint23.de:
   ssh root@mmint23.de bash einrichten.sh "\"$(cat deploy_key.pub)\""
   ```
4. In GitHub unter **Settings → Secrets and variables → Actions** zwei Secrets anlegen:
   `DEPLOY_SSH_KEY` = Inhalt von `deploy_key` (privat), `DEPLOY_KNOWN_HOSTS` = Ausgabe von `ssh-keyscan mmint23.de`.
   Danach `deploy_key` auf dem Laptop löschen.
5. **Actions → Veröffentlichen → Run workflow.**

Der Schlüssel `deploy_key` darf auf dem Server nur per rsync nach `/var/www/mmint23.de` schreiben, keine Shell.
Caddy schreibt keine Zugriffsprotokolle.

## Abgabe und Live-Funktionen

Die Abgabe der Leiterschaukel (Teilen an den Lehrer-Laptop) läuft weiter nur im gleichen WLAN mit `npm start`
im Repo der Simulation. Auf mmint23.de ist der Knopf „Teilen“ ausgeblendet.
