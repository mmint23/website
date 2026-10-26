// ------------------------------------------------------------------
// Bedienfeld: Zahlanzeige, Eingabe, Stellenwerttafel mit ▲ / ▼, Anzahl der Quadrate,
// Einteilung des Zahlenstrahls, Zoom-Knöpfe
// ------------------------------------------------------------------
import { STUFEN, STELLEN, MINUS, ziffern, bruchText, nachkommastellen, lies, zerlegung, inKleinsterEinheit } from './zahl.js';
import { state, FARBEN, STRAHL_STELLEN } from './state.js';
import * as Quadrat from './ansicht.js';
import * as Strahl from './strahl.js';
import { touch, zeigeTasten, verschiebeZu, schliesseTasten } from './tastenfeld.js';

/** Die gerade sichtbare Darstellung (Zoom, Übersicht, Antippen) */
const ansicht = () => (state.strahl ? Strahl : Quadrat);
const feinsteStufe = () => ansicht().feinsteStufe();

const $ = id => document.getElementById(id);

// Stellenwerttafel: eigene Zahl zum freien Eintragen (Ziffern eintippen, ▲ / ▼, ± umschalten), unabhängig von der
// dargestellten Zahl. Mit true wieder gekoppelt: Tafel zeigt die dargestellte Zahl, ▲ / ▼ ändern sie (mit Übertrag).
const TAFEL_GEKOPPELT = false;

// Eigene Zahl der Tafel: Betrag in Zehntausendsteln und Vorzeichen (getrennt, damit auch „−0,…“ eingetragen werden kann)
const tafel = { betrag: 0, negativ: false };
const tafelMax = () => 10 * 10 ** STELLEN - (state.strahl ? 10 ** (STELLEN - STRAHL_STELLEN) : 1);   // 9,999 bzw. 9,9999
function tafelBetrag(b) {
  tafel.betrag = Math.max(0, Math.min(tafelMax(), b));
  auffrischen();
}
/** Ziffer der Stelle k (0 = Einer) in der Tafel auf d setzen */
function tafelZiffer(k, d) {
  const { ganze, nach } = ziffern(tafel.betrag);
  const alle = [ganze % 10, ...nach];
  alle[k] = d;
  tafelBetrag(alle.reduce((s, z, j) => s + z * 10 ** (STELLEN - j), 0));
}

// ---------------- Stellenwerttafel aufbauen: Vorzeichen (nur am Zahlenstrahl), dann E | z | h | t | zt
const vorzeichen = document.createElement('div');
vorzeichen.className = 'spalte vorzeichen';
vorzeichen.innerHTML = '<div class="kopf" title="Vorzeichen">±</div><div class="leer"></div>'
  + '<button type="button" class="ziffer" aria-label="Vorzeichen umschalten"></button><div class="leer"></div>';
$('stellenwerttafel').appendChild(vorzeichen);
const vorzeichenKnopf = vorzeichen.querySelector('.ziffer');
vorzeichenKnopf.disabled = TAFEL_GEKOPPELT;
vorzeichenKnopf.addEventListener('click', () => { tafel.negativ = !tafel.negativ; auffrischen(); });

const spalten = STUFEN.map((stufe, k) => {
  const el = document.createElement('div');
  el.className = 'spalte' + (k === 0 ? ' ganze' : '');
  const kopf = document.createElement('div');
  kopf.className = 'kopf';
  kopf.textContent = stufe.kurz;
  kopf.title = stufe.name;
  kopf.style.background = FARBEN[k].schrift;
  const hoch = document.createElement('button');
  hoch.type = 'button';
  hoch.textContent = '▲';
  hoch.setAttribute('aria-label', `um ein ${stufe.einzahl} größer`);
  const ziffer = document.createElement('div');
  ziffer.className = 'ziffer';
  // Eingabefeld für eine Ziffer (nur bei freier Tafel beschreibbar)
  const feld = document.createElement('input');
  feld.type = 'text';
  feld.inputMode = 'numeric';
  feld.autocomplete = 'off';
  feld.readOnly = TAFEL_GEKOPPELT || touch;       // iPad: eigenes Ziffernfeld statt Bildschirmtastatur
  feld.setAttribute('aria-label', `${stufe.name}: Ziffer eintragen`);
  feld.style.color = FARBEN[k].schrift;
  ziffer.appendChild(feld);
  const runter = document.createElement('button');
  runter.type = 'button';
  runter.textContent = '▼';
  runter.setAttribute('aria-label', `um ein ${stufe.einzahl} kleiner`);
  el.append(kopf, hoch, ziffer, runter);
  $('stellenwerttafel').appendChild(el);
  // Ein Teil dieser Stufe dazu bzw. weg (mit Übertrag: 0,09 + 0,01 = 0,1)
  const schritt = 10 ** (STELLEN - k);
  hoch.addEventListener('click', () => (TAFEL_GEKOPPELT ? state.setze(state.n + schritt) : tafelBetrag(tafel.betrag + schritt)));
  runter.addEventListener('click', () => (TAFEL_GEKOPPELT ? state.setze(state.n - schritt) : tafelBetrag(tafel.betrag - schritt)));
  return { el, feld, hoch, runter, schritt };
});

// Ziffern eintippen: Feld antippen, Ziffer tippen → nächste Stelle; Pfeiltasten wandern bzw. ▲ / ▼, Rücktaste: 0
const sichtbareFelder = () => spalten.filter(s => !s.el.hidden).map(s => s.feld);
spalten.forEach((s, k) => {
  s.feld.addEventListener('focus', () => s.feld.select());
  s.feld.addEventListener('click', () => { if (touch && !TAFEL_GEKOPPELT) zifferTasten(k); });
  s.feld.addEventListener('input', () => {
    const d = s.feld.value.replace(/\D/g, '').slice(-1);
    if (d === '') { auffrischen(); return; }
    tafelZiffer(k, Number(d));
    const felder = sichtbareFelder(), i = felder.indexOf(s.feld);
    if (i + 1 < felder.length) felder[i + 1].focus(); else s.feld.select();
  });
  s.feld.addEventListener('keydown', e => {
    if (TAFEL_GEKOPPELT) return;
    const felder = sichtbareFelder(), i = felder.indexOf(s.feld);
    if (e.key === 'ArrowRight' && i + 1 < felder.length) felder[i + 1].focus();
    else if (e.key === 'ArrowLeft' && i > 0) felder[i - 1].focus();
    else if (e.key === 'ArrowUp') s.hoch.click();
    else if (e.key === 'ArrowDown') s.runter.click();
    else if (e.key === 'Backspace' || e.key === 'Delete') { tafelZiffer(k, 0); s.feld.select(); }
    else if (e.key === '-' || e.key === '+') { if (state.strahl) vorzeichenKnopf.click(); }
    else return;
    e.preventDefault();
  });
});

// ---------------- Einteilung des Zahlenstrahls: E | z | h | t (Kürzel wie in der Stellenwerttafel)
const skalaStufen = STUFEN.slice(0, STRAHL_STELLEN + 1).map((stufe, k) => {
  const el = document.createElement('span');
  el.textContent = stufe.kurz;
  el.title = stufe.name;
  el.style.borderColor = el.style.color = FARBEN[k].schrift;
  $('skalaStufen').appendChild(el);
  return el;
});

// ---------------- Anzeigen auffrischen
function zahlHtml(n) {
  const { ganze, nach, negativ } = ziffern(n);
  const k = nachkommastellen(n);
  const span = (text, stufe) => `<span style="color:${FARBEN[stufe].schrift}">${text}</span>`;
  let html = (negativ ? MINUS : '') + span(ganze, 0);
  if (k > 0) html += ',' + nach.slice(0, k).map((d, j) => span(d, j + 1)).join('');
  return html;
}

/** Bruch in Bruchschreibweise (Zähler über Nenner), gemischte Zahl mit Ganzen davor */
function bruchHtml(b) {
  return (b.negativ ? MINUS : '') + (b.ganze ? `${b.ganze}\u2009` : '')
    + `<span class="bruch" aria-label="${bruchText(b)}"><span>${b.zaehler}</span><span>${b.nenner}</span></span>`;
}

function auffrischen() {
  const n = state.n, strahl = state.strahl, verdeckt = state.verdeckt;
  // Verdeckt (eingegeben, noch nicht markiert): nur die Eingabe zeigen, nicht die Dezimalzahl und ihre Zerlegung
  $('zahlAnzeige').innerHTML = state.bruch ? bruchHtml(state.bruch) + (verdeckt ? '' : ' = ' + zahlHtml(n)) : zahlHtml(n);
  $('zahlAnzeige').classList.toggle('mitBruch', !!state.bruch);
  $('zahlObenText').innerHTML = $('zahlAnzeige').innerHTML;      // dieselbe Zahl über dem Zahlenstrahl
  $('zahlOben').classList.toggle('mitBruch', !!state.bruch);
  const klein = inKleinsterEinheit(n);
  $('zerlegung').textContent = verdeckt ? 'Wo liegt diese Zahl auf dem Zahlenstrahl?'
    : n === 0 ? (strahl ? '' : 'Nichts ist gefärbt.')
      : `= ${zerlegung(n)}` + (klein && nachkommastellen(n) > 1 ? `\n= ${klein}` : '');
  $('zeigenBtn').hidden = !verdeckt;
  $('aufKnopfBtn').hidden = !strahl;
  $('aufKnopfBtn').setAttribute('aria-pressed', String(state.aufKnopfdruck));
  vorzeichen.hidden = !strahl;
  if (TAFEL_GEKOPPELT) {
    const { ganze, nach, negativ } = ziffern(n);
    vorzeichenKnopf.textContent = verdeckt ? '?' : negativ ? MINUS : n > 0 ? '+' : '';
    [ganze, ...nach].forEach((d, k) => {
      const s = spalten[k];
      s.el.hidden = strahl && k > STRAHL_STELLEN;
      s.feld.value = verdeckt ? '?' : d;
      s.hoch.disabled = n + s.schritt > state.max;
      s.runter.disabled = n - s.schritt < state.min;
    });
  } else {
    if (!strahl) tafel.negativ = false;
    tafel.betrag = Math.min(tafel.betrag, tafelMax());
    tafel.betrag -= tafel.betrag % (strahl ? 10 ** (STELLEN - STRAHL_STELLEN) : 1);   // am Zahlenstrahl bis t
    const { ganze, nach } = ziffern(tafel.betrag);
    vorzeichenKnopf.textContent = tafel.negativ ? MINUS : '+';
    [ganze, ...nach].forEach((d, k) => {
      const s = spalten[k];
      s.el.hidden = strahl && k > STRAHL_STELLEN;
      if (document.activeElement !== s.feld || s.feld.value !== String(d)) s.feld.value = d;
      s.hoch.disabled = tafel.betrag + s.schritt > tafelMax();
      s.runter.disabled = tafel.betrag - s.schritt < 0;
    });
  }
  for (const b of document.querySelectorAll('[data-quadrate]')) {
    b.classList.toggle('active', Number(b.dataset.quadrate) === state.quadrate);
  }
  for (const b of document.querySelectorAll('[data-einteilung]')) {
    b.classList.toggle('active', b.dataset.einteilung === state.einteilung);
  }
  for (const b of document.querySelectorAll('[data-darstellung]')) {
    b.classList.toggle('active', b.dataset.darstellung === state.darstellung);
  }
  skalaStufen.forEach((el, k) => {
    const an = k <= state.skala;
    el.classList.toggle('an', an);
    el.style.background = an ? FARBEN[k].schrift : '#fff';
  });
  $('feinerBtn').disabled = state.skala === STRAHL_STELLEN;
  $('groeberBtn').disabled = state.skala === 0;
  $('streckeBtn').setAttribute('aria-pressed', String(state.zeigeStrecke));
  $('antippenBtn').setAttribute('aria-pressed', String(state.antippen));
  // Stellenwerttafel: am Zahlenstrahl direkt über dem Strahl, sonst im Bedienfeld
  const platz = strahl ? $('tafelOben') : $('tafelPlatz');
  if ($('tafelBereich').parentElement !== platz) platz.appendChild($('tafelBereich'));
  $('tafelBereich').hidden = !state.zeigeTafel;
  $('tafelOben').hidden = !(strahl && state.zeigeTafel);
  $('obenLeiste').hidden = !strahl;
  $('tafelBtn').textContent = state.zeigeTafel ? 'Stellenwerttafel ausblenden' : 'Stellenwerttafel einblenden';
  $('tafelBtn').setAttribute('aria-pressed', String(state.zeigeTafel));
  $('flaeche').hidden = strahl;
  $('strahl').hidden = !strahl;
  $('quadratBereich').hidden = strahl;
  $('skalaBereich').hidden = !strahl;
  $('eingabe').placeholder = strahl ? 'z. B. −1,25 · 3/4' : 'z. B. 0,347 · 3/4';
  $('untertitel').textContent = strahl ? 'Zahlenstrahl von −3 bis 3.' : 'Ein Quadrat ist ein Ganzes.';
  document.querySelector('.header h1').textContent = strahl ? 'Dezimalzahlen am Zahlenstrahl' : 'Dezimalzahlen am Quadrat';
  sichtbarkeit(true);
  Quadrat.neuZeichnenAnfordern();
  Strahl.neuZeichnenAnfordern();
}

// Hinweise je nach Zoom (wird nach jedem Neuzeichnen aufgerufen, ändert nur bei Bedarf etwas)
let zuletzt = null;
export function sichtbarkeit(immer = false) {
  const fein = feinsteStufe();
  const schluessel = `${fein}|${state.lupe}|${nachkommastellen(state.n)}|${state.einteilung}|${state.darstellung}|${state.skala}`;
  if (!immer && schluessel === zuletzt) return;
  zuletzt = schluessel;
  spalten.forEach((s, k) => s.el.classList.toggle('unsichtbar', TAFEL_GEKOPPELT && k > fein));
  $('lupeBtn').setAttribute('aria-pressed', String(state.lupe));
  if (state.strahl) hinweiseStrahl(fein);
  if (!TAFEL_GEKOPPELT) {                     // freie Tafel: kurze Bedienungsanleitung statt Zoom-Hinweis
    $('tafelHinweis').textContent = 'Ziffer antippen und eintippen' + (state.strahl ? ' · ± antippen: Vorzeichen' : ' · ▲ / ▼ mit Übertrag');
  }
  if (state.strahl) return;
  const versteckt = nachkommastellen(state.n) > fein;
  const feiner = STUFEN.slice(fein + 1, STELLEN + 1).map(st => st.name).join(' und ');
  if (TAFEL_GEKOPPELT) $('tafelHinweis').textContent = fein === STELLEN
    ? 'Hineingezoomt: Jetzt kannst du auch Zehntausendstel antippen.'
    : versteckt
      ? `${feiner} sind hier zu klein – zoome hinein (z. B. mit der Lupe).`
      : `${feiner} siehst du, wenn du hineinzoomst.`;
  $('hinweis').textContent = state.lupe
    ? 'Lupe: Tippe auf ein Hundertstel, um hineinzuzoomen. Nochmal tippen: zurück.'
    : `Antippen färbt bis zu diesem ${STUFEN[fein].einzahl} · Ziehen: verschieben · Mausrad oder zwei Finger: zoomen`;
}

function hinweiseStrahl(fein) {
  const eng = Strahl.zuEng();
  const name = STUFEN[state.skala].name;
  if (TAFEL_GEKOPPELT) $('tafelHinweis').textContent = eng ? `${name}-Striche siehst du, wenn du hineinzoomst.` : '';
  const ziel = fein === 0 ? 'die nächste ganze Zahl' : `den nächsten ${STUFEN[fein].einzahl}-Strich`;
  $('hinweis').textContent = state.lupe
    ? (eng ? `Lupe: Tippe auf eine Stelle, um die ${name} zu sehen.` : 'Lupe: Tippen zoomt zurück zur Übersicht.')
    : (eng ? `${name} sind hier zu eng – zoome hinein. ` : '')
      + (state.antippen ? `Antippen markiert ${ziel} · ` : `Antippen zeigt die Strecke von 0 bis ${fein === 0 ? 'zur nächsten ganzen Zahl' : `zum nächsten ${STUFEN[fein].einzahl}-Strich`} · `) + 'Ziehen: verschieben · Mausrad oder zwei Finger: zoomen';
}

// Zahlfeld über dem Zahlenstrahl frei verschieben (Maus oder Finger); Doppelklick: zurück an seinen Platz
function zahlfeldVerschiebbar() {
  const el = $('zahlOben'), buehne = document.querySelector('.buehne');
  let versatz = { x: 0, y: 0 }, ziehen = null;
  const zurueck = $('zahlZurueck');
  const setzen = () => {
    el.style.transform = `translate(${versatz.x}px, ${versatz.y}px)`;
    zurueck.hidden = versatz.x === 0 && versatz.y === 0;
  };
  const zuruecksetzen = () => { versatz = { x: 0, y: 0 }; setzen(); };
  zurueck.addEventListener('pointerdown', e => e.stopPropagation());   // Knopf startet kein Ziehen
  zurueck.addEventListener('click', zuruecksetzen);
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    // Lage ohne Verschiebung, damit das Feld im Bild bleibt
    ziehen = { x: e.clientX - versatz.x, y: e.clientY - versatz.y, l: r.left - versatz.x, o: r.top - versatz.y, w: r.width, h: r.height };
    el.classList.add('zieht');
  });
  el.addEventListener('pointermove', e => {
    if (!ziehen) return;
    const b = buehne.getBoundingClientRect(), z = ziehen;
    versatz = {
      x: Math.max(b.left - z.l, Math.min(b.right - z.l - z.w, e.clientX - z.x)),
      y: Math.max(b.top - z.o, Math.min(b.bottom - z.o - z.h, e.clientY - z.y)),
    };
    setzen();
  });
  const ende = () => { ziehen = null; el.classList.remove('zieht'); };
  el.addEventListener('pointerup', ende);
  el.addEventListener('pointercancel', ende);
  el.addEventListener('dblclick', zuruecksetzen);
}

// ---------------- iPad: eigene Ziffernfelder statt Bildschirmtastatur (siehe tastenfeld.js)

/** Stellenwerttafel: Stelle k antippen → Ziffern 0 … 9; nach einer Ziffer weiter zur nächsten Stelle */
function zifferTasten(k) {
  const zeigeStelle = j => {
    spalten.forEach((s, i) => s.feld.classList.toggle('aktiv', i === j));
    k = j;
  };
  const d = n => ({ text: String(n), wert: n });
  zeigeTasten(spalten[k].feld, [
    [1, 2, 3, 4, 5].map(d), [6, 7, 8, 9, 0].map(d),
    [{ text: '◀', wert: 'links' }, { text: '▶', wert: 'rechts' }, { text: 'Fertig', wert: 'fertig', breit: 2, klasse: 'ok' }],
  ], w => {
    const felder = spalten.filter(s => !s.el.hidden), i = felder.indexOf(spalten[k]);
    const gehe = j => { zeigeStelle(spalten.indexOf(felder[j])); verschiebeZu(felder[j].feld); };
    if (typeof w === 'number') {
      tafelZiffer(k, w);
      if (i + 1 < felder.length) gehe(i + 1); else fertig();
    } else if (w === 'links' && i > 0) gehe(i - 1);
    else if (w === 'rechts' && i + 1 < felder.length) gehe(i + 1);
    else if (w === 'fertig') schliesseTasten();
  }, () => spalten.forEach(s => s.feld.classList.remove('aktiv')));
  zeigeStelle(k);                            // erst nach zeigeTasten: das schließt ein evtl. offenes Feld
  const fertig = schliesseTasten;
}

/** Eingabefeld: Ziffern, Komma, Minus, Bruchstrich, Leerzeichen (gemischte Zahl), ⌫ und OK */
function eingabeTasten() {
  const feld = $('eingabe');
  let ersetzen = true;                       // erste Taste ersetzt die alte Eingabe (wie markierter Text)
  const t = (text, wert = text, extra = {}) => ({ text, wert, ...extra });
  zeigeTasten(feld, [
    [t('7'), t('8'), t('9'), t('⌫', 'zurueck')],
    [t('4'), t('5'), t('6'), t('/')],
    [t('1'), t('2'), t('3'), t(',')],
    [t('−', '-'), t('0'), t('Leer', ' '), t('OK', 'ok', { klasse: 'ok' })],
  ], w => {
    if (w === 'ok') { schliesseTasten(); $('eingabeForm').requestSubmit(); return; }
    if (w === 'zurueck') feld.value = ersetzen ? '' : feld.value.slice(0, -1);
    else feld.value = (ersetzen ? '' : feld.value) + w;
    ersetzen = false;
    $('fehler').textContent = '';
  }, () => feld.classList.remove('aktiv'));
  feld.classList.add('aktiv');
}

export function initBedienfeld() {
  zahlfeldVerschiebbar();
  if (touch) {
    $('eingabe').readOnly = true;
    $('eingabe').addEventListener('click', eingabeTasten);
  }
  state.beiAenderung(auffrischen);
  $('eingabeForm').addEventListener('submit', e => {
    e.preventDefault();
    const r = lies($('eingabe').value, state.max, state.min, state.strahl ? STRAHL_STELLEN : STELLEN);
    $('fehler').textContent = r.fehler ?? '';
    if (!r.fehler) state.setze(r.n, { bruch: r.bruch ?? null, verdeckt: state.aufKnopfdruck });
  });
  $('zeigenBtn').addEventListener('click', () => state.setze(state.n, { bruch: state.bruch }));
  $('aufKnopfBtn').addEventListener('click', () => { state.aufKnopfdruck = !state.aufKnopfdruck; auffrischen(); });
  $('eingabe').addEventListener('input', () => { $('fehler').textContent = ''; });
  for (const b of document.querySelectorAll('[data-quadrate]')) {
    b.addEventListener('click', () => {
      state.quadrate = Number(b.dataset.quadrate);
      state.setze(state.n, { bruch: state.bruch });                 // ggf. auf die neue Höchstzahl begrenzen
      Quadrat.uebersicht(true);
    });
  }
  for (const b of document.querySelectorAll('[data-einteilung]')) {
    b.addEventListener('click', () => { state.einteilung = b.dataset.einteilung; state.setze(state.n, { bruch: state.bruch }); });
  }
  $('nullBtn').addEventListener('click', () => { state.setze(0); $('eingabe').value = ''; $('fehler').textContent = ''; });
  for (const b of document.querySelectorAll('[data-darstellung]')) {
    b.addEventListener('click', () => {
      state.darstellung = b.dataset.darstellung;
      $('fehler').textContent = '';
      state.setze(state.n, { bruch: state.bruch });   // ggf. auf den Bereich der Darstellung begrenzen
    });
  }
  $('feinerBtn').addEventListener('click', () => { Strahl.verfeinern(1); auffrischen(); });
  $('groeberBtn').addEventListener('click', () => { Strahl.verfeinern(-1); auffrischen(); });
  $('antippenBtn').addEventListener('click', () => { state.antippen = !state.antippen; auffrischen(); });
  $('streckeBtn').addEventListener('click', () => { state.zeigeStrecke = !state.zeigeStrecke; auffrischen(); });
  $('tafelBtn').addEventListener('click', () => { state.zeigeTafel = !state.zeigeTafel; auffrischen(); });
  $('zoomIn').addEventListener('click', () => ansicht().zoom(2));
  $('zoomOut').addEventListener('click', () => ansicht().zoom(0.5));
  $('uebersichtBtn').addEventListener('click', () => ansicht().uebersicht());
  $('lupeBtn').addEventListener('click', () => { state.lupe = !state.lupe; sichtbarkeit(true); });
  auffrischen();
}
