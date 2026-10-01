export function createAudioControls(audio) {
  const panel = document.createElement('section');
  panel.className = 'audio-controls';
  panel.lang = 'en';
  panel.setAttribute('aria-label', 'Storm audio');
  panel.innerHTML = `
    <button class="audio-toggle" type="button">Enable sound</button>
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
  let starting = false;
  let failed = false;

  function render() {
    const state = audio.getState();
    const unavailable = state.status === 'unavailable';
    const hasError = failed || state.status === 'error';
    button.disabled = starting || unavailable;
    button.setAttribute('aria-busy', String(starting));
    button.textContent = starting ? 'Starting sound…'
      : unavailable ? 'Sound unavailable'
        : hasError ? 'Retry sound'
          : !state.enabled ? 'Enable sound'
            : state.status === 'suspended' ? 'Resume sound'
              : state.muted ? 'Unmute sound' : 'Mute sound';
    const percent = Math.round(state.volume * 100);
    volume.value = String(percent);
    volume.disabled = unavailable;
    volume.setAttribute('aria-valuetext', `${percent}%`);
    output.value = `${percent}%`;
    status.textContent = unavailable ? 'Try a browser with audio support.'
      : hasError ? 'Sound couldn’t start. Try again.' : '';
    status.hidden = !status.textContent;
  }

  async function toggle() {
    const state = audio.getState();
    if (starting) return;
    if (!state.enabled || state.status !== 'running' || failed) {
      starting = true;
      failed = false;
      render();
      try {
        if (!state.enabled) audio.setMuted(false);
        await audio.enable();
      } catch {
        failed = true;
      } finally {
        starting = false;
        render();
      }
    } else {
      audio.setMuted(!state.muted);
    }
  }

  function changeVolume() {
    audio.setVolume(Number(volume.value) / 100);
  }

  button.addEventListener('click', toggle);
  volume.addEventListener('input', changeVolume);
  const unsubscribe = audio.subscribe(render);
  render();

  return {
    element: panel,
    dispose() {
      unsubscribe();
      button.removeEventListener('click', toggle);
      volume.removeEventListener('input', changeVolume);
      panel.remove();
    },
  };
}
