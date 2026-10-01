uniform vec3 uCamPos;
uniform mat4 uCamMatrix;
uniform mat4 uInvProj;
uniform float uCoverage;
uniform vec4 uSpouts[3];
uniform int uSpoutCount;
uniform float uFrame;

varying vec2 vUv;

const float SIGMA = 0.0035;

vec3 stormFrame(vec3 p, out float r) {
  vec2 q = p.xz - uStormCenter.xz;
  r = length(q);
  float a = atan(q.y, q.x) - uTime * uSpin;
  return vec3(cos(a) * r, p.y, sin(a) * r);
}

float wallDensity(vec3 p, float r, vec3 sp, bool detail) {
  float h = p.y;
  vec4 n = texture(uNoise, sp * vec3(1.0 / 11000.0, 1.0 / 7000.0, 1.0 / 11000.0));
  float bulge = (n.r - 0.5) * 3600.0 + (n.a - 0.5) * 1200.0;
  float edge = r - wallRadius(h) + bulge;
  if (edge < -500.0) return 0.0;

  float d = smoothstep(-300.0, 500.0, edge);
  float top = 13500.0 + (n.a - 0.5) * 3000.0;
  d *= 1.0 - smoothstep(top - 2500.0, top, h);

  if (detail) {
    vec3 drift = vec3(0.0, -uTime * 0.003, 0.0);
    float dn = texture(uNoise, sp / 1700.0 + drift).g;
    float dn2 = texture(uNoise, sp / 520.0 + drift * 2.0).b;
    d = clamp((d - (1.0 - dn) * 0.55 - (1.0 - dn2) * 0.18) / 0.3, 0.0, 1.0);
  }

  // Below the cloud base the wall becomes a curtain of rain that thickens with depth.
  float base = 480.0 + (n.a - 0.5) * 400.0;
  float streak = texture(uNoise, sp * vec3(1.0 / 700.0, 1.0 / 9000.0, 1.0 / 700.0)).g;
  float rain = (0.12 + 0.5 * smoothstep(0.0, 3500.0, edge)) * (0.5 + streak);
  return mix(rain * smoothstep(-500.0, 600.0, edge), d, smoothstep(base - 150.0, base + 250.0, h));
}

float lowDensity(vec3 p, float r, bool detail) {
  float h = p.y;
  float band = smoothstep(380.0, 620.0, h) * (1.0 - smoothstep(950.0, 1600.0, h));
  if (band <= 0.0) return 0.0;
  vec3 wp = p + vec3(uTime * 14.0, 0.0, uTime * 5.0) * uWind;
  float n = texture(uNoise, wp / vec3(4200.0, 1400.0, 4200.0)).r;
  float cov = uCoverage + smoothstep(wallRadius(h) - 4000.0, wallRadius(h), r) * 0.2;
  float d = clamp((n - (1.0 - cov)) / max(cov, 0.05), 0.0, 1.0) * band;
  if (detail) d = clamp(d - (1.0 - texture(uNoise, wp / 650.0).b) * 0.3, 0.0, 1.0);
  return d * 0.35;
}

// Rotating cloud base that each waterspout hangs from; the base sags where the funnel attaches.
float spoutCloud(vec3 p, bool detail) {
  float d = 0.0;
  for (int i = 0; i < 3; i++) {
    if (i >= uSpoutCount) break;
    vec3 s = uSpouts[i].xyz;
    float base = uSpouts[i].w;
    if (p.y < base - 30.0 || p.y > base + 950.0) continue;
    vec2 q = p.xz - s.xz;
    float rr = length(q);
    if (rr > 2000.0) continue;
    float a = atan(q.y, q.x) + uTime * 0.12 * uWind + min(rr, 700.0) / 350.0;
    vec3 lp = vec3(cos(a) * rr, p.y, sin(a) * rr);
    float n = texture(uNoise, (lp + s * 0.37) / vec3(1300.0, 600.0, 1300.0)).r;
    float n2 = texture(uNoise, (lp - s * 0.21) / 520.0).r;
    float rad = 1000.0 + (n - 0.5) * 1200.0 + (n2 - 0.5) * 700.0;
    float radial = 1.0 - smoothstep(rad * 0.3, rad, rr);
    // Flat, ragged base that dips into a short collar where the funnel attaches.
    float lowered = base + smoothstep(0.0, 450.0, rr) * 140.0;
    float top = base + 480.0 + n * 450.0;
    float vert = smoothstep(lowered - 20.0, lowered + 70.0, p.y) * (1.0 - smoothstep(top - 250.0, top, p.y));
    float arms = 0.5 + 0.5 * sin(2.0 * atan(q.y, q.x) + min(rr, 900.0) / 170.0 - uTime * 0.25 * uWind);
    float c = radial * vert * (0.4 + n * 1.2) * mix(0.45, 1.35, arms * smoothstep(150.0, 500.0, rr));
    if (detail) {
      c -= (1.0 - texture(uNoise, lp / 520.0).g) * 0.5;
      c -= (1.0 - texture(uNoise, lp / 170.0).b) * 0.2;
      c *= 1.6;
    }
    d += clamp(c, 0.0, 1.0);
  }
  return d;
}

float density(vec3 p, bool detail) {
  float r;
  vec3 sp = stormFrame(p, r);
  float d = wallDensity(p, r, sp, detail);
  if (p.y < 2600.0) d += lowDensity(p, r, detail) + spoutCloud(p, detail);
  return d;
}

void main() {
  vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize((uCamMatrix * vec4(normalize(v.xyz / v.w), 0.0)).xyz);
  vec3 rdm = rd;
  rdm.y = max(rdm.y, 0.004);
  rdm = normalize(rdm);
  vec3 ro = uCamPos;

  float cosT = dot(rdm, uSunDir);
  float phase = mix(hg(cosT, 0.6), hg(cosT, -0.2), 0.4);

  float T = 1.0;
  vec3 col = vec3(0.0);
  float jitter = ign(gl_FragCoord.xy + mod(uFrame, 64.0) * vec2(5.588238, 3.13));
  float t = 30.0 + jitter * 40.0;

  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rdm * t;
    if (p.y > 17500.0 || t > 90000.0) break;

    float stepLen = min(45.0 + t * 0.035, 380.0) * (0.75 + 0.5 * jitter);
    float r = length(p.xz - uStormCenter.xz);
    float sdWall = wallRadius(p.y) - r - 2600.0;
    if (p.y > 2600.0 && sdWall > 0.0) {
      t += max(sdWall * 0.5, stepLen);
      continue;
    }

    float d = density(p, true);
    if (d > 0.003) {
      float lt = 0.0;
      float ls = 120.0;
      vec3 lp = p;
      for (int j = 0; j < 4; j++) {
        lp += uSunDir * ls;
        lt += density(lp, false) * ls;
        ls *= 2.2;
      }
      float beer = exp(-lt * SIGMA) + exp(-lt * SIGMA * 0.2) * 0.25;
      float powder = 1.0 - exp(-d * 2.5);
      float sunT = beer * mix(1.0, powder, 0.5);
      // Lower cloud sits under the overhanging wall and in rain: darker toward the base.
      float ao = smoothstep(200.0, 6000.0, p.y);
      float hf = clamp(p.y / 12000.0, 0.0, 1.0);
      vec3 amb = mix(uHorizon * 0.12, uZenith * 0.6 + uHorizon * 0.25, hf) * (0.25 + 0.75 * ao);
      vec3 S = uSunColor * sunT * phase * 0.6 * (0.3 + 0.7 * ao) + amb;

      vec3 fl = p - uFlash.xyz;
      S += vec3(0.75, 0.82, 1.0) * uFlash.w * 5.0e6 / (dot(fl, fl) + 5.0e5);

      float haze = 1.0 - exp(-t / 55000.0);
      S = mix(S, uHorizon, haze * 0.6);

      float Ts = exp(-d * SIGMA * stepLen);
      col += T * S * (1.0 - Ts);
      T *= Ts;
      if (T < 0.01) break;
    }
    t += stepLen;
  }

  vec3 bg = skyColor(rdm);
  if (rd.y > 0.0) bg += sunDisk(rd);
  gl_FragColor = vec4(col + T * bg, 1.0);
}
