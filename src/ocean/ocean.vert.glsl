uniform vec3 uOrigin;
uniform float uGridSize;

varying vec3 vWorld;
varying vec2 vXZ;

// Grid vertices are pushed outward with a power curve: dense under the camera, sparse at the horizon.
void main() {
  vec2 g = position.xy;
  vec2 w = sign(g) * pow(abs(g), vec2(2.6)) * uGridSize;
  vec2 xz = uOrigin.xz + w;
  vec3 disp;
  float jac;
  vec3 n;
  gerstner(xz, length(w), disp, jac, n);
  vec3 wp = vec3(xz.x + disp.x, disp.y, xz.y + disp.z);
  vWorld = wp;
  vXZ = xz;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
