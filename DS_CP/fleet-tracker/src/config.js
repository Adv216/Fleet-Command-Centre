const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  port: toNumber(process.env.PORT, 8080),
  simulatorVehicleCount: toNumber(process.env.SIMULATOR_VEHICLE_COUNT, 10000),
  simulatorIntervalMs: toNumber(process.env.SIMULATOR_INTERVAL_MS, 1000),
  centerLat: toNumber(process.env.CENTER_LAT, 12.9716),
  centerLon: toNumber(process.env.CENTER_LON, 77.5946),
  randomRadiusKm: toNumber(process.env.RANDOM_RADIUS_KM, 30),
  maxHistoryPointsPerVehicle: toNumber(process.env.MAX_HISTORY_POINTS_PER_VEHICLE, 2048),
};
