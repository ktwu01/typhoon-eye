import { onLangChange, t } from './i18n.js';

export function createAudioControls(audio, container) {
  const panel = document.createElement('section');
  panel.className = 'audio-controls';
  panel.innerHTML = `
    <button class="audio-toggle" type="button"></button>
    <label class="audio-volume">
      <span></span>
      <input type="range" min="0" max="100" step="1" />
      <output></output>
    </label>
    <p class="audio-status" role="status" aria-live="polite" hidden></p>
  `;
  container.appendChild(panel);

  const button = panel.querySelector('button');
  const volume = panel.querySelector('input');
  const output = panel.querySelector('output');
  const status = panel.querySelector('.audio-status');
  const volumeLabel = panel.querySelector('.audio-volume span');
  function render() {
    panel.setAttribute('aria-label', t('audioPanel'));
    volumeLabel.textContent = t('volume');
    volume.setAttribute('aria-label', t('volume'));
    const state = audio.getState();
    const unavailable = state.status === 'unavailable';
    const hasError = state.status === 'error';
    button.disabled = unavailable;
    button.textContent = unavailable ? t('unavailable')
        : hasError ? t('retry')
          : state.muted ? t('unmute') : t('mute');
    const percent = Math.round(state.volume * 100);
    volume.value = String(percent);
    volume.disabled = unavailable;
    volume.setAttribute('aria-valuetext', `${percent}%`);
    output.value = `${percent}%`;
    status.textContent = unavailable ? t('statusUnavailable')
      : hasError ? t('statusError')
        : !state.muted && state.status === 'suspended' ? t('statusSuspended') : '';
    status.hidden = !status.textContent;
  }

  function toggle() {
    const state = audio.getState();
    if (state.status === 'error') {
      void audio.enable();
      return;
    }
    audio.setMuted(!state.muted);
    if (state.muted) void audio.enable();
  }

  function resumeFromGesture(event) {
    if (panel.contains(event.target)) return;
    const state = audio.getState();
    if (!state.muted && state.status === 'suspended') void audio.enable();
  }

  function changeVolume() {
    audio.setVolume(Number(volume.value) / 100);
  }

  button.addEventListener('click', toggle);
  volume.addEventListener('input', changeVolume);
  document.addEventListener('pointerdown', resumeFromGesture, true);
  document.addEventListener('pointerup', resumeFromGesture, true);
  document.addEventListener('keydown', resumeFromGesture, true);
  const unsubscribe = audio.subscribe(render);
  const unsubscribeLang = onLangChange(render);
  render();

  return {
    element: panel,
    dispose() {
      unsubscribe();
      unsubscribeLang();
      button.removeEventListener('click', toggle);
      volume.removeEventListener('input', changeVolume);
      document.removeEventListener('pointerdown', resumeFromGesture, true);
      document.removeEventListener('pointerup', resumeFromGesture, true);
      document.removeEventListener('keydown', resumeFromGesture, true);
      panel.remove();
    },
  };
}
