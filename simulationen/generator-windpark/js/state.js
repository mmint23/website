// ------------------------------------------------------------------
// Zustand der Simulation (wird vom Bedienfeld geändert und von Physik und Darstellung gelesen)
// ------------------------------------------------------------------
export const state = {
  view: 'park',       // Ansicht: 'park' (Windpark), 'room' (Wohnzimmer im Dorf) oder 'kraftwerk' (Blick ins Kohlekraftwerk)
  wind: 8,            // Windgeschwindigkeit im Windpark in m/s
  time: 12,           // Uhrzeit im Windpark in Stunden (Sonnenstand, abends Licht im Dorf; tageszeit.js)
  kraftwerk: false,   // Kohlekraftwerk eingeblendet (Knopf im Bedienfeld)
};

// Wind und Uhrzeit aus der Adresse übernehmen (?wind=…&zeit=…) – so sieht der Windpark beim Zurückkommen vom
// Generator-Modell bzw. Innenpolgenerator wieder so aus wie vorher (uebergang.js gibt beides mit)
{
  const parameter = new URLSearchParams(globalThis.location?.search ?? '');
  const zahl = (name, min, max) => {
    const wert = Number(parameter.get(name));
    return parameter.has(name) && Number.isFinite(wert) ? Math.min(max, Math.max(min, wert)) : null;
  };
  state.wind = zahl('wind', 0, 20) ?? state.wind;
  state.time = zahl('zeit', 0, 24) ?? state.time;
}

// Kohlekraftwerk: ?kraftwerk=1 in der Adresse, sonst wie zuletzt in diesem Tab (bleibt so beim Zurückkommen von einer
// anderen Simulation, deren „Zurück zum Windpark“ nur Wind und Uhrzeit mitgibt)
export const KRAFTWERK_MERKEN = 'generator-windpark.kraftwerk';
{
  const parameter = new URLSearchParams(globalThis.location?.search ?? '');
  try {
    state.kraftwerk = parameter.has('kraftwerk') ? parameter.get('kraftwerk') !== '0'
      : globalThis.sessionStorage?.getItem(KRAFTWERK_MERKEN) === '1';
  } catch { /* ohne Speicher: ausgeblendet */ }
}
