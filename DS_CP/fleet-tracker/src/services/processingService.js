const config = require('../config');
const bus = require('../eventBus');
const store = require('../data/store');
const { VehicleTimeSeries } = require('../structures/segmentTree');

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class ProcessingService {
  constructor(spatialIndex, topKSpeedHeap, topKDistanceHeap, clusteringService) {
    this.spatialIndex = spatialIndex;
    this.topKSpeedHeap = topKSpeedHeap;
    this.topKDistanceHeap = topKDistanceHeap;
    this.clusteringService = clusteringService;
    this.segmentByVehicle = new Map();
    this.totalDistanceByVehicle = new Map();
    this.eventsInCurrentSecond = 0;
    this.eps = 0;

    setInterval(() => {
      this.eps = this.eventsInCurrentSecond;
      this.eventsInCurrentSecond = 0;
    }, 1000);

    setInterval(() => {
      store.clusterSnapshot = this.clusteringService.runDBSCAN(store.latestByVehicle);
    }, 3000);

    bus.on('gps.update', (event) => this.handleGpsEvent(event));
  }

  getOrCreateSeries(vehicleId) {
    if (!this.segmentByVehicle.has(vehicleId)) {
      this.segmentByVehicle.set(vehicleId, new VehicleTimeSeries(config.maxHistoryPointsPerVehicle));
    }
    return this.segmentByVehicle.get(vehicleId);
  }

  handleGpsEvent(event) {
    this.eventsInCurrentSecond += 1;
    const { vehicleId, lat, lon, speed, heading, timestamp } = event;

    const previous = store.previousPointByVehicle.get(vehicleId);
    const distanceIncrement = previous ? haversineKm(previous.lat, previous.lon, lat, lon) : 0;

    const totalDistance = (this.totalDistanceByVehicle.get(vehicleId) || 0) + distanceIncrement;
    this.totalDistanceByVehicle.set(vehicleId, totalDistance);

    const state = {
      vehicleId,
      lat,
      lon,
      speed,
      heading,
      timestamp,
      totalDistanceKm: totalDistance,
    };

    store.latestByVehicle.set(vehicleId, state);
    store.previousPointByVehicle.set(vehicleId, { lat, lon });

    const history = store.getOrCreateHistory(vehicleId);
    history.push(state);
    if (history.length > config.maxHistoryPointsPerVehicle) {
      history.shift();
    }

    const series = this.getOrCreateSeries(vehicleId);
    series.append(timestamp, speed, distanceIncrement);

    this.spatialIndex.upsert(state);
    this.topKSpeedHeap.upsert({ vehicleId, score: speed, speed, timestamp });
    this.topKDistanceHeap.upsert({ vehicleId, score: totalDistance, totalDistanceKm: totalDistance, timestamp });

    store.lastProcessedAt = Date.now();
  }
}

module.exports = {
  ProcessingService,
};
