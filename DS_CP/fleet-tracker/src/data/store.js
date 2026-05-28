class FleetStore {
  constructor() {
    this.latestByVehicle = new Map();
    this.vehicleHistory = new Map();
    this.previousPointByVehicle = new Map();
    this.topKByMetric = {
      speed: [],
      distance: [],
    };
    this.clusterSnapshot = [];
    this.lastProcessedAt = null;
  }

  getOrCreateHistory(vehicleId) {
    if (!this.vehicleHistory.has(vehicleId)) {
      this.vehicleHistory.set(vehicleId, []);
    }
    return this.vehicleHistory.get(vehicleId);
  }
}

module.exports = new FleetStore();
