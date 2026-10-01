import GUI from 'lil-gui';
import { LANGUAGES, getLang, onLangChange, setLang, t } from './i18n.js';

export const params = {
  timeOfDay: 0.5,
  sunAzimuth: -80,
  wind: 1.0,
  spin: 1.0,
  spouts: 3,
  lowClouds: 0.15,
  lightning: true,
  sway: true,
  exposure: 0.9,
};

// Presets can be shared as URL query parameters, e.g. ?timeOfDay=0.8&spouts=1
function readUrlPreset() {
  const q = new URLSearchParams(window.location.search);
  for (const key of Object.keys(params)) {
    if (!q.has(key)) continue;
    const raw = q.get(key);
    params[key] = typeof params[key] === 'boolean' ? raw !== 'false' && raw !== '0' : Number(raw);
  }
}

export function createGui(onChange) {
  readUrlPreset();
  const gui = new GUI({ title: t('title') });
  const ui = { lang: getLang() };
  const langControl = gui.add(ui, 'lang', LANGUAGES).onChange(setLang);
  const controls = {
    timeOfDay: gui.add(params, 'timeOfDay', 0, 1, 0.01),
    sunAzimuth: gui.add(params, 'sunAzimuth', -180, 180, 1),
    wind: gui.add(params, 'wind', 0.4, 1.6, 0.01),
    spin: gui.add(params, 'spin', 0, 4, 0.05),
    spouts: gui.add(params, 'spouts', 0, 3, 1),
    lowClouds: gui.add(params, 'lowClouds', 0, 0.8, 0.01),
    lightning: gui.add(params, 'lightning'),
    sway: gui.add(params, 'sway'),
    exposure: gui.add(params, 'exposure', 0.4, 2, 0.01),
  };
  for (const control of Object.values(controls)) control.onChange(onChange);

  function applyLabels() {
    gui.title(t('title'));
    langControl.name(t('language'));
    for (const [key, control] of Object.entries(controls)) control.name(t(key));
  }
  applyLabels();
  onLangChange(applyLabels);

  if (window.innerWidth < 700 || new URLSearchParams(window.location.search).has('hideControls')) gui.close();
  return gui;
}
