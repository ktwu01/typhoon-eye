import { onLangChange, t } from './i18n.js';

export function createAudioControls(audio, gui) {
  const folder = gui.addFolder(t('audioPanel'));
  // Keep sound right under the language picker so muting is one click away.
  gui.$children.insertBefore(folder.domElement, gui.$children.children[1]);

  const ui = { on: !audio.getState().muted, volume: Math.round(audio.getState().volume * 100) };
  const soundControl = folder.add(ui, 'on').onChange(setOn);
  const volumeControl = folder.add(ui, 'volume', 0, 100, 1).onChange((value) => audio.setVolume(value / 100));

  const status = document.createElement('p');
  status.className = 'audio-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  folder.$children.appendChild(status);

  function setOn(on) {
    audio.setMuted(!on);
    if (on) void audio.enable();
  }

  let lastKey = '';
  function render() {
    const state = audio.getState();
    const key = [state.status, state.muted, state.volume].join('|');
    if (key === lastKey) return;
    lastKey = key;
    const unavailable = state.status === 'unavailable';
    ui.on = !state.muted;
    ui.volume = Math.round(state.volume * 100);
    soundControl.updateDisplay().enable(!unavailable);
    volumeControl.updateDisplay().enable(!unavailable);
    status.textContent = unavailable ? t('statusUnavailable')
      : state.status === 'error' ? t('statusError')
        : !state.muted && state.status === 'suspended' ? t('statusSuspended') : '';
    status.hidden = !status.textContent;
  }

  function applyLabels() {
    folder.title(t('audioPanel'));
    soundControl.name(t('sound'));
    volumeControl.name(t('volume'));
    lastKey = '';
    render();
  }

  function resumeFromGesture(event) {
    if (gui.domElement.contains(event.target)) return;
    const state = audio.getState();
    if (!state.muted && state.status === 'suspended') void audio.enable();
  }

  document.addEventListener('pointerdown', resumeFromGesture, true);
  document.addEventListener('pointerup', resumeFromGesture, true);
  document.addEventListener('keydown', resumeFromGesture, true);
  const unsubscribe = audio.subscribe(render);
  const unsubscribeLang = onLangChange(applyLabels);
  applyLabels();

  return {
    folder,
    dispose() {
      unsubscribe();
      unsubscribeLang();
      document.removeEventListener('pointerdown', resumeFromGesture, true);
      document.removeEventListener('pointerup', resumeFromGesture, true);
      document.removeEventListener('keydown', resumeFromGesture, true);
      folder.destroy();
    },
  };
}
