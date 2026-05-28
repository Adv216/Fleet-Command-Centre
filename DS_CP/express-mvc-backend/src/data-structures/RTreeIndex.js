const RBush = require('rbush');

class RTreeIndex {
  constructor(maxEntries = 16) {
    this.tree = new RBush(maxEntries);
    this.byVehicle = new Map();
  }

  upsert(vehicleId, lat, lon) {
    const existing = this.byVehicle.get(vehicleId);
    if (existing) {
      this.tree.remove(existing, (a, b) => a.vehicleId === b.vehicleId);
    }

    const item = {
      minX: lon,
      minY: lat,
      maxX: lon,
      maxY: lat,
      vehicleId,
      lat,
      lon,
    };

    this.tree.insert(item);
    this.byVehicle.set(vehicleId, item);
  }

  searchBoundingBox(minLat, minLon, maxLat, maxLon) {
    return this.tree.search({
      minX: minLon,
      minY: minLat,
      maxX: maxLon,
      maxY: maxLat,
    });
  }
}

module.exports = RTreeIndex;
