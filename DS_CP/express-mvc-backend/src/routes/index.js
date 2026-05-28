const express        = require('express');
const vehiclesRoutes = require('./vehiclesRoutes');
const myTruckRoutes  = require('./myTruckRoutes');

let healthRoutes, fleetRoutes;
try { healthRoutes = require('./healthRoutes'); } catch(_) {}
try { fleetRoutes  = require('./fleetRoutes');  } catch(_) {}

const router = express.Router();
if (healthRoutes) router.use('/health',    healthRoutes);
if (fleetRoutes)  router.use('/fleet',     fleetRoutes);
router.use('/vehicles',  vehiclesRoutes);
router.use('/my-trucks', myTruckRoutes);
module.exports = router;