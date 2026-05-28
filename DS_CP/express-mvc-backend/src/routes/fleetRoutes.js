const express = require('express');
const fleetController = require('../controllers/fleetController');

const router = express.Router();

router.post('/location', fleetController.upsertLocation);
router.get('/top-speed', fleetController.getTopSpeedVehicles);
router.get('/range-metrics/:vehicleId', fleetController.getVehicleRangeMetrics);
router.get('/nearby', fleetController.getNearbyVehicles);

module.exports = router;
