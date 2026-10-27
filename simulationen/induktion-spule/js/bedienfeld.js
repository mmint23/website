// ------------------------------------------------------------------
// Bedienfeld: Messgerät (Zeigermessgerät oder Multimeter, Messbereich), Magnet umdrehen, Lagen zurücksetzen,
// Anzeigen (Feldlinien, B im Spuleninneren, Diagramme)
// ------------------------------------------------------------------
import { METER } from './config.js';
import { state } from './state.js';
import { fluxChanged, resetPhysics } from './physik.js';
import { updateMeterFace } from './messgeraet.js';
import { clearPlot } from './diagramm.js';
import { fitView, controls } from './szene.js';
import { formatNumber } from './hilfen.js';
import { showLink } from '../../../gemeinsam/link.js';

const $ = id => document.getElementById(id);
const METERS = [['pointerBtn', 'pointer'], ['multiBtn', 'multi']];
const CHECKS = [['fieldCheck', 'showField'], ['bCheck', 'showB'], ['plotCheck', 'showPlot']];

const segment = (id, active) => {
  $(id).classList.toggle('active', active);
  $(id).setAttribute('aria-pressed', String(active));
};

function updateUi() {
  for (const [id, meter] of METERS) segment(id, state.meter === meter);
  $('rangeBox').hidden = state.meter !== 'pointer';
  $('multiInfo').hidden = state.meter !== 'multi';
  for (const button of $('rangeButtons').children) segment(button.id, Number(button.dataset.range) === state.range);
  $('magnetStatus').textContent = state.northRight ? 'Nordpol (rot) rechts, Südpol (grün) links' : 'Nordpol (rot) links, Südpol (grün) rechts';
  for (const [id, key] of CHECKS) $(id).checked = state[key];
  $('fieldLegend').hidden = !state.showField;
  $('plotBox').hidden = !state.showPlot;   // gleich hier, damit resetView() den Platz schon richtig misst
  updateMeterFace();
}

// ---------------- Startansicht

// Magnet, Spule und Messgerät in der Bildebene (cm)
const INHALT = { x: -4, y: 7, w: 52, h: 28 };
let verschoben = false;   // hat jemand die Ansicht gedreht oder gezoomt? Dann beim Größenwechsel nicht neu einpassen

// Freie Fläche zwischen Überschrift, Bedienfeld, Diagrammen und Hinweis
function freieFlaeche() {
  const W = innerWidth, H = innerHeight;
  const rect = el => el.getBoundingClientRect();
  const kopf = rect(document.querySelector('.header')), panel = rect($('panel'));
  const plot = state.showPlot ? rect($('plotBox')) : null;
  const hint = document.querySelector('.hint');
  const top = kopf.bottom + 8;
  const flaeche = (left, right, bottom) => ({ x: left, y: top, w: Math.max(120, right - left), h: Math.max(120, bottom - top) });
  if (W <= 700) return flaeche(16, W - 16, (plot ? plot.top : panel.top) - 8);
  const right = panel.left - 12;
  const unten = hint.offsetParent ? rect(hint).top - 8 : H - 16;
  if (!plot) return flaeche(16, right, unten);
  const groesse = f => Math.min(f.w / INHALT.w, f.h / INHALT.h);
  const daneben = flaeche(plot.right + 12, right, unten), darueber = flaeche(16, right, plot.top - 8);
  return groesse(darueber) > groesse(daneben) ? darueber : daneben;
}

function resetView() {
  verschoben = false;
  fitView(freieFlaeche(), INHALT);
}

export function initUi() {
  for (const range of METER.RANGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'range' + String(range).replace('.', '_');
    button.dataset.range = range;
    button.textContent = `±${formatNumber(range, range < 1 ? 1 : 0)} V`;
    button.addEventListener('click', () => { state.range = range; updateUi(); });
    $('rangeButtons').append(button);
  }
  for (const [id, meter] of METERS) $(id).addEventListener('click', () => { state.meter = meter; updateUi(); });
  $('flipBtn').addEventListener('click', () => {
    state.northRight = !state.northRight;
    fluxChanged();
    updateUi();
  });
  $('resetBtn').addEventListener('click', () => {
    resetPhysics();
    clearPlot();
  });
  for (const [id, key] of CHECKS) {
    $(id).addEventListener('change', e => {
      state[key] = e.target.checked;
      updateUi();
      if (key === 'showPlot' && !verschoben) resetView();   // mehr bzw. weniger Platz für das Modell
    });
  }
  $('resetView').addEventListener('click', resetView);
  $('linkBtn').addEventListener('click', () => showLink());
  controls.addEventListener('start', () => { verschoben = true; });
  window.addEventListener('resize', () => { if (!verschoben) resetView(); });

  resetView();
  updateUi();
}
