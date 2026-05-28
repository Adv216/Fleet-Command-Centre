/**
 * trailService.js
 * Vehicle GPS Trail History — circular buffer per vehicle.
 *
 * DS: Fixed-size typed array (Float64Array) ring buffer
 * Stores last 120 positions per vehicle, O(1) insert, O(n) read.
 */

const TRAIL_SIZE = 120;

const trails = new Map(); // vehicleId → { lats, lons, speeds, tss, ptr, count }

function getOrCreate(vehicleId) {
  if (!trails.has(vehicleId)) {
    trails.set(vehicleId, {
      lats:   new Float64Array(TRAIL_SIZE),
      lons:   new Float64Array(TRAIL_SIZE),
      speeds: new Float32Array(TRAIL_SIZE),
      tss:    new Float64Array(TRAIL_SIZE),
      ptr:    0,
      count:  0,
    });
  }
  return trails.get(vehicleId);
}

function push(vehicleId, lat, lon, speed, ts) {
  const t = getOrCreate(vehicleId);
  const i = t.ptr % TRAIL_SIZE;
  t.lats[i]   = lat;
  t.lons[i]   = lon;
  t.speeds[i] = speed;
  t.tss[i]    = ts;
  t.ptr++;
  if (t.count < TRAIL_SIZE) t.count++;
}

/** Returns ordered array oldest → newest */
function getTrail(vehicleId) {
  const t = trails.get(vehicleId);
  if (!t || t.count === 0) return [];
  const n     = t.count;
  const start = t.count < TRAIL_SIZE ? 0 : t.ptr % TRAIL_SIZE;
  const out   = [];
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % TRAIL_SIZE;
    out.push({
      lat:   Number(t.lats[idx].toFixed(6)),
      lon:   Number(t.lons[idx].toFixed(6)),
      speed: Number(t.speeds[idx].toFixed(1)),
      ts:    t.tss[idx],
    });
  }
  return out;
}

module.exports = { push, getTrail };