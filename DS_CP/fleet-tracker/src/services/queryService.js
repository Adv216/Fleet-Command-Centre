const store = require('../data/store');

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

class QueryService {
  constructor(spatialIndex, segmentByVehicle, topKSpeedHeap, topKDistanceHeap) {
    this.spatialIndex = spatialIndex;
    this.segmentByVehicle = segmentByVehicle;
    this.topKSpeedHeap = topKSpeedHeap;
    this.topKDistanceHeap = topKDistanceHeap;
  }

  getLive(limit = 500) {
    return Array.from(store.latestByVehicle.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  nearby(lat, lon, radiusKm) {
    const deltaLat = radiusKm / 111;
    const deltaLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const candidates = this.spatialIndex.searchBBox(
      lat - deltaLat,
      lon - deltaLon,
      lat + deltaLat,
      lon + deltaLon
    );

    return candidates
      .map((c) => {
        const state = store.latestByVehicle.get(c.vehicleId);
        if (!state) return null;
        const distanceKm = haversineKm(lat, lon, state.lat, state.lon);
        return distanceKm <= radiusKm ? { ...state, distanceKm } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  history(vehicleId, startTs, endTs) {
    const history = store.vehicleHistory.get(vehicleId) || [];
    const filtered = history.filter((p) => p.timestamp >= startTs && p.timestamp <= endTs);
    const ts = this.segmentByVehicle.get(vehicleId);
    const metrics = ts ? ts.rangeMetrics(startTs, endTs) : { maxSpeed: 0, totalDistance: 0, points: 0 };

    return {
      vehicleId,
      metrics,
      points: filtered,
    };
  }

  topK(metric = 'speed', k = 10) {
    if (metric === 'distance') {
      return this.topKDistanceHeap.toSortedDesc().slice(0, k);
    }
    return this.topKSpeedHeap.toSortedDesc().slice(0, k);
  }

  clusters() {
    return store.clusterSnapshot;
  }
}

module.exports = {
  QueryService,
};
