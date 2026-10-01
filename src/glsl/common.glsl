precision highp float;
precision highp sampler3D;

uniform sampler3D uNoise;
uniform float uTime;
uniform float uWind;
uniform float uSpin;
uniform float uEyeRadius;
uniform vec3 uStormCenter;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec4 uFlash;

#define PI 3.14159265

float hg(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5);
}

vec3 skyColor(vec3 rd) {
  float e = clamp(rd.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(e, 0.5));
  float sd = max(dot(rd, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 6.0) * 0.05 + pow(sd, 90.0) * 0.15);
  return col;
}

vec3 sunDisk(vec3 rd) {
  return uSunColor * smoothstep(0.99986, 0.99994, dot(rd, uSunDir)) * 25.0;
}

float ign(vec2 px) {
  return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715))));
}

// Inner edge of the eyewall: slopes outward with height, then flares into the anvil.
float wallRadius(float h) {
  return uEyeRadius + h * 0.42 + smoothstep(7000.0, 14000.0, h) * 4000.0;
}
