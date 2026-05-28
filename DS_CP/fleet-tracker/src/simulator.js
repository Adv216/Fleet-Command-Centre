const bus = require('./eventBus');
const config = require('./config');

const vehicles = new Map();

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function initializeVehicles(count) {
  for (let i = 1; i <= count; i += 1) {
    const angle = randomInRange(0, 2 * Math.PI);
    const radius = randomInRange(0, config.randomRadiusKm / 111);
    const lat = config.centerLat + radius * Math.cos(angle);
    const lon = config.centerLon + radius * Math.sin(angle);

    vehicles.set(`V${i}`, {
      vehicleId: `V${i}`,
      lat,
      lon,
      heading: randomInRange(0, 360),
      speed: randomInRange(20, 80),
    });
  }
}

function tick() {
  const now = Date.now();

  for (const vehicle of vehicles.values()) {
    const speedVariation = randomInRange(-6, 6);
    vehicle.speed = Math.max(0, Math.min(120, vehicle.speed + speedVariation));

    vehicle.heading = (vehicle.heading + randomInRange(-12, 12) + 360) % 360;

    const distanceKm = vehicle.speed / 3600;
    const headingRad = (vehicle.heading * Math.PI) / 180;

    const dLat = (distanceKm / 111) * Math.cos(headingRad);
    const dLon = (distanceKm / (111 * Math.cos((vehicle.lat * Math.PI) / 180))) * Math.sin(headingRad);

    vehicle.lat += dLat;
    vehicle.lon += dLon;

    bus.emit('gps.update', {
      vehicleId: vehicle.vehicleId,
      lat: vehicle.lat,
      lon: vehicle.lon,
      speed: Number(vehicle.speed.toFixed(2)),
      heading: Number(vehicle.heading.toFixed(2)),
      timestamp: now,
    });
  }
}

function startSimulator() {
  initializeVehicles(config.simulatorVehicleCount);
  setInterval(tick, config.simulatorIntervalMs);
}

module.exports = {
  startSimulator,
};
