uniform sampler2D tSky;
uniform vec2 uResolution;
uniform vec3 uBase;
uniform float uHeight;
uniform float uHalf;
uniform float uScale;
uniform float uReach;
uniform float uSeed;
uniform vec2 uLean;
uniform vec2 uBow;

varying vec3 vWorld;

// Rope-like centerline: the top trails behind the parent cloud, the middle bows and slowly writhes.
vec2 centerAt(float h) {
  float sway = 1.0 + 0.35 * sin(uTime * 0.23 + uSeed);
  vec2 c = uLean * pow(h, 1.5) + uBow * sin(PI * h) * sway;
  c += vec2(sin(h * 7.0 + uTime * 0.9 + uSeed), cos(h * 5.0 - uTime * 0.7 + uSeed)) * 6.0 * uScale * h;
  return c;
}

float funnelRadius(float h) {
  return (mix(5.0, 14.0, h) + pow(h, 7.0) * 110.0) * uScale;
}

// Returns funnel density, spray density, and a conservative distance to the nearest
// non-empty region (0 when inside one) so the march can skip empty space.
vec3 sampleSpout(vec3 lp) {
  float h = clamp(lp.y / uHeight, 0.0, 1.0);
  vec2 q = lp.xz - centerAt(h);
  float d = length(q);
  float r = funnelRadius(h);

  float y = lp.y;
  vec2 q0 = lp.xz - centerAt(0.0);
  float rr = length(q0);
  float R0 = (60.0 + 25.0 * uWind) * uScale;
  float H0 = (30.0 + 25.0 * uWind) * uScale;

  float gapF = d - r * 1.3;
  float gapS = max(rr - 3.2 * R0, y - 5.0 * H0);
  float gap = min(gapF, gapS);
  if (gap > 0.0) return vec3(0.0, 0.0, gap);

  float funnel = 0.0;
  if (gapF <= 0.0) {
    float sw = atan(q.y, q.x) + uTime * 2.6 - h * 14.0;
    vec3 np = vec3(cos(sw) * d, lp.y - uTime * 40.0, sin(sw) * d);
    // Stretched along the axis so the funnel shows the vertical striations seen in photos.
    float n = texture(uNoise, np / vec3(40.0, 260.0, 40.0)).g;
    float shell = smoothstep(r, r * 0.25, d + (n - 0.5) * r * 0.9);
    funnel = shell * (0.4 + 0.6 * smoothstep(0.0, r * 0.8, d)) * (0.5 + n);
    funnel *= mix(0.08, 1.0, smoothstep(uReach - 0.04, uReach + 0.12, h));
    funnel *= 1.0 - smoothstep(0.84, 1.0, h);
  }

  // Spray: a spinning bush of sea water flung up and outward where the vortex meets the sea.
  float spray = 0.0;
  if (gapS <= 0.0) {
    float sa = atan(q0.y, q0.x) + uTime * 1.8 + y * 0.02;
    vec3 sp = vec3(cos(sa) * rr, y - uTime * 9.0, sin(sa) * rr);
    float sn = texture(uNoise, sp / (40.0 * uScale)).r;
    float sn2 = texture(uNoise, sp / (14.0 * uScale)).b;
    float bush = exp(-pow(rr / R0, 2.0)) * exp(-y / H0);
    float skirt = exp(-pow(rr / (2.6 * R0), 2.0)) * exp(-y / (0.25 * H0)) * 0.5;
    spray = clamp((bush + skirt) * (sn * 1.5 + sn2 * 0.6) - 0.35, 0.0, 1.0);
  }
  return vec3(funnel, spray, gapF <= 0.0 ? -1.0 : 0.0);
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - ro);
  vec3 bmin = uBase + vec3(-uHalf, 0.0, -uHalf);
  vec3 bmax = uBase + vec3(uHalf, uHeight, uHalf);
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv;
  vec3 t1 = (bmax - ro) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tn = max(max(max(tmin.x, tmin.y), tmin.z), 0.0);
  float tf = min(min(tmax.x, tmax.y), tmax.z);
  if (tf <= tn) discard;

  float t = tn + ign(gl_FragCoord.xy) * 2.0 * uScale;

  float cosT = dot(rd, uSunDir);
  float phase = mix(hg(cosT, 0.55), hg(cosT, -0.15), 0.4);
  vec3 amb = uHorizon * 0.75 + uZenith * 0.35 + uFlash.w * vec3(0.5, 0.55, 0.65);

  float T = 1.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 140; i++) {
    if (t > tf) break;
    vec3 lp = ro + rd * t - uBase;
    vec3 s = sampleSpout(lp);
    if (s.z > 0.0) {
      t += max(s.z * 0.7, 1.5 * uScale);
      continue;
    }
    float dt = (s.z < 0.0 ? 2.5 : 7.0) * uScale;
    float ext = s.x * 0.06 / uScale + s.y * 0.035 / uScale;
    if (ext > 0.0001) {
      // Near the top the funnel sits in the parent cloud's shadow and takes on its grey.
      float top = smoothstep(0.6, 1.0, lp.y / uHeight);
      vec3 S = uSunColor * phase * mix(0.55, 0.2, top) * 0.35 + amb * mix(1.0, 0.55, top);
      float Ts = exp(-ext * dt);
      col += T * S * (1.0 - Ts);
      T *= Ts;
      if (T < 0.01) break;
    }
    t += dt;
  }

  float alpha = 1.0 - T;
  if (alpha < 0.002) discard;
  float dist = length(uBase.xz - ro.xz);
  float haze = 1.0 - exp(-dist / 11000.0);
  vec3 fogCol = texture2D(tSky, gl_FragCoord.xy / uResolution).rgb;
  col = mix(col, fogCol * alpha, haze);
  gl_FragColor = vec4(col, alpha);
}
