import * as THREE from 'three';

// Keyframes along the "time of day" slider: noon → afternoon → golden hour → dusk.
const KEYS = [
  { t: 0.0, elev: 62, sun: [1.0, 0.96, 0.9, 5.0], zenith: [0.05, 0.16, 0.45], horizon: [0.46, 0.56, 0.68] },
  { t: 0.35, elev: 30, sun: [1.0, 0.9, 0.78, 4.6], zenith: [0.04, 0.13, 0.38], horizon: [0.42, 0.5, 0.6] },
  { t: 0.7, elev: 9, sun: [1.0, 0.6, 0.3, 3.8], zenith: [0.035, 0.08, 0.24], horizon: [0.55, 0.42, 0.36] },
  { t: 1.0, elev: 1.5, sun: [1.0, 0.33, 0.12, 2.2], zenith: [0.012, 0.025, 0.08], horizon: [0.28, 0.15, 0.12] },
];

const lerp = (a, b, t) => a + (b - a) * t;
const lerpArr = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

export function createSharedUniforms(noiseTexture) {
  return {
    uNoise: { value: noiseTexture },
    uTime: { value: 0 },
    uWind: { value: 1 },
    uSpin: { value: 0.012 },
    uEyeRadius: { value: 15000 },
    uStormCenter: { value: new THREE.Vector3(0, 0, 7000) },
    uSunDir: { value: new THREE.Vector3() },
    uSunColor: { value: new THREE.Color() },
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uFlash: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
}

export function applyTimeOfDay(shared, timeOfDay, sunAzimuthDeg) {
  let i = 0;
  while (i < KEYS.length - 2 && timeOfDay > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const f = THREE.MathUtils.clamp((timeOfDay - a.t) / (b.t - a.t), 0, 1);

  const elev = THREE.MathUtils.degToRad(lerp(a.elev, b.elev, f));
  const az = THREE.MathUtils.degToRad(sunAzimuthDeg);
  // Azimuth 0 puts the sun straight behind the default view, lighting the eyewall face.
  shared.uSunDir.value.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));

  const sun = lerpArr(a.sun, b.sun, f);
  shared.uSunColor.value.setRGB(sun[0] * sun[3], sun[1] * sun[3], sun[2] * sun[3]);
  shared.uZenith.value.setRGB(...lerpArr(a.zenith, b.zenith, f));
  shared.uHorizon.value.setRGB(...lerpArr(a.horizon, b.horizon, f));
}
