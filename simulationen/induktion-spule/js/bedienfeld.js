// ------------------------------------------------------------------
// Bedienfeld: ganz oben reale Physik statt Feldlinienmodell; Messgerät (Zeiger mit oder ohne Skala oder Multimeter,
// Messbereich, Kabel abziehen), Magnet (Stärke, Drehung, umdrehen; zweiter Magnet mit eigener Drehung), Spule
// (Windungszahl bzw. einzelne Leiterschleife, Drehung – auf Wunsch bis ±4 · 360°), Lagen zurücksetzen, Anzeigen
// (Feldlinien – nur mit einem Magneten –, B im Spuleninneren, Diagramme)
// ------------------------------------------------------------------
import { METER, STRENGTHS, TURNS, rangeText } from './config.js';
import { state } from './state.js';
import { bodies, fluxChanged, resetPhysics, turnTo, zweitenMagnetenSetzen } from './physik.js';
import { updateMeterFace } from './messgeraet.js';
import { ausstecken, drallVerschieben } from './kabel.js';
import { clearPlot } from './diagramm.js';
import { fitView, controls } from './szene.js';
import { showLink } from '../../../gemeinsam/link.js';

const $ = id => document.getElementById(id);
const METERS = [['pointerBtn', 'pointer'], ['qualBtn', 'qual'], ['multiBtn', 'multi']];
const CHECKS = [['fieldCheck', 'showField'], ['insideCheck', 'colorInside'], ['bCheck', 'showB'], ['plotCheck', 'showPlot']];

const segment = (id, active) => {
  $(id).classList.toggle('active', active);
  $(id).setAttribute('aria-pressed', String(active));
};

// Bedienfeld nach dem Zustand richten (auch von der Live-Steuerung aufgerufen)
export function updateUi() {
  for (const [id, meter] of METERS) segment(id, state.meter === meter);
  $('rangeBox').hidden = state.meter !== 'pointer';
  $('multiInfo').hidden = state.meter !== 'multi';
  $('qualInfo').hidden = state.meter !== 'qual';
  for (const button of $('rangeButtons').children) segment(button.id, Number(button.dataset.range) === state.range);
  for (const button of $('strengthButtons').children) segment(button.id, button.dataset.strength === state.strength);
  for (const button of $('turnsButtons').children) segment(button.id, Number(button.dataset.turns) === state.turns);
  $('coilStatus').textContent = TURNS[state.turns].loop ? 'Einzelne Leiterschleife (1 Windung)' : `Spule mit ${state.turns} Windungen`;
  const pole = rechts => (rechts ? 'Nordpol (rot) rechts, Südpol (grün) links' : 'Nordpol (rot) links, Südpol (grün) rechts');
  $('magnetStatus').textContent = pole(state.northRight);
  segment('secondMagnetBtn', state.secondMagnet);
  $('magnet2Box').hidden = !state.secondMagnet;
  $('magnet2Status').textContent = pole(state.northRight2);
  // Feldlinien nur mit einem Magneten (die Überlagerung zweier Magnete wird nicht gezeichnet)
  $('fieldCheck').disabled = state.secondMagnet;
  $('fieldInfo').hidden = !state.secondMagnet;
  // Drehregler der Spule: ±180° oder ±4 · 360°
  segment('manyTurnsBtn', state.manyTurns);
  const grenze = state.manyTurns ? 4 * 360 : 180;
  Object.assign($('coilAngle'), { min: -grenze, max: grenze });
  for (const [id, key] of CHECKS) $(id).checked = state[key];
  $('insideCheck').disabled = !state.showField || state.secondMagnet;   // färben nur bei eingeblendeten Feldlinien
  $('lineModelBtn').setAttribute('aria-pressed', String(!state.lineModel));   // gedrückt: reale Physik
  $('lineModelInfo').hidden = !state.lineModel;
  $('realInfo').hidden = state.lineModel;
  $('plotBox').hidden = !state.showPlot;   // gleich hier, damit resetView() den Platz schon richtig misst
  updateMeterFace();
}

// ---------------- Startansicht

// Magnet, Spule und Messgerät in der Bildebene (cm)
const INHALT_EIN = { x: -4, y: 7, w: 52, h: 28 };
const INHALT_ZWEI = { x: -1, y: 7, w: 58, h: 28 };   // mit dem zweiten Magneten rechts der Spule (bis x ≈ 25)
const inhalt = () => (state.secondMagnet ? INHALT_ZWEI : INHALT_EIN);
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
  const groesse = f => Math.min(f.w / inhalt().w, f.h / inhalt().h);
  const daneben = flaeche(plot.right + 12, right, unten), darueber = flaeche(16, right, plot.top - 8);
  return groesse(darueber) > groesse(daneben) ? darueber : daneben;
}

function resetView() {
  verschoben = false;
  fitView(freieFlaeche(), inhalt());
}

// Knöpfe einer Auswahl anlegen: werte [[Wert, Text], …], beim Klick wählen(Wert)
function auswahl(id, werte, attribut, waehlen) {
  for (const [wert, text] of werte) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id + '_' + String(wert).replace('.', '_');
    button.dataset[attribut] = wert;
    button.textContent = text;
    button.addEventListener('click', () => { waehlen(wert); updateUi(); });
    $(id).append(button);
  }
}

// ---------------- Drehregler: folgen dem tatsächlichen Winkel, solange man sie nicht selbst bedient

const REGLER = [['magnetAngle', 'magnet'], ['magnet2Angle', 'magnet2'], ['coilAngle', 'coil']];
const bedient = new Set();
const grad = rad => Math.round(rad * 180 / Math.PI);

// Jedes Bild: Regler und Anzeige nachziehen; Hinweis, wenn eine Drehung an der Spule hängen bleibt
export function updateReadout() {
  let blockiert = false;
  for (const [id, name] of REGLER) {
    const body = bodies[name];
    if (!bedient.has(id)) $(id).value = grad(body.angle);
    $(id + 'Out').textContent = grad(body.angle) + '°';
    if (Math.abs(body.angleTarget - body.angle) > 0.05) blockiert = true;
  }
  $('blockedInfo').hidden = !blockiert;
}

export function initUi() {
  for (const range of METER.RANGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'range' + String(range).replace('.', '_');
    button.dataset.range = range;
    button.textContent = rangeText(range);
    button.addEventListener('click', () => { state.range = range; updateUi(); });
    $('rangeButtons').append(button);
  }
  for (const [id, meter] of METERS) {
    $(id).addEventListener('click', () => {
      if (state.meter !== meter) ausstecken();   // anderes Gerät: Stecker heraus
      state.meter = meter;
      updateUi();
    });
  }
  $('unplugBtn').addEventListener('click', ausstecken);
  auswahl('strengthButtons', Object.entries(STRENGTHS).map(([k, s]) => [k, s.label]), 'strength', wert => {
    state.strength = wert;
    fluxChanged();
  });
  auswahl('turnsButtons', Object.keys(TURNS).map(n => [Number(n), n]), 'turns', wert => {
    state.turns = wert;
    fluxChanged();
  });
  for (const [id, name] of REGLER) {
    const regler = $(id);
    regler.addEventListener('input', () => turnTo(name, Number(regler.value) * Math.PI / 180));
    regler.addEventListener('pointerdown', () => bedient.add(id));
    regler.addEventListener('focus', () => bedient.add(id));
    regler.addEventListener('blur', () => bedient.delete(id));
  }
  window.addEventListener('pointerup', () => {
    for (const [id] of REGLER) if (document.activeElement !== $(id)) bedient.delete(id);
  });
  $('flipBtn').addEventListener('click', () => {
    state.northRight = !state.northRight;
    fluxChanged();
    updateUi();
  });
  $('flip2Btn').addEventListener('click', () => {
    state.northRight2 = !state.northRight2;
    fluxChanged();
    updateUi();
  });
  // Zweiter Magnet dazu bzw. weg; mit zwei Magneten keine Feldlinien
  $('secondMagnetBtn').addEventListener('click', () => {
    state.secondMagnet = !state.secondMagnet;
    if (state.secondMagnet) {
      zweitenMagnetenSetzen();
      Object.assign(state, { showField: false, colorInside: false });
    }
    fluxChanged();
    updateUi();
    if (!verschoben) resetView();   // Bildausschnitt mit bzw. ohne zweiten Magneten
  });
  // Spule über mehrere Umdrehungen drehen; zurück auf ±180°: Winkel auf denselben Stand innerhalb einer Umdrehung
  $('manyTurnsBtn').addEventListener('click', () => {
    state.manyTurns = !state.manyTurns;
    if (!state.manyTurns) {
      const coil = bodies.coil, voll = 2 * Math.PI * Math.round(coil.angle / (2 * Math.PI));
      coil.angle -= voll;
      coil.angleTarget -= voll;
      drallVerschieben(voll);   // die Kabel bleiben so verdrillt, wie sie sind
    }
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
  // Knopf „Reale Physik“: wechselt zwischen echtem Feld und Feldlinienmodell (Standard). Ob die Feldlinien zu
  // sehen sind, bleibt davon unberührt.
  $('lineModelBtn').addEventListener('click', () => {
    state.lineModel = !state.lineModel;
    fluxChanged();
    updateUi();
  });
  $('resetView').addEventListener('click', resetView);
  $('linkBtn').addEventListener('click', () => showLink());
  controls.addEventListener('start', () => { verschoben = true; });
  window.addEventListener('resize', () => { if (!verschoben) resetView(); });

  resetView();
  updateUi();
}
