import GUI from 'lil-gui';

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
  const gui = new GUI({ title: '台风眼 · 龙吸水' });
  gui.add(params, 'timeOfDay', 0, 1, 0.01).name('时间 (正午 → 黄昏)').onChange(onChange);
  gui.add(params, 'sunAzimuth', -180, 180, 1).name('太阳方位').onChange(onChange);
  gui.add(params, 'wind', 0.4, 1.6, 0.01).name('风浪').onChange(onChange);
  gui.add(params, 'spin', 0, 4, 0.05).name('风暴旋转').onChange(onChange);
  gui.add(params, 'spouts', 0, 3, 1).name('龙吸水数量').onChange(onChange);
  gui.add(params, 'lowClouds', 0, 0.8, 0.01).name('低云').onChange(onChange);
  gui.add(params, 'lightning').name('闪电').onChange(onChange);
  gui.add(params, 'sway').name('船身摇晃').onChange(onChange);
  gui.add(params, 'exposure', 0.4, 2, 0.01).name('曝光').onChange(onChange);
  if (window.innerWidth < 700 || new URLSearchParams(window.location.search).has('hideControls')) gui.close();
  return gui;
}
