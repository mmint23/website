// ------------------------------------------------------------------
// Start: Zeichenfläche und Bedienfeld
// ------------------------------------------------------------------
import { initAnsicht } from './ansicht.js';
import { initStrahl } from './strahl.js';
import { initBedienfeld, sichtbarkeit } from './bedienfeld.js';

initAnsicht(() => sichtbarkeit());
initStrahl(() => sichtbarkeit());
initBedienfeld();

// iPad / Safari: Zoomen der ganzen Seite mit zwei Fingern verhindern (der Zahlenstrahl zoomt selbst)
for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault());
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
