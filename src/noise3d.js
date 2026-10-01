import * as THREE from 'three';

// Tileable 3D noise baked once on the CPU so shaders pay one texture fetch per octave stack.
// R: perlin-worley (cloud shape), G: low worley fbm, B: high worley fbm, A: value fbm.

function hash3(x, y, z, seed) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const wrap = (i, p) => ((i % p) + p) % p;
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function valueNoise(x, y, z, period, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
  let result = 0;
  for (let c = 0; c < 8; c++) {
    const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1;
    const v = hash3(wrap(ix + dx, period), wrap(iy + dy, period), wrap(iz + dz, period), seed);
    result += v * (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
  }
  return result;
}

function worley(x, y, z, period, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let minD = 1e9;
  for (let dz = -1; dz <= 1; dz++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx, cy = iy + dy, cz = iz + dz;
        const wx = wrap(cx, period), wy = wrap(cy, period), wz = wrap(cz, period);
        const px = cx + hash3(wx, wy, wz, seed) - x;
        const py = cy + hash3(wx, wy, wz, seed + 1) - y;
        const pz = cz + hash3(wx, wy, wz, seed + 2) - z;
        const d = px * px + py * py + pz * pz;
        if (d < minD) minD = d;
      }
  return 1 - Math.min(Math.sqrt(minD), 1);
}

function valueFbm(u, v, w, base, octaves, seed) {
  let sum = 0, amp = 0.5, norm = 0, p = base;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(u * p, v * p, w * p, p, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return sum / norm;
}

function worleyFbm(u, v, w, base, seed) {
  return (
    worley(u * base, v * base, w * base, base, seed) * 0.625 +
    worley(u * base * 2, v * base * 2, w * base * 2, base * 2, seed + 5) * 0.25 +
    worley(u * base * 4, v * base * 4, w * base * 4, base * 4, seed + 9) * 0.125
  );
}

const remap = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

export function createNoiseTexture(size = 64) {
  const data = new Uint8Array(size * size * size * 4);
  let i = 0;
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size, w = z / size;
        const perlin = valueFbm(u, v, w, 4, 4, 11);
        const wLow = worleyFbm(u, v, w, 4, 23);
        const wHigh = worleyFbm(u, v, w, 8, 41);
        const shape = clamp01(remap(perlin, wLow - 1, 1, 0, 1));
        const detail = valueFbm(u, v, w, 8, 4, 71);
        data[i++] = shape * 255;
        data[i++] = wLow * 255;
        data[i++] = wHigh * 255;
        data[i++] = detail * 255;
      }

  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}
