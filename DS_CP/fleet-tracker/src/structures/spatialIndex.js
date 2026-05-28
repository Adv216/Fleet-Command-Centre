const RBush = require('rbush');

class SpatialIndex {
  constructor(maxEntries = 16) {
    this.tree = new RBush(maxEntries);
    this.itemByVehicle = new Map();
  }

  upsert(vehicleState) {
    const { vehicleId, lat, lon } = vehicleState;
    const existing = this.itemByVehicle.get(vehicleId);
    if (existing) {
      this.tree.remove(existing, (a, b) => a.vehicleId === b.vehicleId);
    }

    const item = {
      minX: lon,
      minY: lat,
      maxX: lon,
      maxY: lat,
      vehicleId,
      speed: vehicleState.speed,
      ts: vehicleState.timestamp,
    };

    this.tree.insert(item);
    this.itemByVehicle.set(vehicleId, item);
  }

  searchBBox(minLat, minLon, maxLat, maxLon) {
    return this.tree.search({
      minX: minLon,
      minY: minLat,
      maxX: maxLon,
      maxY: maxLat,
    });
  }
}

module.exports = {
  SpatialIndex,
};
