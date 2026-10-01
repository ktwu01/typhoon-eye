const PREFERENCE_KEY = 'typhoon-eye-audio';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => min + Math.random() * (max - min);

export function createStormAudio(spoutPositions) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let volume = 0.65;
  let muted = false;
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCE_KEY));
    if (typeof saved?.volume === 'number' && Number.isFinite(saved.volume)) volume = clamp(saved.volume, 0, 1);
    muted = saved?.muted === true;
  } catch {}

  let context, master, compressor, white, brown, wind, sea, wall, funnels;
  let enabled = false;
  let failed = false;
  let disposed = false;
  let lastUpdate = -1;
  let nextLull = 6;
  let lullStart = -100;
  let lullDuration = 4;
  let lastImpact = -10;
  let previousDescent = 1;
  let settings = { wind: 1, spin: 1, spouts: 3, lightning: true, sway: true };
  let listener = { x: 0, y: 16, z: 0, rightX: 1, rightZ: 0 };
  const subscribers = new Set();
  const loops = [];
  const voices = new Set();
  const thunder = [];

  function getState() {
    const status = !AudioContext ? 'unavailable' : failed ? 'error' : !enabled ? 'idle'
      : context?.state === 'running' ? 'running' : 'suspended';
    return { status, enabled, muted, volume };
  }

  function notify() {
    subscribers.forEach((fn) => fn(getState()));
  }

  function save() {
    try { localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ volume, muted })); } catch {}
  }

  function smooth(param, value, duration = 0.15) {
    param.setTargetAtTime(value, context.currentTime, duration);
  }

  function applyVolume() {
    if (master) smooth(master.gain, muted ? 0 : volume * 0.8, 0.06);
  }

  function noise(isBrown) {
    const buffer = context.createBuffer(1, context.sampleRate * 8, context.sampleRate);
    const data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = random(-1, 1);
      low = (low + 0.025 * sample) / 1.025;
      data[i] = isBrown ? low * 4 : sample;
    }
    // Fade the buffer seam so the low-frequency loop cannot click.
    const fade = Math.floor(context.sampleRate * 0.04);
    for (let i = 0; i < fade; i++) {
      data[i] *= i / fade;
      data[data.length - 1 - i] *= i / fade;
    }
    return buffer;
  }

  function route(source, type, frequency, q = 0.7) {
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = context.createGain();
    gain.gain.value = 0;
    const pan = context.createStereoPanner();
    source.connect(filter).connect(gain).connect(pan).connect(compressor);
    return { source, filter, gain, pan };
  }

  function loop(buffer, type, frequency, q) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = random(0.85, 1.15);
    const voice = route(source, type, frequency, q);
    source.start(0, random(0, 7));
    loops.push(voice);
    return voice;
  }

  function distance(position) {
    return Math.hypot(position.x - listener.x, position.y - listener.y, position.z - listener.z);
  }

  function panAt(position) {
    const dx = position.x - listener.x, dz = position.z - listener.z;
    return clamp((dx * listener.rightX + dz * listener.rightZ) / Math.max(1, Math.hypot(dx, dz)), -1, 1);
  }

  function transient({ buffer, frequency, endFrequency = frequency, gain, duration, attack = 0.03,
    delay = 0, pan = 0, position, kind = 'boat', tone = false }) {
    const start = context.currentTime + delay;
    const source = tone ? context.createOscillator() : context.createBufferSource();
    if (tone) {
      source.type = 'sawtooth';
      source.frequency.setValueAtTime(frequency, start);
      source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    } else {
      source.buffer = buffer;
      source.loop = true;
    }
    const voice = route(source, 'lowpass', tone ? 650 : frequency);
    if (!tone) voice.filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    voice.pan.pan.value = position ? panAt(position) : pan;
    voice.gain.gain.setValueAtTime(0, start);
    voice.gain.gain.linearRampToValueAtTime(gain, start + attack);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    Object.assign(voice, { position, kind });
    voices.add(voice);
    source.onended = () => {
      Object.values(voice).forEach((node) => node?.disconnect?.());
      voices.delete(voice);
    };
    if (tone) source.start(start);
    else source.start(start, random(0, 7));
    source.stop(start + duration + 0.05);
  }

  function creak(delay = 0, strength = 1) {
    const pan = random(-0.75, 0.75);
    const pitch = random(90, 145);
    transient({ tone: true, frequency: pitch, endFrequency: pitch * random(0.6, 0.85),
      gain: 0.045 * strength, duration: random(1.4, 2.8), attack: 0.3, delay, pan });
    transient({ buffer: white, frequency: 1250, endFrequency: 380, gain: 0.09 * strength,
      duration: 0.22, attack: 0.008, delay: delay + 0.4, pan });
  }

  function hush(kind) {
    for (const voice of voices) {
      if (kind && voice.kind !== kind) continue;
      if (voice.stopping) continue;
      voice.stopping = true;
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      smooth(voice.gain.gain, 0, 0.025);
      voice.source.stop(context.currentTime + 0.15);
    }
  }

  function build() {
    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 15;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.3;
    master = context.createGain();
    master.gain.value = 0;
    compressor.connect(master).connect(context.destination);
    white = noise(false);
    brown = noise(true);
    wall = loop(brown, 'lowpass', 190);
    wind = loop(white, 'bandpass', 620, 0.6);
    sea = loop(white, 'lowpass', 1100);
    funnels = [];
  }

  // Sound can be switched on from the loading screen, before the waterspouts exist.
  function addFunnels() {
    for (let i = funnels.length; i < spoutPositions.length; i++) {
      funnels.push({
        position: spoutPositions[i],
        body: loop(brown, 'bandpass', 150 + i * 33, 1.3),
        hiss: loop(white, 'bandpass', 800 + i * 180, 0.9),
      });
    }
  }

  async function enable() {
    if (!AudioContext || disposed) return;
    try {
      if (!context) {
        context = new AudioContext();
        context.onstatechange = notify;
        build();
      }
      enabled = true;
      failed = false;
      applyVolume();
      // Autoplay may leave resume() pending until a gesture; controls must stay usable.
      notify();
      await context.resume();
      if (document.hidden) await context.suspend();
    } catch (error) {
      failed = error.name !== 'NotAllowedError';
    }
    notify();
  }

  function update(params, camera, sceneTime) {
    settings = params;
    const matrix = camera.matrixWorld.elements;
    listener = { x: camera.position.x, y: camera.position.y, z: camera.position.z,
      rightX: matrix[0], rightZ: matrix[2] };
    if (!enabled || context.state !== 'running') return;
    if (funnels.length < spoutPositions.length) addFunnels();
    const now = context.currentTime;
    if (now - lastUpdate < 0.05) return;
    lastUpdate = now;
    const windStrength = Number.isFinite(params.wind) ? clamp(params.wind, 0.4, 1.6) : 1;
    const spin = Number.isFinite(params.spin) ? clamp(params.spin, 0, 4) : 1;
    if (now > nextLull) {
      lullStart = now;
      lullDuration = random(3, 5);
      nextLull = now + random(13, 22);
      if (!muted && params.sway) creak(lullDuration * 0.4, 0.8);
    }
    const progress = clamp((now - lullStart) / lullDuration, 0, 1);
    const tension = 1 - 0.76 * Math.sin(progress * Math.PI) ** 2;
    const gust = tension * (0.7 + 0.18 * Math.sin(now * 0.41) + 0.12 * Math.sin(now * 1.13));
    smooth(wall.gain.gain, 0.28 + windStrength * 0.09, 0.5);
    smooth(wind.gain.gain, (0.16 + 0.3 * gust) * windStrength);
    smooth(wind.filter.frequency, 350 + 850 * gust * windStrength, 0.3);
    smooth(wind.pan.pan, Math.sin(now * 0.13) * 0.3, 0.5);
    smooth(sea.gain.gain, (0.16 + 0.12 * (0.5 + 0.5 * Math.sin(sceneTime * 0.55))) * windStrength);

    funnels.forEach(({ position, body, hiss }, i) => {
      const active = i < params.spouts;
      const pulse = 0.65 + 0.22 * Math.sin(now * (2.1 + spin * 1.7) + i * 2)
        + 0.13 * Math.sin(now * 7.3 + i);
      const forming = i === 2 ? 0.45 + 0.3 * Math.sin(now * 0.7) ** 2 : 1;
      const power = active ? tension * pulse * forming / (1 + distance(position) / 3500) : 0;
      smooth(body.gain.gain, power * 1.1, 0.08);
      smooth(hiss.gain.gain, power * 0.19, 0.08);
      smooth(body.pan.pan, panAt(position), 0.08);
      smooth(hiss.pan.pan, panAt(position), 0.08);
    });

    // This is the same slow heave phase used by the deck camera.
    const descent = Math.cos(sceneTime * 0.55);
    if (!muted && params.sway && previousDescent > -0.65 && descent <= -0.65 && now - lastImpact > 4) {
      lastImpact = now;
      transient({ buffer: brown, frequency: 420, endFrequency: 65, gain: 1.25 * windStrength,
        duration: 1.8, attack: 0.025, pan: random(-0.4, 0.4) });
      transient({ buffer: white, frequency: 1700, endFrequency: 350, gain: 0.42 * windStrength,
        duration: 2.5, attack: 0.12, delay: 0.13, pan: random(-0.6, 0.6) });
      creak(0.45, windStrength);
    }
    previousDescent = descent;
    if (!params.sway) hush('boat');
    if (!params.lightning) {
      thunder.length = 0;
      hush('thunder');
    }
    for (let i = thunder.length - 1; i >= 0; i--) {
      const event = thunder[i];
      if (event.at > now) continue;
      thunder.splice(i, 1);
      if (muted) continue;
      transient({ buffer: brown, frequency: 320, endFrequency: 90, gain: 0.85,
        duration: random(6, 9), attack: 0.35, position: event.position, kind: 'thunder' });
      transient({ buffer: white, frequency: 550, endFrequency: 140, gain: 0.22,
        duration: 4, attack: 0.15, delay: 0.2, position: event.position, kind: 'thunder' });
    }
    for (const voice of voices) {
      if (voice.position) smooth(voice.pan.pan, panAt(voice.position));
    }
  }

  function strike(position) {
    if (!enabled || muted || context.state !== 'running' || !settings.lightning) return;
    // The eye spans kilometres; thunder must arrive well after its flash.
    if (thunder.length < 24) thunder.push({ at: context.currentTime + distance(position) / 343,
      position: { x: position.x, y: position.y, z: position.z } });
  }

  async function visibilityChanged() {
    if (!context || !enabled || disposed) return;
    thunder.length = 0;
    hush();
    try {
      if (document.hidden) await context.suspend();
      else await context.resume();
    } catch {}
    notify();
  }
  document.addEventListener('visibilitychange', visibilityChanged);

  function dispose() {
    disposed = true;
    document.removeEventListener('visibilitychange', visibilityChanged);
    if (context) {
      context.onstatechange = null;
      context.close();
    }
    subscribers.clear();
  }

  return {
    enable, update, strike, getState, dispose,
    setMuted(value) {
      muted = Boolean(value);
      if (muted) { thunder.length = 0; if (context) hush(); }
      applyVolume();
      save();
      notify();
    },
    setVolume(value) {
      if (!Number.isFinite(value)) return;
      volume = clamp(value, 0, 1);
      applyVolume();
      save();
      notify();
    },
    subscribe(callback) {
      subscribers.add(callback);
      callback(getState());
      return () => subscribers.delete(callback);
    },
  };
}
