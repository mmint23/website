# Live-Steuerung: ein Schülergerät steuert die Simulation am Beamer

Gemeinsamer Baustein für alle Simulationen der Website. Ein Schüler scannt einen QR-Code und bedient die
Simulation auf seinem iPad – der Beamer (Lehrerseite) zeigt genau das. Die Lehrkraft kann jederzeit selbst
übernehmen und wieder abgeben, ohne dass der Schüler neu scannen muss.

Läuft nur über den Abgabe-Server auf dem Lehrer-Laptop (`npm start` im Ordner `website/`, siehe
[`../tafel/README.md`](../tafel/README.md)): alles im WLAN des Klassenzimmers, nichts geht ins Internet. Ohne
Server (GitHub Pages) ist der Baustein unsichtbar.

## Ablauf im Unterricht

1. Lehrerseite öffnen, z. B. <http://localhost:8080/lehrer/leiterschaukel-induktion>. In der Abgabeleiste unten
   steht die Spalte **„Live-Steuerung“**.
2. **„Steuerung abgeben“** → großer QR-Code. Ein Schüler scannt ihn; sein Gerät übernimmt zuerst genau den Stand am
   Beamer (es springt nichts) und steuert dann. Der QR-Code schließt sich von selbst.
3. Am Beamer steht „Ein Schülergerät steuert die Simulation“; Bedienfelder sind gedämpft und gesperrt.
   Laserpointer und „Link / QR-Code zeigen“ bleiben bedienbar. Auf dem Schülergerät steht „Du steuerst die
   Simulation am Beamer“.
4. **„Ich steuere“**: Die Lehrkraft bedient wieder selbst, das Schülergerät zeigt mit („Die Lehrkraft steuert
   gerade – du siehst mit“). **„Schüler steuert“**: zurück an denselben Schüler – ohne neues Scannen.
5. Das Schülergerät bleibt verbunden, auch nach Neuladen oder einer kurzen WLAN-Unterbrechung.
   **„Steuerung abgeben“** erzeugt einen neuen QR-Code für den nächsten Schüler – das bisherige Gerät verliert die
   Steuerung sofort. **„Trennen“** beendet die Live-Steuerung.

Sicherheit: Der Code im QR-Code ist zufällig und gilt nur, bis ein neuer erzeugt oder getrennt wird. Wer die
Adresse abtippt oder `?steuern=…` errät, bekommt nichts. Es steuert immer genau ein Gerät.

## Wie es funktioniert

Gespiegelt wird der **Zustand** der Simulation, nicht die Eingaben: Das Gerät, das steuert, rechnet wie gewohnt und
schickt seinen Zustand etwa 30-mal pro Sekunde über den Server. Das andere rechnet nicht selbst, übernimmt den
Zustand nur und zeichnet ihn – auch die Ansicht (Kamera). Der Server merkt sich den letzten Zustand, damit ein
neu verbundenes Gerät sofort den aktuellen Stand hat.

## In eine Simulation einbauen

Voraussetzung: Der ganze veränderliche Zustand der Simulation liegt in einem Objekt (z. B. `state` in `state.js`),
aus dem die Darstellung in jedem Bild gezeichnet wird.

```js
import { initLive, zuschauen, zustandUebernehmen } from '../../../gemeinsam/live/live.js';

initLive({
  id: 'meine-simulation',                        // Ordnername; dieselbe Kennung wie bei initTafel
  lesen: () => structuredClone(state),           // Zustand als reine Daten
  schreiben: daten => {                          // empfangenen Zustand übernehmen
    zustandUebernehmen(state, daten);            // schreibt in die bestehenden Teilobjekte
    // … Bedienfeld nachziehen, ggf. Teile neu aufbauen
  },
});

// in der Render-Schleife: beim Zuschauen nicht selbst rechnen, Kamera aus dem Zustand übernehmen
if (!zuschauen()) stepPhysics(dt);
```

| Option | Bedeutung |
|---|---|
| `id` | **Pflicht.** Kennung der Simulation (wie bei `initTafel`). |
| `lesen` | **Pflicht.** Liefert den Zustand als reine Daten (JSON-fähig). Was nur auf einem Gerät gelten soll (z. B. Laserpointer), weglassen. |
| `schreiben` | **Pflicht.** Übernimmt empfangene Daten. `zustandUebernehmen(ziel, daten)` ersetzt keine Teilobjekte – wichtig, wenn andere Module Verweise darauf halten. |
| `sperren` | Bereiche, die beim Zuschauen gesperrt sind (CSS-Selektor). Standard: `#scene, .panel, .popup, .hint`. Elemente mit der Klasse `live-frei` darin bleiben bedienbar. |
| `beiWechsel(zuschauen)` | Wird aufgerufen, wenn das Gerät zwischen Zuschauen und Steuern wechselt (z. B. laufendes Ziehen beenden). |

Hat die Simulation eine Zeichentafel (`initTafel`), kommt das Bedienfeld der Lehrerseite in die Abgabeleiste;
sonst erscheint es als kleiner Kasten unten links. `initLive` nach `initTafel` aufrufen.

Beispiel: `simulationen/leiterschaukel-induktion/js/live.js` (baut beim Übernehmen nur neu auf, was sich
geändert hat: Versuch, Anzeige, Kabel, Polung des Magneten).

## Technik

| Datei | Aufgabe |
|---|---|
| `live.js` | Rollen, Senden/Übernehmen, Bedienfeld der Lehrerseite, Hinweise, Sperren |
| `live.css` | Aussehen von Hinweis und Bedienfeld |
| `../verbindung.js` | Server erkennen, Raum, PIN, eine WebSocket-Leitung je Seite (auch von der Abgabe genutzt) |
| `../../server/server.js` | Live-Nachrichten (`live-abgeben`, `live-umschalten`, `live-trennen`, `zustand`, `live-status`, `live-ende`), oben in der Datei beschrieben |
