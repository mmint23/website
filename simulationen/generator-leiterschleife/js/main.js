// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls } from './szene.js';
import { state } from './state.js';
import { stepPhysics, stepPark, stepSpule } from './physik.js';
import { syncModel } from './modell.js';
import { syncMeter } from './messgeraet.js';
import { syncLed } from './led.js';
import { syncLamp } from './gluehlampe.js';
import { updatePlot } from './diagramm.js';
import { initUi, updateHoldSlider, updateParkStatus } from './bedienfeld.js';
import { syncExplain } from './erklaerung.js';
import './ziehen.js';
import { syncBauteile } from './bauteile.js';
import { initTafel, oeffneTafel, tafelOffen, zuTafel, vonTafel } from '../../../gemeinsam/tafel/index.js';
import { initLaser, laserKnopf } from '../../../gemeinsam/laser/laser.js';
import { initLiveSteuerung, zuschauen, ansichtUebernehmen } from './live.js';

initUi();
// Tafel im Erklärmodus: Seite 1 zeigt die Schleife in fünf Stellungen groß als Bilder des 3D-Modells mit dem
// einzelnen Elektron (dort lassen sich B, v und F_L direkt einzeichnen); Seite 2 dieselben Bilder kleiner, darunter
// ein leeres U-t-Diagramm zum Einzeichnen der Sinuskurve. Mit Abgabe an die Lehrkraft, wenn die Seite über den Abgabe-Server läuft
initTafel({
  id: 'generator-leiterschleife',
  seiten: [
    {
      bild: 'bilder/tafel.svg',
      bildText: 'Generator im 3D-Modell in den Stellungen 0°, 90°, 180°, 270° und 360° mit einem einzelnen Elektron in Längsseite A, große Bilder in zwei Reihen',
      titel: 'Seite 1: 3D-Modell',
    },
    {
      bild: 'bilder/tafel2.svg',
      bildText: 'Generator im 3D-Modell in den Stellungen 0°, 90°, 180°, 270° und 360° mit einem einzelnen Elektron in Längsseite A, darunter ein leeres U-t-Diagramm',
      titel: 'Seite 2: U-t-Diagramm',
    },
  ],
  seitenverhaeltnis: 1.6,
  leisteZusatz: [laserKnopf()],   // Laserpointer auch auf der Tafel (und beim Zuschauen bedienbar)
});
document.getElementById('tafelBtn').addEventListener('click', oeffneTafel);
initLaser({ renderer, camera, controls, tafel: { offen: tafelOffen, zu: zuTafel, von: vonTafel } });
initLiveSteuerung();   // nach initTafel: das Bedienfeld kommt in die Abgabeleiste der Lehrerseite

const SLOW_MOTION = 0.25;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tafelOffen()) return;   // Tafel groß geöffnet: Szene ruht, damit das Zeichnen flüssig bleibt
  // Live-Steuerung: Zeigt dieses Gerät nur an, rechnet es nicht selbst – Bewegung und Ansicht kommen vom anderen
  const nurAnzeigen = zuschauen();
  if (!nurAnzeigen) {
    stepPark(dt);                // Rotor beim Antrieb „Wind“
    stepSpule(dt);               // Umbau Leiterschleife ↔ Spule (läuft auch in der Pause)
    controls.update();
    if (!state.paused) stepPhysics(state.slowMotion ? dt * SLOW_MOTION : dt);
  } else ansichtUebernehmen();
  updateParkStatus();
  syncModel(state.paused ? 0 : dt);
  syncBauteile(dt);   // Tausch des Bauteils in Echtzeit (auch in der Zeitlupe)
  syncMeter();
  syncLed();
  syncLamp();
  syncExplain();
  updateHoldSlider();
  updatePlot();
  renderer.render(scene, camera);
});
