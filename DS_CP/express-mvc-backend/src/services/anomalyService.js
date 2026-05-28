/**
 * anomalyService.js
 * Speed Anomaly Detector using circular buffer per vehicle.
 *
 * DS: Fixed-size circular buffer (Float32Array) → rolling mean + stddev
 * Algorithm: Z-score threshold  |speed - mean| / std > k → alert
 */

const websocketService = require('./websocketService');

const WINDOW   = 20;
const WARN_Z   = 2.0;
const CRIT_Z   = 3.0;
const MIN_SAMP = 6;
const MAX_LOG  = 100;
const BCAST_MS = 1500;

const buffers = new Map(); // vehicleId → { buf, ptr, count }
let alertLog  = [];

function getOrCreate(id) {
  if (!buffers.has(id)) buffers.set(id, { buf: new Float32Array(WINDOW), ptr: 0, count: 0 });
  return buffers.get(id);
}

function pushSpeed(s, v) {
  s.buf[s.ptr % WINDOW] = v;
  s.ptr++;
  if (s.count < WINDOW) s.count++;
}

function rollingStats(s) {
  let sum = 0, sq = 0;
  for (let i = 0; i < s.count; i++) { sum += s.buf[i]; sq += s.buf[i] ** 2; }
  const mean = sum / s.count;
  return { mean, std: Math.sqrt(Math.max(0, sq / s.count - mean ** 2)) };
}

function detect(vehicleId, lat, lon, speed, city) {
  if (String(vehicleId).startsWith('MY-')) return null;
  const s = getOrCreate(vehicleId);
  pushSpeed(s, speed);
  if (s.count < MIN_SAMP) return null;
  const { mean, std } = rollingStats(s);
  if (std < 1) return null;
  const z = Math.abs(speed - mean) / std;
  const severity = z >= CRIT_Z ? 'CRITICAL' : z >= WARN_Z ? 'WARNING' : null;
  if (!severity) return null;
  const alert = {
    id: `${vehicleId}-${Date.now()}`,
    vehicleId, lat, lon,
    city: city || '—',
    speed:    Number(speed.toFixed(1)),
    mean:     Number(mean.toFixed(1)),
    zScore:   Number(z.toFixed(2)),
    severity,
    direction: speed > mean ? 'spike' : 'drop',
    ts:   Date.now(),
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  alertLog = [alert, ...alertLog].slice(0, MAX_LOG);
  return alert;
}

function getAlerts(limit = 30) { return alertLog.slice(0, limit); }

function getStats() {
  return {
    total:    alertLog.length,
    critical: alertLog.filter(a => a.severity === 'CRITICAL').length,
    warning:  alertLog.filter(a => a.severity === 'WARNING').length,
    tracked:  buffers.size,
  };
}

let _t = null;
function startBroadcasting() {
  if (_t) return;
  _t = setInterval(() => websocketService.broadcast('anomaly:update', { alerts: alertLog.slice(0, 20), stats: getStats() }), BCAST_MS);
}
function stopBroadcasting() { if (_t) { clearInterval(_t); _t = null; } }

module.exports = { detect, getAlerts, getStats, startBroadcasting, stopBroadcasting };