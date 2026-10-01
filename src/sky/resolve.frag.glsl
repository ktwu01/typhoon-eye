uniform sampler2D tCurrent;
uniform sampler2D tHistory;
uniform mat4 uInvProj;
uniform mat4 uCamMatrix;
uniform mat4 uPrevViewProj;
uniform vec2 uTexel;
uniform float uBlend;

varying vec2 vUv;

// Clouds sit kilometres away while the camera only bobs a metre or two, so reprojecting by
// view direction alone (as if the clouds were at infinity) is accurate enough.
void main() {
  vec3 cur = texture2D(tCurrent, vUv).rgb;
  vec3 lo = cur, hi = cur;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec3 c = texture2D(tCurrent, vUv + vec2(x, y) * uTexel).rgb;
      lo = min(lo, c);
      hi = max(hi, c);
    }
  }

  vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = (uCamMatrix * vec4(normalize(v.xyz / v.w), 0.0)).xyz;
  vec4 clip = uPrevViewProj * vec4(rd, 0.0);
  vec2 prevUv = clip.xy / clip.w * 0.5 + 0.5;

  float valid = clip.w > 0.0 && all(greaterThan(prevUv, vec2(0.0))) && all(lessThan(prevUv, vec2(1.0))) ? 1.0 : 0.0;
  vec3 hist = clamp(texture2D(tHistory, prevUv).rgb, lo, hi);
  gl_FragColor = vec4(mix(cur, hist, (1.0 - uBlend) * valid), 1.0);
}
