const fleetService = require('../services/fleetService');

function upsertLocation(req, res, next) {
  try {
    const payload = req.body;
    const result = fleetService.processLocation(payload);
    return res.status(201).json({ data: result });
  } catch (error) {
    return next(error);
  }
}

function getTopSpeedVehicles(req, res, next) {
  try {
    const k = Number(req.query.k || 10);
    const result = fleetService.getTopSpeedVehicles(k);
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
}

function getVehicleRangeMetrics(req, res, next) {
  try {
    const { vehicleId } = req.params;
    const startTs = Number(req.query.startTs);
    const endTs = Number(req.query.endTs);
    const result = fleetService.getVehicleRangeMetrics(vehicleId, startTs, endTs);
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
}

function getNearbyVehicles(req, res, next) {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const radiusKm = Number(req.query.radiusKm || 5);
    const result = fleetService.getNearbyVehicles(lat, lon, radiusKm);
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  upsertLocation,
  getTopSpeedVehicles,
  getVehicleRangeMetrics,
  getNearbyVehicles,
};
