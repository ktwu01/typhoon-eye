import { t } from './i18n.js';

// The loading screen stays up until the scene is ready and the viewer has picked sound on or off.
export function createIntro(audio) {
  const overlay = document.getElementById('loading');
  const status = document.getElementById('loading-status');
  const buttons = overlay.querySelectorAll('[data-sound]');
  let chosen = false;
  let isReady = false;

  function finish() {
    if (!chosen || !isReady) return;
    overlay.classList.add('done');
    overlay.setAttribute('aria-hidden', 'true');
    for (const button of buttons) button.tabIndex = -1;
  }

  function choose(event) {
    const on = event.currentTarget.dataset.sound === 'on';
    audio.setMuted(!on);
    // Starting audio inside the click is what lets browsers allow playback.
    if (on) void audio.enable();
    for (const button of buttons) button.setAttribute('aria-pressed', String(button === event.currentTarget));
    chosen = true;
    finish();
  }

  for (const button of buttons) button.addEventListener('click', choose);
  buttons[audio.getState().muted ? 1 : 0].focus();

  return {
    ready() {
      isReady = true;
      status.dataset.i18n = 'ready';
      status.textContent = t('ready');
      overlay.classList.add('ready');
      finish();
    },
  };
}
