const dotenv = require('dotenv');

dotenv.config();

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  enableSimulator:
    (process.env.ENABLE_GPS_SIMULATOR || (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) ===
    'true',
  simulatorVehicleCount: toNumber(process.env.SIMULATOR_VEHICLE_COUNT, 1000),
  simulatorIntervalMs: toNumber(process.env.SIMULATOR_INTERVAL_MS, 1000),
  simulatorCenterLat: toNumber(process.env.SIMULATOR_CENTER_LAT, 18.5204),
  simulatorCenterLon: toNumber(process.env.SIMULATOR_CENTER_LON, 73.8567),
  simulatorRadiusKm: toNumber(process.env.SIMULATOR_RADIUS_KM, 15),
};
