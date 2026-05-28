const fleetService     = require('../services/fleetService');
const etaService       = require('../services/etaService');
const priorityService  = require('../services/priorityService');
const perfService      = require('../services/perfService');
const anomalyService   = require('../services/anomalyService');
const cityStatsService = require('../services/cityStatsService');
const deliveryService   = require('../services/deliveryService');
const breakdownService  = require('../services/breakdownService');

function ok(res, data)  { return res.json({ data }); }
function err(res, e, next) { return next(e); }

// ── Existing ──────────────────────────────────────────────────────────────
function getLiveVehicles(req, res, next) {
  try { return ok(res, fleetService.getLiveVehicles(Number(req.query.limit || 1000))); }
  catch(e) { return err(res, e, next); }
}
function getNearbyVehicles(req, res, next) {
  try { return ok(res, fleetService.getNearbyVehicles(Number(req.query.lat), Number(req.query.lon), Number(req.query.radiusKm || 5), Number(req.query.limit || 1000))); }
  catch(e) { return err(res, e, next); }
}
function getNearestVehicle(req, res, next) {
  try { return ok(res, fleetService.getNearestVehicle(Number(req.query.lat), Number(req.query.lon))); }
  catch(e) { return err(res, e, next); }
}
function getNearestVehicles(req, res, next) {
  try { return ok(res, fleetService.getNearestVehicles(Number(req.query.lat), Number(req.query.lon), Number(req.query.k || 5))); }
  catch(e) { return err(res, e, next); }
}
function getTopVehicles(req, res, next) {
  try { return ok(res, fleetService.getTopSpeedVehicles(Number(req.query.k || 10))); }
  catch(e) { return err(res, e, next); }
}
function getVehicleClusters(req, res, next) {
  try { return ok(res, fleetService.getVehicleClusters(Number(req.query.epsKm || 0.5), Number(req.query.minPts || 3), String(req.query.includeVehicleIds || 'false') === 'true')); }
  catch(e) { return err(res, e, next); }
}
function getVehicleHistory(req, res, next) {
  try {
    const endTs = Number(req.query.endTs || Date.now());
    const startTs = Number(req.query.startTs || endTs - 3600000);
    return ok(res, fleetService.getVehicleHistoryDistance(req.params.vehicleId, startTs, endTs));
  } catch(e) { return err(res, e, next); }
}
function getFleetSummary(req, res, next) {
  try { return ok(res, fleetService.getFleetSummary()); }
  catch(e) { return err(res, e, next); }
}
function getHotspots(req, res, next) {
  try { return ok(res, fleetService.getHotspots(Number(req.query.cellSizeKm || 2), Number(req.query.limit || 10))); }
  catch(e) { return err(res, e, next); }
}

// ── ETA ───────────────────────────────────────────────────────────────────
function getETASummary(req, res, next) {
  try { return ok(res, etaService.getETASummary(Number(req.query.limit || 20))); }
  catch(e) { return err(res, e, next); }
}
function getVehicleETA(req, res, next) {
  try {
    const d = etaService.getVehicleETA(req.params.vehicleId);
    if (!d) return res.status(404).json({ error: 'Not found' });
    return ok(res, d);
  } catch(e) { return err(res, e, next); }
}

// ── Priority ──────────────────────────────────────────────────────────────
function getPriorityQueue(req, res, next) {
  try { return ok(res, { topUrgent: priorityService.getTopUrgent(Number(req.query.k || 15)), stats: priorityService.getStats() }); }
  catch(e) { return err(res, e, next); }
}

// ── Performance ───────────────────────────────────────────────────────────
function getPerfSnapshot(req, res, next) {
  try { return ok(res, perfService.snapshot()); }
  catch(e) { return err(res, e, next); }
}

// ── Anomalies ─────────────────────────────────────────────────────────────
function getAnomalies(req, res, next) {
  try { return ok(res, { alerts: anomalyService.getAlerts(Number(req.query.limit || 30)), stats: anomalyService.getStats() }); }
  catch(e) { return err(res, e, next); }
}

// ── City Stats ────────────────────────────────────────────────────────────
function getCityStats(req, res, next) {
  try { return ok(res, cityStatsService.getCityStats()); }
  catch(e) { return err(res, e, next); }
}

// ── Vehicle Trail ─────────────────────────────────────────────────────────
function getVehicleTrail(req, res, next) {
  try { return ok(res, fleetService.getVehicleTrail(req.params.vehicleId)); }
  catch(e) { return err(res, e, next); }
}

// ── Deliveries ────────────────────────────────────────────────────────────
function getDeliverySummary(req, res, next) {
  try { return ok(res, deliveryService.getDeliverySummary()); }
  catch(e) { return err(res, e, next); }
}
function getVehicleDelivery(req, res, next) {
  try {
    const d = deliveryService.getVehicleDelivery(req.params.vehicleId);
    if (!d) return res.status(404).json({ error: 'No active delivery' });
    return ok(res, d);
  } catch(e) { return err(res, e, next); }
}
function exportDeliveriesCSV(req, res, next) {
  try {
    const csv = deliveryService.exportCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fleet-deliveries.csv"');
    return res.send(csv);
  } catch(e) { return err(res, e, next); }
}

function getBreakdowns(req, res, next) {
  try { return res.json({ data: { incidents: breakdownService.getActiveIncidents(), stats: breakdownService.getStats() } }); }
  catch(e) { return next(e); }
}
function triggerBreakdown(req, res, next) {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ error: 'vehicleId required' });
    const inc = breakdownService.triggerBreakdown(String(vehicleId).toUpperCase());
    if (!inc) return res.status(503).json({ error: 'Fleet not ready yet — wait a moment for vehicles to start, then try again' });
    return res.json({ data: inc });
  } catch(e) { return next(e); }
}
function resolveBreakdown(req, res, next) {
  try { breakdownService.resolveIncident(req.params.incidentId); return res.json({ data: { resolved: true } }); }
  catch(e) { return next(e); }
}

module.exports = {
  getLiveVehicles, getNearbyVehicles, getNearestVehicle, getNearestVehicles,
  getTopVehicles, getVehicleClusters, getVehicleHistory, getFleetSummary, getHotspots,
  getETASummary, getVehicleETA, getPriorityQueue, getPerfSnapshot,
  getAnomalies, getCityStats, getVehicleTrail,
  getDeliverySummary, getVehicleDelivery, exportDeliveriesCSV,
  getBreakdowns, triggerBreakdown, resolveBreakdown,
};