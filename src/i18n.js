const STRINGS = {
  en: {
    title: 'Typhoon Eye · Waterspouts',
    loading: 'The storm is forming…',
    ready: 'The storm is ready.',
    soundPrompt: 'Play with sound?',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    recommended: 'Recommended',
    language: 'Language',
    timeOfDay: 'Time (noon → dusk)',
    sunAzimuth: 'Sun direction',
    wind: 'Wind & waves',
    spin: 'Storm spin',
    spouts: 'Waterspouts',
    lowClouds: 'Low clouds',
    lightning: 'Lightning',
    sway: 'Ship sway',
    exposure: 'Exposure',
    audioPanel: 'Storm audio',
    sound: 'Sound',
    volume: 'Volume',
    statusUnavailable: 'Try a browser with audio support.',
    statusError: 'Sound couldn’t start. Turn it off and on to try again.',
    statusSuspended: 'Click the scene or press a key for sound.',
  },
  zh: {
    title: '台风眼 · 龙吸水',
    loading: '风暴正在成形…',
    ready: '风暴已就绪。',
    soundPrompt: '要开启声音吗？',
    soundOn: '开启声音',
    soundOff: '关闭声音',
    recommended: '推荐',
    language: '语言',
    timeOfDay: '时间 (正午 → 黄昏)',
    sunAzimuth: '太阳方位',
    wind: '风浪',
    spin: '风暴旋转',
    spouts: '龙吸水数量',
    lowClouds: '低云',
    lightning: '闪电',
    sway: '船身摇晃',
    exposure: '曝光',
    audioPanel: '风暴音效',
    sound: '声音',
    volume: '音量',
    statusUnavailable: '请换用支持音频的浏览器。',
    statusError: '声音没能启动，关掉再打开即可重试。',
    statusSuspended: '点击画面或按任意键开启声音。',
  },
};

export const LANGUAGES = { English: 'en', 中文: 'zh' };

const STORAGE_KEY = 'typhoon-eye.lang';
const listeners = new Set();

function initialLang() {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl in STRINGS) return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved in STRINGS) return saved;
  } catch {}
  return 'en';
}

let lang = initialLang();

export function getLang() {
  return lang;
}

export function t(key) {
  return STRINGS[lang][key];
}

function applyDocument() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
}

export function setLang(next) {
  if (!(next in STRINGS) || next === lang) return;
  lang = next;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  applyDocument();
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

applyDocument();
