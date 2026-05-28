const express = require('express');
const c = require('../controllers/vehiclesController');
const router = express.Router();

// Core
router.get('/live',               c.getLiveVehicles);
router.get('/nearby',             c.getNearbyVehicles);
router.get('/nearest',            c.getNearestVehicle);
router.get('/nearest-list',       c.getNearestVehicles);
router.get('/top',                c.getTopVehicles);
router.get('/clusters',           c.getVehicleClusters);
router.get('/history/:vehicleId', c.getVehicleHistory);
router.get('/summary',            c.getFleetSummary);
router.get('/hotspots',           c.getHotspots);
// ETA
router.get('/eta',                c.getETASummary);
router.get('/eta/:vehicleId',     c.getVehicleETA);
// Priority
router.get('/priority',           c.getPriorityQueue);
// Perf
router.get('/perf',               c.getPerfSnapshot);
// Anomaly
router.get('/anomalies',          c.getAnomalies);
// Cities
router.get('/cities',             c.getCityStats);
// Trail
router.get('/trail/:vehicleId',   c.getVehicleTrail);
// Deliveries
router.get('/deliveries',         c.getDeliverySummary);
router.get('/deliveries/export',  c.exportDeliveriesCSV);
router.get('/delivery/:vehicleId',c.getVehicleDelivery);

// Breakdowns
router.get('/breakdowns',              c.getBreakdowns);
router.post('/breakdown/trigger',      c.triggerBreakdown);
router.post('/breakdown/resolve/:incidentId', c.resolveBreakdown);

module.exports = router;