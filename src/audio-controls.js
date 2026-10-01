export function createAudioControls(audio) {
  const panel = document.createElement('section');
  panel.className = 'audio-controls';
  panel.lang = 'en';
  panel.setAttribute('aria-label', 'Storm audio');
  panel.innerHTML = `
    <button class="audio-toggle" type="button">Mute sound</button>
    <label class="audio-volume">
      <span>Volume</span>
      <input type="range" min="0" max="100" step="1" aria-label="Volume" />
      <output></output>
    </label>
    <p class="audio-status" role="status" aria-live="polite" hidden></p>
  `;
  document.body.appendChild(panel);

  const button = panel.querySelector('button');
  const volume = panel.querySelector('input');
  const output = panel.querySelector('output');
  const status = panel.querySelector('.audio-status');
  function render() {
    const state = audio.getState();
    const unavailable = state.status === 'unavailable';
    const hasError = state.status === 'error';
    button.disabled = unavailable;
    button.textContent = unavailable ? 'Sound unavailable'
        : hasError ? 'Retry sound'
          : state.muted ? 'Unmute sound' : 'Mute sound';
    const percent = Math.round(state.volume * 100);
    volume.value = String(percent);
    volume.disabled = unavailable;
    volume.setAttribute('aria-valuetext', `${percent}%`);
    output.value = `${percent}%`;
    status.textContent = unavailable ? 'Try a browser with audio support.'
      : hasError ? 'Sound couldn’t start. Try again.'
        : !state.muted && state.status === 'suspended' ? 'Click the scene or press a key for sound.' : '';
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
  render();

  return {
    element: panel,
    dispose() {
      unsubscribe();
      button.removeEventListener('click', toggle);
      volume.removeEventListener('input', changeVolume);
      document.removeEventListener('pointerdown', resumeFromGesture, true);
      document.removeEventListener('pointerup', resumeFromGesture, true);
      document.removeEventListener('keydown', resumeFromGesture, true);
      panel.remove();
    },
  };
}
