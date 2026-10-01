import * as THREE from 'three';
import common from '../glsl/common.glsl?raw';
import frag from './spout.frag.glsl?raw';

const vert = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// The first spout is the hero: fully formed, close, rope-like. The others sit deeper in the
// scene; the last is still forming, with a short funnel and a spray ring on the water.
const SPOUTS = [
  { x: -430, z: -2100, height: 640, scale: 1.0, reach: 0.0, seed: 0.0, lean: [170, 40], bow: [-70, 25] },
  { x: 1500, z: -3900, height: 610, scale: 0.85, reach: 0.0, seed: 2.7, lean: [-110, 50], bow: [55, -20] },
  { x: -2600, z: -3300, height: 660, scale: 0.8, reach: 0.55, seed: 5.1, lean: [60, -30], bow: [-30, 10] },
];

export function createSpouts(shared, skyTexture, resolution) {
  const group = new THREE.Group();
  const meshes = SPOUTS.map((cfg) => {
    const half = 300 * cfg.scale + Math.hypot(...cfg.lean) * 0.6 + 60;
    const geo = new THREE.BoxGeometry(half * 2, cfg.height, half * 2);
    geo.translate(0, cfg.height / 2, 0);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        tSky: skyTexture,
        uResolution: resolution,
        uBase: { value: new THREE.Vector3(cfg.x, 0, cfg.z) },
        uHeight: { value: cfg.height },
        uHalf: { value: half },
        uScale: { value: cfg.scale },
        uReach: { value: cfg.reach },
        uSeed: { value: cfg.seed },
        uLean: { value: new THREE.Vector2(...cfg.lean) },
        uBow: { value: new THREE.Vector2(...cfg.bow) },
      },
      vertexShader: vert,
      fragmentShader: common + frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(cfg.x, 0, cfg.z);
    group.add(mesh);
    return mesh;
  });

  // Cloud anchors: where each funnel top meets its parent cloud (x, y, z, cloud base height).
  const anchors = SPOUTS.map(
    (s) => new THREE.Vector4(s.x + s.lean[0], 0, s.z + s.lean[1], s.height),
  );

  function setCount(count) {
    meshes.forEach((m, i) => (m.visible = i < count));
  }

  return { group, anchors, setCount };
}
