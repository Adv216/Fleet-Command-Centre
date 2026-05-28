/**
 * myTruckService.js
 * Manages user-launched virtual trucks.
 *
 * Each truck:
 *   - Gets a unique "MY-<uuid_short>" id
 *   - Moves autonomously every TICK_MS using heading + speed
 *   - Pushes position updates into fleetService (so it appears on the map
 *     alongside simulator vehicles and is included in all spatial queries)
 *   - Broadcasts its own event "myTruck:update" so the frontend can
 *     highlight it distinctly
 */

const { randomUUID } = require('crypto');
const fleetService = require('./fleetService');
const websocketService = require('./websocketService');

const TICK_MS = 1000;          // position update interval
const R_EARTH_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

/** Move a lat/lon by `distKm` along `headingDeg` */
function movePoint(lat, lon, distKm, headingDeg) {
  const d = distKm / R_EARTH_KM;           // angular distance in radians
  const θ = headingDeg * DEG_TO_RAD;
  const φ1 = lat * DEG_TO_RAD;
  const λ1 = lon * DEG_TO_RAD;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(d) * Math.cos(φ1),
      Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    lat: φ2 / DEG_TO_RAD,
    lon: ((λ2 / DEG_TO_RAD + 540) % 360) - 180, // normalise to -180..180
  };
}

/** In-memory store: truckId -> truckState */
const trucks = new Map();

function launchTruck({ lat, lon, speed, heading, label }) {
  const id = 'MY-' + randomUUID().slice(0, 8).toUpperCase();

  const truck = {
    truckId: id,
    vehicleId: id,   // alias used by fleetService
    lat,
    lon,
    speed,           // km/h
    heading,         // degrees 0-360
    label: label || id,
    launchedAt: Date.now(),
    lastUpdate: Date.now(),
    active: true,
    trail: [{ lat, lon, ts: Date.now() }],
  };

  // Push initial position into fleet
  _pushToFleet(truck);

  // Start autonomous movement
  truck._timer = setInterval(() => _tick(id), TICK_MS);

  trucks.set(id, truck);
  _broadcast(truck);
  return _sanitize(truck);
}

function stopTruck(truckId) {
  const truck = trucks.get(truckId);
  if (!truck) return false;
  clearInterval(truck._timer);
  truck.active = false;
  trucks.delete(truckId);
  websocketService.broadcast('myTruck:stopped', { truckId });
  return true;
}

function updateTruck(truckId, { speed, heading }) {
  const truck = trucks.get(truckId);
  if (!truck) return null;
  if (speed !== undefined && Number.isFinite(speed)) truck.speed = speed;
  if (heading !== undefined && Number.isFinite(heading)) truck.heading = ((heading % 360) + 360) % 360;
  return _sanitize(truck);
}

function listTrucks() {
  return [...trucks.values()].map(_sanitize);
}

// ── internals ──────────────────────────────────────────────────────────────

function _tick(truckId) {
  const truck = trucks.get(truckId);
  if (!truck || !truck.active) return;

  const distKm = (truck.speed / 3600) * (TICK_MS / 1000);  // km per tick
  const next = movePoint(truck.lat, truck.lon, distKm, truck.heading);

  truck.lat = next.lat;
  truck.lon = next.lon;
  truck.lastUpdate = Date.now();

  // Keep rolling trail (last 200 points)
  truck.trail.push({ lat: next.lat, lon: next.lon, ts: truck.lastUpdate });
  if (truck.trail.length > 200) truck.trail.shift();

  // Subtle random heading drift (+/-3 deg) so truck doesn't go off screen
  truck.heading = ((truck.heading + (Math.random() - 0.5) * 6) + 360) % 360;

  _pushToFleet(truck);
  _broadcast(truck);
}

function _pushToFleet(truck) {
  fleetService.processLocation({
    vehicleId: truck.truckId,
    lat: truck.lat,
    lon: truck.lon,
    speed: truck.speed,
    timestamp: truck.lastUpdate,
  });
}

function _broadcast(truck) {
  websocketService.broadcast('myTruck:update', {
    truckId: truck.truckId,
    vehicleId: truck.truckId,
    lat: truck.lat,
    lon: truck.lon,
    speed: truck.speed,
    heading: truck.heading,
    label: truck.label,
    trail: truck.trail,
    lastUpdate: truck.lastUpdate,
  });
}

function _sanitize(truck) {
  return {
    truckId: truck.truckId,
    vehicleId: truck.truckId,
    lat: truck.lat,
    lon: truck.lon,
    speed: truck.speed,
    heading: truck.heading,
    label: truck.label,
    launchedAt: truck.launchedAt,
    lastUpdate: truck.lastUpdate,
    active: truck.active,
    trailLength: truck.trail.length,
  };
}

module.exports = { launchTruck, stopTruck, listTrucks, updateTruck };