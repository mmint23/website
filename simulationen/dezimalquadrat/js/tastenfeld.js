// ------------------------------------------------------------------
// Eigenes Ziffernfeld für Touch-Geräte (iPad): ersetzt die Bildschirmtastatur, die sonst den halben
// Bildschirm verdeckt. Erscheint als kleines Feld direkt am angetippten Eingabefeld.
//   zeigeTasten(anker, tasten, beiTaste, beiSchliessen): tasten = Liste von Zeilen, jede Taste { text, wert, breit?, klasse? }
// Ein Tipp daneben schließt das Feld.
// ------------------------------------------------------------------

/** Touch-Gerät ohne Maus (iPad, Tablet): dann eigenes Ziffernfeld statt Bildschirmtastatur */
export const touch = window.matchMedia('(pointer: coarse)').matches;

const feld = document.createElement('div');
feld.className = 'tastenfeld';
feld.hidden = true;
document.body.appendChild(feld);
let aktuell = null;                          // { anker, beiTaste }

export function zeigeTasten(anker, tasten, beiTaste, beiSchliessen = () => {}) {
  if (aktuell) schliesseTasten();
  aktuell = { anker, beiTaste, beiSchliessen };
  feld.innerHTML = '';
  for (const zeile of tasten) {
    const z = document.createElement('div');
    z.className = 'tastenzeile';
    for (const t of zeile) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.text;
      if (t.klasse) b.className = t.klasse;
      if (t.breit) b.style.flex = String(t.breit);
      // pointerdown statt click: reagiert sofort, und das Eingabefeld verliert den Fokus nicht
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); aktuell?.beiTaste(t.wert); });
      z.appendChild(b);
    }
    feld.appendChild(z);
  }
  feld.hidden = false;
  platzieren();
}

/** Ziffernfeld an ein anderes Eingabefeld hängen (z. B. nächste Stelle der Tafel) */
export function verschiebeZu(anker) {
  if (!aktuell) return;
  aktuell.anker = anker;
  platzieren();
}

export function schliesseTasten() {
  feld.hidden = true;
  const a = aktuell;
  aktuell = null;
  a?.beiSchliessen();
}
export const tastenOffen = () => !feld.hidden;

// unter dem Anker, sonst darüber; immer ganz im Bild
function platzieren() {
  const a = aktuell.anker.getBoundingClientRect(), r = feld.getBoundingClientRect();
  let x = a.left + a.width / 2 - r.width / 2;
  let y = a.bottom + 8;
  if (y + r.height > window.innerHeight - 8) y = a.top - r.height - 8;
  x = Math.max(8, Math.min(window.innerWidth - r.width - 8, x));
  y = Math.max(8, y);
  feld.style.left = `${x}px`;
  feld.style.top = `${y}px`;
}

// Tipp außerhalb von Ziffernfeld und Anker schließt
document.addEventListener('pointerdown', e => {
  if (!aktuell || feld.contains(e.target) || aktuell.anker.contains(e.target)) return;
  schliesseTasten();
}, true);
window.addEventListener('resize', () => { if (aktuell) platzieren(); });
