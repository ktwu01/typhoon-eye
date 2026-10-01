import * as THREE from 'three';
import common from '../glsl/common.glsl?raw';
import cloudsFrag from './clouds.frag.glsl?raw';
import resolveFrag from './resolve.frag.glsl?raw';

const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}`;

const blitFrag = /* glsl */ `
uniform sampler2D tSky;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tSky, vUv); }`;

// Keeps the raymarch cost roughly constant on high-DPI screens.
const MAX_CLOUD_PIXELS = 420000;

const makeTarget = () =>
  new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

function fullscreenPass(material) {
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);
  return scene;
}

// Clouds are raymarched at reduced resolution with per-frame jitter, then accumulated over
// time into a history target. The resolved result is the scene backdrop, and the ocean and
// spouts sample it (through `skyTexture`) for horizon fog and reflections.
export function createClouds(renderer, shared) {
  const raw = makeTarget();
  const history = [makeTarget(), makeTarget()];
  let current = 0;
  const skyTexture = { value: history[0].texture };

  const uniforms = {
    ...shared,
    uCamPos: { value: new THREE.Vector3() },
    uCamMatrix: { value: new THREE.Matrix4() },
    uInvProj: { value: new THREE.Matrix4() },
    uCoverage: { value: 0.35 },
    uSpouts: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uSpoutCount: { value: 0 },
    uFrame: { value: 0 },
  };
  const marchScene = fullscreenPass(
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: fullscreenVert,
      fragmentShader: common + cloudsFrag,
      depthTest: false,
      depthWrite: false,
    }),
  );

  const resolveUniforms = {
    tCurrent: { value: raw.texture },
    tHistory: { value: null },
    uInvProj: uniforms.uInvProj,
    uCamMatrix: uniforms.uCamMatrix,
    uPrevViewProj: { value: new THREE.Matrix4() },
    uTexel: { value: new THREE.Vector2() },
    uBlend: { value: 1 },
  };
  const resolveScene = fullscreenPass(
    new THREE.ShaderMaterial({
      uniforms: resolveUniforms,
      vertexShader: fullscreenVert,
      fragmentShader: resolveFrag,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const quadCam = new THREE.Camera();

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { tSky: skyTexture },
      vertexShader: fullscreenVert,
      fragmentShader: blitFrag,
      depthTest: false,
      depthWrite: false,
    }),
  );
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1000;

  const viewProj = new THREE.Matrix4();

  function render(camera) {
    uniforms.uFrame.value++;
    uniforms.uCamPos.value.copy(camera.position);
    uniforms.uCamMatrix.value.copy(camera.matrixWorld);
    uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
    renderer.setRenderTarget(raw);
    renderer.render(marchScene, quadCam);

    const prev = history[current];
    current = 1 - current;
    resolveUniforms.tHistory.value = prev.texture;
    renderer.setRenderTarget(history[current]);
    renderer.render(resolveScene, quadCam);
    renderer.setRenderTarget(null);

    resolveUniforms.uPrevViewProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    resolveUniforms.uBlend.value = 0.08;
    skyTexture.value = history[current].texture;
  }

  function setSize(width, height) {
    const scale = Math.min(0.5, Math.sqrt(MAX_CLOUD_PIXELS / (width * height)));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    raw.setSize(w, h);
    history.forEach((t) => t.setSize(w, h));
    resolveUniforms.uTexel.value.set(1 / w, 1 / h);
    resolveUniforms.uBlend.value = 1;
  }

  return { skyTexture, backdrop, uniforms, render, setSize };
}
