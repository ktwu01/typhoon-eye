// Flashes buried inside the eyewall: a few rapid flickers, then a random pause.
export function createLightning(shared) {
  const flash = shared.uFlash.value;
  const center = shared.uStormCenter.value;
  let wait = 3;
  let pulses = [];
  let clock = 0;

  function strike() {
    const radius = shared.uEyeRadius.value + 1500 + Math.random() * 2500;
    // Bias strikes toward the stretch of wall facing the default view (south of the storm center).
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    flash.x = center.x + Math.cos(angle) * radius;
    flash.y = 1500 + Math.random() * 7000;
    flash.z = center.z + Math.sin(angle) * radius;
    pulses = [];
    let t = 0;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      pulses.push({ start: t, len: 0.05 + Math.random() * 0.08, power: 0.6 + Math.random() * 0.8 });
      t += 0.07 + Math.random() * 0.15;
    }
    clock = 0;
  }

  function update(dt, enabled) {
    clock += dt;
    let w = 0;
    for (const p of pulses) {
      const k = (clock - p.start) / p.len;
      if (k >= 0 && k < 3) w = Math.max(w, p.power * Math.exp(-k * 1.6));
    }
    flash.w = w;
    if (!enabled) return;
    wait -= dt;
    if (wait <= 0) {
      strike();
      wait = 2 + Math.random() * 7;
    }
  }

  return { update };
}
