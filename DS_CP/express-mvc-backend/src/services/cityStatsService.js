/**
 * cityStatsService.js
 * Per-city vehicle stats — HashMap aggregation.
 *
 * DS: Map<cityName, bucket>
 * Maintains live count, avgSpeed, maxSpeed per city.
 */

const websocketService = require('./websocketService');

const BCAST_MS = 2000;
const cityMap    = new Map(); // city → { count, totalSpeed, maxSpeed, moving, idle }
const vehicleReg = new Map(); // vehicleId → { city, speed }

function update(vehicleId, city, speed) {
  if (!city || String(vehicleId).startsWith('MY-')) return;
  const prev = vehicleReg.get(vehicleId);

  // Undo previous contribution
  if (prev) {
    const b = cityMap.get(prev.city);
    if (b) {
      b.count      = Math.max(0, b.count - 1);
      b.totalSpeed -= prev.speed;
      if (prev.speed >= 5) b.moving = Math.max(0, b.moving - 1);
      else                 b.idle   = Math.max(0, b.idle   - 1);
    }
  }

  // Upsert current
  if (!cityMap.has(city)) cityMap.set(city, { city, count: 0, totalSpeed: 0, maxSpeed: 0, moving: 0, idle: 0 });
  const b = cityMap.get(city);
  if (!prev || prev.city !== city) b.count++;
  b.totalSpeed += speed;
  b.maxSpeed    = Math.max(b.maxSpeed, speed);
  if (speed >= 5) b.moving++; else b.idle++;

  vehicleReg.set(vehicleId, { city, speed });
}

function getCityStats() {
  return [...cityMap.values()]
    .map(b => ({
      city:     b.city,
      count:    b.count,
      avgSpeed: b.count > 0 ? Number((b.totalSpeed / b.count).toFixed(1)) : 0,
      maxSpeed: Number(b.maxSpeed.toFixed(1)),
      moving:   b.moving,
      idle:     b.idle,
    }))
    .sort((a, b) => b.count - a.count);
}

let _t = null;
function startBroadcasting() {
  if (_t) return;
  _t = setInterval(() => websocketService.broadcast('city:stats', { cities: getCityStats() }), BCAST_MS);
}
function stopBroadcasting() { if (_t) { clearInterval(_t); _t = null; } }

module.exports = { update, getCityStats, startBroadcasting, stopBroadcasting };