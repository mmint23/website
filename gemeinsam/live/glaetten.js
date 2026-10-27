// ------------------------------------------------------------------
// Live-Steuerung: empfangene Zustände glätten (ohne DOM, damit es sich in Node testen lässt).
//
// Das steuernde Gerät schickt seinen Zustand mit der Zeit, zu der er gerechnet wurde (Uhr des Senders). Kommen die
// Zustände unregelmäßig an (iPads schicken im WLAN oft zwei auf einmal und dann eine Weile nichts), würde das
// Zuschauen ruckeln. Deshalb zeigt das zuschauende Gerät den Zustand um VERZOEGERUNG ms versetzt an und rechnet für
// die bewegten Größen (Option glaetten) Zwischenwerte zwischen den beiden umliegenden Zuständen. Alles andere
// (Schalter, Einstellungen, Text) kommt unverändert aus dem älteren der beiden Zustände.
// ------------------------------------------------------------------

export const VERZOEGERUNG = 120;   // ms: so viel später als gesendet wird angezeigt (Polster für ungleichmäßige Ankunft)
const NEUSTART = 1000;             // ms: springt die Uhr des Senders so weit (neu geladen, anderes Gerät), neu anfangen
const NACHFUEHREN = 0.001;         // Versatz steigt höchstens um 1 ms je Sekunde (Gangunterschied der Uhren)

const holen = (objekt, weg) => weg.reduce((o, k) => o?.[k], objekt);
function setzen(objekt, weg, wert) {
  const ziel = holen(objekt, weg.slice(0, -1));
  if (ziel && typeof ziel === 'object') ziel[weg.at(-1)] = wert;
}
const mitteln = (a, b, f) => a + (b - a) * f;

// Zwischenzustand: Kopie von a, die Größen unter wege (z. B. ['swing', 'theta']) zwischen a und b gemittelt
// (Zahlen und Listen von Zahlen gleicher Länge)
export function zwischen(a, b, f, wege) {
  const ergebnis = structuredClone(a);
  for (const weg of wege) {
    const va = holen(a, weg), vb = holen(b, weg);
    if (typeof va === 'number' && typeof vb === 'number') setzen(ergebnis, weg, mitteln(va, vb, f));
    else if (Array.isArray(va) && Array.isArray(vb) && va.length === vb.length && va.every(Number.isFinite) && vb.every(Number.isFinite)) {
      setzen(ergebnis, weg, va.map((w, i) => mitteln(w, vb[i], f)));
    }
  }
  return ergebnis;
}

export class Glaetter {
  // glaetten: Liste der Größen als Punkt-Pfade, z. B. ['swing.theta', 'view.position']
  constructor(glaetten = []) {
    this.wege = glaetten.map(pfad => pfad.split('.'));
    this.leeren();
  }

  leeren() {
    this.puffer = [];      // { zeit, zustand }, nach zeit sortiert
    this.versatz = null;   // Ankunft − Sendezeit: kleinster bisher gemessener Wert (schnellster Weg), langsam nachgeführt
    this.zuletzt = null;   // Ankunftszeit des letzten Zustands
  }

  // Empfangener Zustand; jetzt: lokale Uhr (performance.now())
  empfangen(zeit, zustand, jetzt) {
    const versatz = jetzt - zeit;
    const letzter = this.puffer.at(-1);
    if (letzter && (zeit < letzter.zeit - NEUSTART || Math.abs(versatz - this.versatz) > NEUSTART)) this.leeren();
    else if (letzter && zeit <= letzter.zeit) return;   // überholt (kommt vor dem schon bekannten an)
    if (this.versatz === null || versatz < this.versatz) this.versatz = versatz;
    else this.versatz += Math.min(versatz - this.versatz, (jetzt - this.zuletzt) * NACHFUEHREN);
    this.zuletzt = jetzt;
    this.puffer.push({ zeit, zustand });
  }

  // Zustand für das Bild zur lokalen Zeit jetzt (null, solange noch nichts empfangen wurde)
  anzeigen(jetzt) {
    if (!this.puffer.length) return null;
    const ziel = jetzt - this.versatz - VERZOEGERUNG;
    // ältere Zustände weg, solange der nächste auch schon dran ist
    while (this.puffer.length > 2 && this.puffer[1].zeit <= ziel) this.puffer.shift();
    const [a, b] = this.puffer;
    if (!b || ziel <= a.zeit) return a.zustand;
    if (ziel >= b.zeit) return b.zustand;   // nichts Neueres da: stehen bleiben statt raten
    return zwischen(a.zustand, b.zustand, (ziel - a.zeit) / (b.zeit - a.zeit), this.wege);
  }
}
