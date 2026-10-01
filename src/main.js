import * as THREE from 'three';
import { createNoiseTexture } from './noise3d.js';
import { createSharedUniforms, applyTimeOfDay } from './atmosphere.js';
import { createClouds } from './sky/clouds.js';
import { createOcean } from './ocean/ocean.js';
import { createSpouts } from './spout/spouts.js';
import { createLightning } from './lightning.js';
import { createLookControls } from './look-controls.js';
import { createPost } from './post.js';
import { createGui, params } from './gui.js';
import { createStormAudio } from './audio.js';
import { createAudioControls } from './audio-controls.js';
import { createIntro } from './intro.js';

const spoutPositions = [];
const audio = createStormAudio(spoutPositions);
const intro = createIntro(audio);

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.5, 120000);
  const scene = new THREE.Scene();

  const shared = createSharedUniforms(createNoiseTexture(64));
  const resolution = { value: new THREE.Vector2(1, 1) };

  const clouds = createClouds(renderer, shared);
  const ocean = createOcean(shared, clouds.skyTexture);
  const spouts = createSpouts(shared, clouds.skyTexture, resolution);
  clouds.uniforms.uSpouts.value = spouts.anchors;
  scene.add(clouds.backdrop, ocean.mesh, spouts.group);

  spoutPositions.push(...spouts.group.children.map((mesh) => mesh.position));
  const hud = document.getElementById('hud');
  createAudioControls(audio, hud);
  const lightning = createLightning(shared, audio.strike);
  const look = createLookControls(camera, renderer.domElement, { yaw: 0.06, pitch: 0.3 });
  const post = createPost(renderer, scene, camera);

  function applyParams() {
    applyTimeOfDay(shared, params.timeOfDay, params.sunAzimuth);
    shared.uWind.value = params.wind;
    shared.uSpin.value = 0.012 * params.spin;
    clouds.uniforms.uCoverage.value = params.lowClouds;
    clouds.uniforms.uSpoutCount.value = params.spouts;
    spouts.setCount(params.spouts);
    renderer.toneMappingExposure = params.exposure;
  }
  createGui(applyParams, hud);
  applyParams();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    post.setSize(w, h);
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    clouds.setSize(buf.x, buf.y);
    ocean.setSize(buf.x, buf.y);
    resolution.value.copy(buf);
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let time = 0;
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    time += dt;
    shared.uTime.value = time;

    look.update(dt, time, params.sway);
    audio.update(params, camera, time);
    lightning.update(dt, params.lightning);
    ocean.update(camera);
    clouds.render(camera);
    post.render(time);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  intro.ready();
}

// Let the loading message paint before the noise bake blocks the main thread.
requestAnimationFrame(() => setTimeout(start, 30));
