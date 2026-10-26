// ------------------------------------------------------------------
// Bedienfeld: Modus, Material, Stabmagnet, Spule, Hammer, Anzeigen, Statustexte
// ------------------------------------------------------------------
import { MATERIALIEN, magnetisierung } from './modell.js';
import { state, entmagnetisieren, KERN_DRAUSSEN } from './state.js';
import { feldAnteile, kernDrin } from './welt.js';
import { hammerschlag, neuEinpassen } from './ansicht.js';

const $ = id => document.getElementById(id);
const komma = (v, n = 1) => v.toFixed(n).replace('.', ',');

const MATERIAL_NOTIZ = {
  weicheisen: 'Weicheisen lässt sich leicht magnetisieren, verliert die Ordnung aber schnell wieder (z. B. Eisenkern eines Elektromagneten).',
  stahl: 'Stahl lässt sich schwerer magnetisieren, bleibt dann aber magnetisch (Dauermagnet).',
};

/** Knöpfe, Texte und Sichtbarkeit nach dem Zustand */
export function auffrischen() {
  const spule = state.modus === 'spule';
  for (const b of document.querySelectorAll('[data-modus]')) b.classList.toggle('active', b.dataset.modus === state.modus);
  for (const b of document.querySelectorAll('[data-material]')) b.classList.toggle('active', b.dataset.material === state.material);
  $('materialNotiz').textContent = MATERIAL_NOTIZ[state.material];
  $('streichenBox').hidden = spule;
  $('spuleBox').hidden = !spule;
  $('kompassZeile').hidden = spule;
  $('untertitel').textContent = spule ? 'Spule mit Eisenkern' : 'Magnetisieren durch Streichen mit einem Stabmagneten';
  $('hinweis').textContent = spule
    ? 'Schalte den Strom ein · Tippe auf das Eisenstück: Hammerschlag'
    : 'Ziehe den Stabmagneten über das Eisenstück · Tippe auf das Eisenstück: Hammerschlag';
  $('umdrehenBtn').textContent = `Magnet umdrehen (unten: ${state.unten === 'N' ? 'Nordpol' : 'Südpol'})`;
  const strom = $('stromBtn');
  strom.textContent = state.stromAn ? 'Strom ausschalten' : 'Strom einschalten';
  strom.classList.toggle('on', state.stromAn);
  $('stromRegler').value = state.strom;
  $('stromAus').textContent = `${komma(state.strom)} A`;
  $('kernBtn').textContent = state.kernZiel === 0 ? 'Eisenkern herausziehen' : 'Eisenkern in die Spule schieben';
  $('feldCheck').checked = state.zeigeFeld;
  $('kompassCheck').checked = state.zeigeKompass;
  $('poleCheck').checked = state.zeigePole;
}

/** Laufend: Ordnung, Feldstärke, Statustext */
export function anzeigen() {
  const { mx, ordnung } = magnetisierung(state.magnete);
  $('ordnungBalken').style.width = `${Math.round(ordnung * 100)}%`;
  const pol = mx > 0 ? 'links Südpol, rechts Nordpol' : 'links Nordpol, rechts Südpol';
  let text;
  if (ordnung < 0.25) text = 'Die Elementarmagnete sind ungeordnet: Das Eisenstück ist nicht magnetisch.';
  else if (ordnung < 0.6) text = `Die Elementarmagnete sind teilweise geordnet: Das Eisenstück ist schwach magnetisch (${pol}).`;
  else text = `Die Elementarmagnete sind geordnet: Das Eisenstück ist selbst ein Magnet (${pol}).`;
  $('ordnungText').textContent = `${Math.round(ordnung * 100)} % geordnet`;
  if (state.modus === 'spule') {
    const a = feldAnteile();
    $('anteilSpule').style.width = `${(100 * a.spule / a.max).toFixed(1)}%`;
    $('anteilKern').style.width = `${(100 * a.kern / a.max).toFixed(1)}%`;
    if (!state.stromAn) {
      text = (ordnung < 0.25 ? 'Kein Strom: Die Spule erzeugt kein Magnetfeld.' : 'Kein Strom – ')
        + (ordnung >= 0.25 ? (state.material === 'stahl' ? 'der Stahlkern bleibt aber magnetisch.' : 'der Weicheisenkern verliert seine Ordnung wieder.') : '');
    } else if (!kernDrin()) {
      text = 'Die Spule allein erzeugt nur ein schwaches Magnetfeld. Schiebe den Eisenkern hinein!';
    } else if (ordnung > 0.6) {
      text = 'Das Feld der Spule ordnet die Elementarmagnete im Eisenkern. Ihr Feld kommt zum Feld der Spule hinzu: Das Magnetfeld wird viel stärker.';
    } else {
      text = state.material === 'stahl'
        ? 'Stahl lässt sich schwer magnetisieren: Erhöhe die Stromstärke.'
        : 'Die Elementarmagnete im Eisenkern richten sich nach dem Feld der Spule aus …';
    }
  }
  $('status').textContent = text;
}

export function initBedienfeld() {
  for (const b of document.querySelectorAll('[data-modus]')) {
    b.addEventListener('click', () => {
      if (state.modus === b.dataset.modus) return;
      state.modus = b.dataset.modus;
      // passendes Material vorschlagen: Stahl zum Magnetisieren, Weicheisen als Kern eines Elektromagneten
      state.material = state.modus === 'spule' ? 'weicheisen' : 'stahl';
      state.stromAn = false; state.kernZiel = state.kernX = 0;
      entmagnetisieren();
      neuEinpassen();
      auffrischen();
    });
  }
  for (const b of document.querySelectorAll('[data-material]')) {
    b.addEventListener('click', () => { state.material = b.dataset.material; auffrischen(); });
  }
  $('umdrehenBtn').addEventListener('click', () => { state.unten = state.unten === 'N' ? 'S' : 'N'; auffrischen(); });
  $('stromBtn').addEventListener('click', () => { state.stromAn = !state.stromAn; auffrischen(); });
  $('stromRegler').addEventListener('input', e => { state.strom = Number(e.target.value); auffrischen(); });
  $('polungBtn').addEventListener('click', () => { state.polung *= -1; auffrischen(); });
  $('kernBtn').addEventListener('click', () => { state.kernZiel = state.kernZiel === 0 ? KERN_DRAUSSEN : 0; auffrischen(); });
  $('hammerBtn').addEventListener('click', () => hammerschlag());
  $('resetBtn').addEventListener('click', () => { entmagnetisieren(); auffrischen(); });
  for (const [id, key] of [['feldCheck', 'zeigeFeld'], ['kompassCheck', 'zeigeKompass'], ['poleCheck', 'zeigePole']]) {
    $(id).addEventListener('change', e => { state[key] = e.target.checked; });
  }
  auffrischen();
}
