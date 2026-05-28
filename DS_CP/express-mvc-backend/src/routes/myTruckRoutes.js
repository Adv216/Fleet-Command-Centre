const express = require('express');
const c = require('../controllers/myTruckController');
const router = express.Router();
router.post('/',              c.launchTruck);
router.get('/',               c.listTrucks);
router.patch('/:truckId',     c.updateTruck);
router.delete('/:truckId',    c.stopTruck);
module.exports = router;