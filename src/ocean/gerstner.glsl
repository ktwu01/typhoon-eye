#define WAVE_COUNT 12
uniform vec4 uWaveA[WAVE_COUNT]; // dir.xy, wavenumber k, amplitude
uniform vec4 uWaveB[WAVE_COUNT]; // angular speed, steepness Q, phase

// Waves fade out once they shrink below the grid/pixel footprint, to avoid shimmering at distance.
void gerstner(vec2 x, float dist, out vec3 disp, out float jac, out vec3 nrm) {
  disp = vec3(0.0);
  float jxx = 1.0, jzz = 1.0, jxz = 0.0;
  vec3 n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < WAVE_COUNT; i++) {
    vec4 a = uWaveA[i];
    vec4 b = uWaveB[i];
    vec2 d = a.xy;
    float k = a.z;
    float L = 6.2831853 / k;
    float A = a.w * uWind * (1.0 - smoothstep(L * 12.0, L * 45.0, dist));
    float th = k * dot(d, x) - b.x * uTime + b.z;
    float s = sin(th), c = cos(th);
    float Q = b.y;
    disp += vec3(Q * A * d.x * c, A * s, Q * A * d.y * c);
    float wa = k * A;
    jxx -= Q * wa * d.x * d.x * s;
    jzz -= Q * wa * d.y * d.y * s;
    jxz -= Q * wa * d.x * d.y * s;
    n -= vec3(d.x * wa * c, Q * wa * s, d.y * wa * c);
  }
  jac = jxx * jzz - jxz * jxz;
  nrm = normalize(n);
}
