/**
 * breakdownService.js
 * Vehicle Breakdown Detector + Emergency Rerouting System
 *
 * DS: HashMap for vehicle state tracking
 *     Min-Heap for finding nearest available rescue vehicles
 *
 * Logic:
 *   - A vehicle is flagged as "broken down" if speed < BREAKDOWN_SPEED
 *     for BREAKDOWN_TICKS consecutive ticks
 *   - When breakdown detected:
 *     1. Find nearest vehicle via spatial scan (min-heap on distance)
 *     2. Assign rescue mission to that vehicle
 *     3. Transfer the delivery to the rescue vehicle
 *     4. Broadcast alert to frontend
 */

const websocketService = require('./websocketService');

const BREAKDOWN_SPEED  = 2;    // km/h — below this = suspected breakdown
const BREAKDOWN_TICKS  = 8;    // consecutive low-speed readings before flagging
const RESCUE_RADIUS_KM = 50;   // search radius for rescue vehicle
const BCAST_MS         = 2000;

// vehicleId → { lowSpeedTicks, lat, lon, status, rescueVehicleId, deliveryId }
const vehicleState = new Map();

// Active breakdown incidents: incidentId → incident
const incidents = new Map();
let _incidentCounter = 0;

// Latest positions (set by fleetService calling recordPosition)
const latestPositions = new Map();

function recordPosition(vehicleId, lat, lon, speed) {
  latestPositions.set(vehicleId, { lat, lon, speed, ts: Date.now() });
}

function findNearestAvailable(lat, lon, excludeId) {
  // Min-heap style — find closest non-broken vehicle
  let bestId = null, bestDist = Infinity;
  for (const [id, pos] of latestPositions.entries()) {
    if (id === excludeId) continue;
    const state = vehicleState.get(id);
    if (state?.status === 'broken') continue;
    if (state?.status === 'rescuing') continue;
    if (String(id).startsWith('MY-')) continue;
    const d = haversine(lat, lon, pos.lat, pos.lon);
    if (d < bestDist && d < RESCUE_RADIUS_KM) {
      bestDist = d;
      bestId   = id;
    }
  }
  return bestId ? { vehicleId: bestId, distKm: bestDist } : null;
}

function haversine(la1, lo1, la2, lo2) {
  const d = v => v * Math.PI / 180;
  const dLa = d(la2-la1), dLo = d(lo2-lo1);
  const a = Math.sin(dLa/2)**2 + Math.cos(d(la1))*Math.cos(d(la2))*Math.sin(dLo/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Called every GPS tick for each vehicle.
 * Returns an incident object if a NEW breakdown is detected, else null.
 */
function checkVehicle(vehicleId, lat, lon, speed, delivery) {
  if (String(vehicleId).startsWith('MY-')) return null;

  let state = vehicleState.get(vehicleId);
  if (!state) {
    state = { lowSpeedTicks: 0, lat, lon, status: 'ok', rescueVehicleId: null };
    vehicleState.set(vehicleId, state);
  }

  state.lat = lat;
  state.lon = lon;

  // Already broken or being rescued — skip
  if (state.status === 'broken' || state.status === 'rescued') return null;

  if (speed < BREAKDOWN_SPEED) {
    state.lowSpeedTicks++;
  } else {
    state.lowSpeedTicks = 0;
    state.status = 'ok';
    return null;
  }

  // Not enough ticks yet
  if (state.lowSpeedTicks < BREAKDOWN_TICKS) return null;

  // ── BREAKDOWN DETECTED ──────────────────────────
  state.status = 'broken';
  state.lowSpeedTicks = 0;

  const incidentId = `INC-${++_incidentCounter}`;
  const rescue     = findNearestAvailable(lat, lon, vehicleId);

  const incident = {
    incidentId,
    brokenVehicleId:  vehicleId,
    lat,
    lon,
    deliveryId:       delivery?.deliveryId || null,
    deliveryItem:     delivery?.item || null,
    deliveryTo:       delivery?.to || null,
    rescueVehicleId:  rescue?.vehicleId || null,
    rescueDistKm:     rescue ? Number(rescue.distKm.toFixed(2)) : null,
    status:           rescue ? 'rescue-dispatched' : 'no-rescue-available',
    ts:               Date.now(),
    time:             new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }),
    resolved:         false,
  };

  incidents.set(incidentId, incident);

  // Mark rescue vehicle as rescuing
  if (rescue) {
    const rState = vehicleState.get(rescue.vehicleId);
    if (rState) rState.status = 'rescuing';
    // Auto-resolve after 2 minutes (simulation)
    setTimeout(() => resolveIncident(incidentId), 120000);
  }

  // Broadcast immediately
  websocketService.broadcast('breakdown:new', incident);
  return incident;
}

function resolveIncident(incidentId) {
  const inc = incidents.get(incidentId);
  if (!inc || inc.resolved) return;
  inc.resolved = true;
  inc.status   = 'resolved';

  // Reset vehicle states
  const broken = vehicleState.get(inc.brokenVehicleId);
  if (broken) broken.status = 'ok';
  if (inc.rescueVehicleId) {
    const rescue = vehicleState.get(inc.rescueVehicleId);
    if (rescue) rescue.status = 'ok';
  }

  websocketService.broadcast('breakdown:resolved', { incidentId, ts: Date.now() });
}

function getActiveIncidents() {
  return [...incidents.values()].filter(i => !i.resolved).slice(0, 20);
}

function getStats() {
  const all      = [...incidents.values()];
  const active   = all.filter(i => !i.resolved).length;
  const resolved = all.filter(i => i.resolved).length;
  return { total: all.length, active, resolved };
}

// Manual trigger for demo purposes — directly creates an incident, bypasses tick logic
function triggerBreakdown(vehicleId) {
  // 1. Get position — use vehicle's own, or steal a neighbour's, or use a default India center
  let pos = latestPositions.get(vehicleId);

  if (!pos) {
    const entries = [...latestPositions.entries()].filter(([id]) => !String(id).startsWith('MY-'));
    if (entries.length > 0) {
      const [, randomPos] = entries[Math.floor(Math.random() * entries.length)];
      pos = {
        lat: randomPos.lat + (Math.random() - 0.5) * 0.05,
        lon: randomPos.lon + (Math.random() - 0.5) * 0.05,
      };
    } else {
      // Absolute fallback — centre of India
      pos = { lat: 20.5937 + (Math.random() - 0.5) * 2, lon: 78.9629 + (Math.random() - 0.5) * 2 };
    }
    latestPositions.set(vehicleId, { ...pos, speed: 0, ts: Date.now() });
  }

  const { lat, lon } = pos;

  // 2. Mark vehicle as broken (reset so we can re-trigger the same vehicle)
  vehicleState.set(vehicleId, { lowSpeedTicks: 0, lat, lon, status: 'broken', rescueVehicleId: null });

  // 3. Find nearest rescue vehicle
  const rescue = findNearestAvailable(lat, lon, vehicleId);

  // 4. Build incident directly — no tick-counting needed for manual demo
  const incidentId = `INC-${++_incidentCounter}`;
  const incident = {
    incidentId,
    brokenVehicleId:  vehicleId,
    lat,
    lon,
    deliveryId:       null,
    deliveryItem:     null,
    deliveryTo:       null,
    rescueVehicleId:  rescue?.vehicleId || null,
    rescueDistKm:     rescue ? Number(rescue.distKm.toFixed(2)) : null,
    status:           rescue ? 'rescue-dispatched' : 'no-rescue-available',
    ts:               Date.now(),
    time:             new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    resolved:         false,
  };

  incidents.set(incidentId, incident);

  // 5. Mark rescue vehicle as rescuing + auto-resolve after 2 min
  if (rescue) {
    const rState = vehicleState.get(rescue.vehicleId);
    if (rState) rState.status = 'rescuing';
    setTimeout(() => resolveIncident(incidentId), 120000);
  }

  // 6. Broadcast
  websocketService.broadcast('breakdown:new', incident);
  return incident;
}

let _t = null;
function startBroadcasting() {
  if (_t) return;
  _t = setInterval(() => {
    const active = getActiveIncidents();
    if (active.length > 0) {
      websocketService.broadcast('breakdown:update', { incidents: active, stats: getStats() });
    }
  }, BCAST_MS);
}
function stopBroadcasting() { if (_t) { clearInterval(_t); _t = null; } }

module.exports = { checkVehicle, recordPosition, getActiveIncidents, getStats, triggerBreakdown, resolveIncident, startBroadcasting, stopBroadcasting };