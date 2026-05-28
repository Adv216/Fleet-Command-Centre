const myTruckService = require('../services/myTruckService');

function launchTruck(req, res, next) {
  try {
    const { lat, lon, speed, heading, label } = req.body;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)))
      return res.status(400).json({ error: 'lat and lon are required numbers' });
    const truck = myTruckService.launchTruck({ lat: Number(lat), lon: Number(lon), speed: Number(speed) || 40, heading: Number(heading) || 0, label: String(label || '') });
    return res.status(201).json({ data: truck });
  } catch(e) { return next(e); }
}
function stopTruck(req, res, next) {
  try {
    const stopped = myTruckService.stopTruck(req.params.truckId);
    if (!stopped) return res.status(404).json({ error: 'Truck not found' });
    return res.json({ data: { truckId: req.params.truckId, stopped: true } });
  } catch(e) { return next(e); }
}
function listTrucks(req, res, next) {
  try { return res.json({ data: myTruckService.listTrucks() }); }
  catch(e) { return next(e); }
}
function updateTruck(req, res, next) {
  try {
    const { speed, heading } = req.body;
    const updated = myTruckService.updateTruck(req.params.truckId, {
      speed:   speed   !== undefined ? Number(speed)   : undefined,
      heading: heading !== undefined ? Number(heading) : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Truck not found' });
    return res.json({ data: updated });
  } catch(e) { return next(e); }
}
module.exports = { launchTruck, stopTruck, listTrucks, updateTruck };