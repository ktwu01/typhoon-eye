import * as THREE from 'three';

// Fixed viewpoint on deck: drag to look around, scroll to zoom, with an optional ship roll.
export function createLookControls(camera, dom, { yaw = 0, pitch = 0, height = 16 } = {}) {
  const state = { yaw, pitch, targetYaw: yaw, targetPitch: pitch, fov: camera.fov, targetFov: camera.fov };
  let drag = null;

  dom.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = 0.0028 * (state.fov / 55);
    state.targetYaw += (e.clientX - drag.x) * k;
    state.targetPitch = THREE.MathUtils.clamp(state.targetPitch + (e.clientY - drag.y) * k, -0.3, 1.4);
    drag = { x: e.clientX, y: e.clientY };
  });
  const end = () => (drag = null);
  dom.addEventListener('pointerup', end);
  dom.addEventListener('pointercancel', end);
  dom.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      state.targetFov = THREE.MathUtils.clamp(state.targetFov * Math.exp(e.deltaY * 0.001), 18, 75);
    },
    { passive: false },
  );

  camera.rotation.order = 'YXZ';

  function update(dt, time, sway) {
    const k = 1 - Math.exp(-dt * 6);
    state.yaw += (state.targetYaw - state.yaw) * k;
    state.pitch += (state.targetPitch - state.pitch) * k;
    state.fov += (state.targetFov - state.fov) * k;
    if (Math.abs(camera.fov - state.fov) > 1e-3) {
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    }
    const s = sway ? 1 : 0;
    camera.position.set(0, height + s * (Math.sin(time * 0.55) * 1.4 + Math.sin(time * 1.3) * 0.4), 0);
    camera.rotation.set(
      state.pitch + s * Math.sin(time * 0.42 + 1) * 0.012,
      state.yaw,
      s * Math.sin(time * 0.37) * 0.025,
    );
    camera.updateMatrixWorld();
  }

  return { update };
}
