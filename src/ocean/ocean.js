import * as THREE from 'three';
import common from '../glsl/common.glsl?raw';
import gerstner from './gerstner.glsl?raw';
import vert from './ocean.vert.glsl?raw';
import frag from './ocean.frag.glsl?raw';

// Inside a typhoon eye, swells arrive from several directions at once and pile into
// steep, confused peaks; three swell trains plus a local wind sea reproduce that.
const TRAINS = [
  { angle: 0.35, lengths: [150, 96, 58], amps: [2.3, 1.4, 0.8] },
  { angle: 2.45, lengths: [128, 74, 44], amps: [1.9, 1.1, 0.6] },
  { angle: 4.35, lengths: [108, 61, 33], amps: [1.6, 0.9, 0.45] },
  { angle: 1.1, lengths: [22, 14, 8.5], amps: [0.32, 0.18, 0.1] },
];
const MAX_WIND = 1.6;
const STEEPNESS = 0.85;

function buildWaves() {
  const a = [], b = [];
  const count = TRAINS.reduce((n, t) => n + t.lengths.length, 0);
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const train of TRAINS) {
    train.lengths.forEach((L, i) => {
      const ang = train.angle + (rand() - 0.5) * 0.6;
      const k = (2 * Math.PI) / L;
      const A = train.amps[i];
      const omega = Math.sqrt(9.81 * k);
      const Q = Math.min(1, STEEPNESS / (k * A * count * MAX_WIND));
      a.push(new THREE.Vector4(Math.cos(ang), Math.sin(ang), k, A));
      b.push(new THREE.Vector4(omega, Q, rand() * Math.PI * 2, 0));
    });
  }
  return { a, b };
}

export function createOcean(shared, skyTexture) {
  const waves = buildWaves();
  const uniforms = {
    ...shared,
    uWaveA: { value: waves.a },
    uWaveB: { value: waves.b },
    uOrigin: { value: new THREE.Vector3() },
    uGridSize: { value: 40000 },
    tSky: skyTexture,
    uResolution: { value: new THREE.Vector2(1, 1) },
    uViewProj: { value: new THREE.Matrix4() },
    uWindDir: { value: new THREE.Vector2(Math.cos(1.1), Math.sin(1.1)) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: common + gerstner + vert,
    fragmentShader: common + gerstner + frag,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 640, 640), material);
  mesh.frustumCulled = false;

  function update(camera) {
    uniforms.uOrigin.value.copy(camera.position);
    uniforms.uViewProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  }

  function setSize(width, height) {
    uniforms.uResolution.value.set(width, height);
  }

  return { mesh, update, setSize };
}
