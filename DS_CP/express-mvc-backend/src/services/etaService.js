/**
 * etaService.js  — ETA Monitoring using Segment Tree per vehicle
 * DS: SegmentTree (rolling speed buckets → range sum → avg speed)
 */

const SegmentTree = require('../data-structures/SegmentTree');
const websocketService = require('./websocketService');

const BUCKETS    = 64;
const BCAST_MS   = 2000;
const R          = 6371;

const DESTINATIONS = [
  { name: 'Mumbai Hub',    lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi Hub',     lat: 28.6139, lon: 77.2090 },
  { name: 'Bangalore Hub', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad Hub', lat: 17.3850, lon: 78.4867 },
  { name: 'Chennai Hub',   lat: 13.0827, lon: 80.2707 },
  { name: 'Kolkata Hub',   lat: 22.5726, lon: 88.3639 },
  { name: 'Pune Hub',      lat: 18.5204, lon: 73.8567 },
  { name: 'Ahmedabad Hub', lat: 23.0225, lon: 72.5714 },
];

function hav(la1, lo1, la2, lo2) {
  const d2r = v => v * Math.PI / 180;
  const dLa = d2r(la2 - la1), dLo = d2r(lo2 - lo1);
  const a = Math.sin(dLa/2)**2 + Math.cos(d2r(la1))*Math.cos(d2r(la2))*Math.sin(dLo/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const records = new Map();

class ETARecord {
  constructor(vehicleId) {
    this.vehicleId = vehicleId;
    const hash = vehicleId.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
    this.dest  = DESTINATIONS[hash % DESTINATIONS.length];
    this.tree  = new SegmentTree(BUCKETS);
    this.ptr   = 0;
    this.count = 0;
    this.scheduledMs = Date.now() + (30 + Math.random()*60)*60000;
    this.etaMs       = this.scheduledMs;
    this.distKm      = null;
    this.curSpeed    = 0;
    this.status      = 'on-time';
    this.delayMin    = 0;
  }
  update(lat, lon, speed) {
    this.curSpeed = speed;
    const bucket  = this.ptr % BUCKETS;
    this.tree.update(bucket, speed);
    this.ptr++;
    if (this.count < BUCKETS) this.count++;
    const used    = Math.min(this.ptr, BUCKETS);
    const avg     = Math.max(this.tree.query(0, used-1) / used, 5);
    this.distKm   = hav(lat, lon, this.dest.lat, this.dest.lon);
    if (this.distKm < 0.5) { this.status = 'arrived'; return; }
    this.etaMs    = Date.now() + (this.distKm / avg) * 3600000;
    this.delayMin = Math.round((this.etaMs - this.scheduledMs) / 60000);
    this.status   = this.delayMin > 10 ? 'delayed' : this.delayMin < -5 ? 'early' : 'on-time';
  }
  toJSON() {
    return {
      vehicleId:    this.vehicleId,
      destination:  this.dest.name,
      distanceKm:   this.distKm !== null ? Number(this.distKm.toFixed(2)) : null,
      speed:        Number(this.curSpeed.toFixed(1)),
      etaMs:        this.etaMs,
      scheduledMs:  this.scheduledMs,
      delayMinutes: this.delayMin,
      status:       this.status,
      etaFmt:       new Date(this.etaMs).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
    };
  }
}

function updateVehicleETA(vehicleId, lat, lon, speed) {
  if (String(vehicleId).startsWith('MY-')) return;
  if (!records.has(vehicleId)) records.set(vehicleId, new ETARecord(vehicleId));
  records.get(vehicleId).update(lat, lon, speed);
}

function getVehicleETA(vehicleId) {
  return records.has(vehicleId) ? records.get(vehicleId).toJSON() : null;
}

function getETASummary(limit = 20) {
  return [...records.values()]
    .filter(r => r.status !== 'arrived')
    .map(r => r.toJSON())
    .sort((a, b) => b.delayMinutes - a.delayMinutes)
    .slice(0, limit);
}

let _t = null;
function startBroadcasting() {
  if (_t) return;
  _t = setInterval(() => {
    const summary = getETASummary(50);
    websocketService.broadcast('eta:update', { summary: summary.slice(0, 20), delayedCount: summary.filter(r => r.status === 'delayed').length });
  }, BCAST_MS);
}
function stopBroadcasting() { if (_t) { clearInterval(_t); _t = null; } }

module.exports = { updateVehicleETA, getVehicleETA, getETASummary, startBroadcasting, stopBroadcasting };