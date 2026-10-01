uniform sampler2D tSky;
uniform vec2 uResolution;
uniform mat4 uViewProj;
uniform vec2 uWindDir;

varying vec3 vWorld;
varying vec2 vXZ;

// Cheap stand-in for the eyewall when a reflected ray leaves the screen.
vec3 wallApprox(vec3 R) {
  vec2 o = cameraPosition.xz - uStormCenter.xz;
  vec2 d = normalize(R.xz + vec2(1e-5));
  float b = dot(o, d);
  float c = dot(o, o) - uEyeRadius * uEyeRadius;
  float D = -b + sqrt(max(b * b - c, 0.0));
  float elev = atan(9000.0, D + 3000.0);
  float re = asin(clamp(R.y, 0.0, 1.0));
  float mask = 1.0 - smoothstep(elev * 0.8, elev, re);
  float lit = max(dot(-vec3(d.x, 0.0, d.y), uSunDir) * 0.5 + 0.5, 0.0);
  vec3 wall = uSunColor * 0.2 * lit + uHorizon * 0.55;
  return mix(skyColor(R), wall, mask);
}

vec3 reflection(vec3 R) {
  vec3 col = wallApprox(R);
  vec4 clip = uViewProj * vec4(cameraPosition + R * 60000.0, 1.0);
  if (clip.w > 0.0) {
    vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
    vec2 m = smoothstep(0.0, 0.1, uv) * smoothstep(1.0, 0.9, uv);
    col = mix(col, texture2D(tSky, clamp(uv, 0.0, 1.0)).rgb, m.x * m.y);
  }
  return col;
}

vec2 detailSlope(vec2 xz, float scale, float speed) {
  vec3 c = vec3(xz / scale, uTime * speed);
  float e = 1.0 / 64.0;
  float h0 = texture(uNoise, c).a;
  float hx = texture(uNoise, c + vec3(e, 0.0, 0.0)).a;
  float hz = texture(uNoise, c + vec3(0.0, e, 0.0)).a;
  return vec2(h0 - hx, h0 - hz);
}

void main() {
  float dist = length(vWorld.xz - cameraPosition.xz);
  vec3 disp;
  float jac;
  vec3 n;
  gerstner(vXZ, dist, disp, jac, n);

  float near = 1.0 - smoothstep(200.0, 2500.0, dist);
  // Detail ripples alias into sparkle at distance, so they fade out well before the horizon.
  float mid = 1.0 - smoothstep(600.0, 1800.0, dist);
  vec2 slope = detailSlope(vXZ, 26.0, 0.05) * 0.9 * mid + detailSlope(vXZ, 7.0, 0.11) * 0.5 * near * near;
  n = normalize(n + vec3(slope.x, 0.0, slope.y) * uWind);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(2000.0, 12000.0, dist) * 0.6));

  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(n, V), 0.0);
  vec3 R = reflect(-V, n);
  R.y = abs(R.y);
  // Wind-roughened water scatters part of the mirror reflection, so cap the grazing Fresnel.
  float F = 0.02 + 0.68 * pow(1.0 - ndv, 5.0);

  vec3 L = uSunDir;
  vec3 H = normalize(L + V);
  float nh = max(dot(n, H), 0.0);
  vec3 spec = uSunColor * (pow(nh, 900.0) * 40.0 + pow(nh, 80.0) * 0.4) * step(0.0, L.y);

  float ambient = dot(uZenith + uHorizon, vec3(0.3, 0.5, 0.2)) + uFlash.w * 0.25;
  float crest = smoothstep(-2.0, 6.0, vWorld.y);
  vec3 body = vec3(0.003, 0.02, 0.032) * ambient * 1.6;
  vec3 sss = vec3(0.02, 0.15, 0.13) * uSunColor * 0.06 * crest * (0.3 + max(dot(n, L), 0.0));
  vec3 col = mix(body + sss, reflection(R), F) + spec;

  // Foam: crests where the surface folds (low Jacobian) plus wind-driven streaks.
  vec2 wd = uWindDir;
  vec2 along = vec2(dot(vXZ, wd), dot(vXZ, vec2(-wd.y, wd.x)));
  float streak = texture(uNoise, vec3(along / vec2(160.0, 11.0), 0.37 + uTime * 0.004)).g;
  float fn = texture(uNoise, vec3(vXZ / 17.0, uTime * 0.03)).g;
  float foamJ = smoothstep(0.95 - uWind * 0.25, 0.25, jac);
  float foam = clamp(foamJ * (fn * 1.7 - 0.35), 0.0, 1.0);
  foam += smoothstep(0.74, 0.95, streak) * 0.18 * smoothstep(0.5, 1.3, uWind) * (0.4 + crest);
  foam = clamp(foam * near, 0.0, 1.0) + (1.0 - near) * 0.06 * uWind;
  vec3 foamCol = vec3(0.9) * (uSunColor * max(dot(n, L), 0.0) * 0.18 + ambient * 0.55 + uFlash.w * 0.3);
  col = mix(col, foamCol, foam);

  vec3 fogCol = texture2D(tSky, gl_FragCoord.xy / uResolution).rgb;
  float fog = 1.0 - exp(-dist / 11000.0);
  col = mix(col, fogCol, clamp(fog, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
