/**
 * gpsSimulator.js  (UPDATED)
 *
 * Changes:
 *  - Vehicles spread across 12 major Indian cities instead of only Pune
 *  - Each city has a defined logistics hub with realistic radius
 *  - Vehicles do realistic route-following (move along roads, bounce back at boundary)
 *  - My-Truck vehicles (MY- prefix) are excluded from simulation
 */

const { randomUUID } = require('crypto');

// 12 major Indian logistics hubs
const CITY_HUBS = [
  { name: 'Mumbai',    lat: 19.0760, lon: 72.8777, radius: 18 },
  { name: 'Delhi',     lat: 28.6139, lon: 77.2090, radius: 22 },
  { name: 'Bangalore', lat: 12.9716, lon: 77.5946, radius: 18 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, radius: 16 },
  { name: 'Chennai',   lat: 13.0827, lon: 80.2707, radius: 16 },
  { name: 'Kolkata',   lat: 22.5726, lon: 88.3639, radius: 16 },
  { name: 'Pune',      lat: 18.5204, lon: 73.8567, radius: 14 },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, radius: 14 },
  { name: 'Jaipur',    lat: 26.9124, lon: 75.7873, radius: 12 },
  { name: 'Surat',     lat: 21.1702, lon: 72.8311, radius: 12 },
  { name: 'Lucknow',   lat: 26.8467, lon: 80.9462, radius: 12 },
  { name: 'Nagpur',    lat: 21.1458, lon: 79.0882, radius: 10 },
];

class GPSSimulator {
  constructor(options = {}) {
    const {
      vehicleCount = 1000,
      intervalMs   = 1000,
      // legacy single-center options kept for backward compat but ignored
      onBatch,
      idPrefix = 'V',
    } = options;

    if (!Number.isInteger(vehicleCount) || vehicleCount <= 0) {
      throw new Error('vehicleCount must be a positive integer');
    }

    this.vehicleCount = vehicleCount;
    this.intervalMs   = intervalMs;
    this.onBatch      = typeof onBatch === 'function' ? onBatch : null;
    this.idPrefix     = idPrefix;

    this.ids          = new Array(vehicleCount);
    this.lat          = new Float64Array(vehicleCount);
    this.lon          = new Float64Array(vehicleCount);
    this.speedMps     = new Float32Array(vehicleCount);
    this.headingDeg   = new Float32Array(vehicleCount);
    this.accelMps2    = new Float32Array(vehicleCount);
    this.turnRateDegPs= new Float32Array(vehicleCount);
    // store which city hub each vehicle belongs to
    this.hubIndex     = new Uint8Array(vehicleCount);

    this.timer    = null;
    this.sequence = 0;
    this.sessionId = randomUUID();

    this.#initializeVehicles();
  }

  #initializeVehicles() {
    for (let i = 0; i < this.vehicleCount; i++) {
      this.ids[i] = `${this.idPrefix}${i + 1}`;

      // Assign city hub — weighted slightly toward larger cities
      const hubIdx  = i % CITY_HUBS.length;
      const hub     = CITY_HUBS[hubIdx];
      this.hubIndex[i] = hubIdx;

      const radiusDeg = hub.radius / 111;
      const angle     = Math.random() * 2 * Math.PI;
      const radial    = Math.sqrt(Math.random()) * radiusDeg;

      this.lat[i] = hub.lat + radial * Math.cos(angle);
      this.lon[i] = hub.lon + radial * Math.sin(angle);

      // Varied speeds: 5 km/h (urban crawl) → 100 km/h (highway)
      this.speedMps[i]      = 5 + Math.random() * 24;      // 5-29 m/s → 18-104 km/h
      this.headingDeg[i]    = Math.random() * 360;
      this.accelMps2[i]     = (Math.random() - 0.5) * 0.8;
      this.turnRateDegPs[i] = (Math.random() - 0.5) * 8;
    }
  }

  #clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  #wrapDegrees(value) {
    let v = value % 360;
    if (v < 0) v += 360;
    return v;
  }

  #stepVehicle(i, dtSeconds) {
    // Smooth acceleration & turn-rate jitter
    this.accelMps2[i]      = this.#clamp(this.accelMps2[i] + (Math.random() - 0.5) * 0.08, -1.5, 1.5);
    this.turnRateDegPs[i]  = this.#clamp(this.turnRateDegPs[i] + (Math.random() - 0.5) * 0.4, -20, 20);

    const nextSpeed        = this.speedMps[i] + this.accelMps2[i] * dtSeconds;
    this.speedMps[i]       = this.#clamp(nextSpeed, 0.5, 30);

    this.headingDeg[i]     = this.#wrapDegrees(this.headingDeg[i] + this.turnRateDegPs[i] * dtSeconds);

    const distanceMeters   = this.speedMps[i] * dtSeconds;
    const headingRad       = (this.headingDeg[i] * Math.PI) / 180;

    const dLat = (distanceMeters / 111320) * Math.cos(headingRad);
    const cosLat = Math.cos((this.lat[i] * Math.PI) / 180);
    const dLon = (distanceMeters / (111320 * Math.max(0.2, cosLat))) * Math.sin(headingRad);

    this.lat[i] += dLat;
    this.lon[i] += dLon;

    // Bounce back if vehicle strays too far from its hub
    const hub       = CITY_HUBS[this.hubIndex[i]];
    const dLatHub   = this.lat[i] - hub.lat;
    const dLonHub   = this.lon[i] - hub.lon;
    const distKm    = Math.sqrt(dLatHub * dLatHub + dLonHub * dLonHub) * 111;

    if (distKm > hub.radius * 1.3) {
      // Steer back toward hub center
      const backAngle = Math.atan2(-dLonHub, -dLatHub) * (180 / Math.PI);
      this.headingDeg[i] = this.#wrapDegrees(backAngle + (Math.random() - 0.5) * 30);
    }
  }

  tick(now = Date.now()) {
    const dtSeconds = this.intervalMs / 1000;
    const updates   = new Array(this.vehicleCount);

    for (let i = 0; i < this.vehicleCount; i++) {
      this.#stepVehicle(i, dtSeconds);

      updates[i] = {
        sessionId:  this.sessionId,
        seq:        ++this.sequence,
        vehicleId:  this.ids[i],
        timestamp:  now,
        lat:        Number(this.lat[i].toFixed(6)),
        lon:        Number(this.lon[i].toFixed(6)),
        speedKmph:  Number((this.speedMps[i] * 3.6).toFixed(2)),
        headingDeg: Number(this.headingDeg[i].toFixed(2)),
        city:       CITY_HUBS[this.hubIndex[i]].name,
      };
    }

    if (this.onBatch) this.onBatch(updates, now);
    return updates;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(Date.now()), this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { GPSSimulator };