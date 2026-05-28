const clustering = require('density-clustering');

class ClusteringService {
  constructor() {
    this.lastClusters = [];
  }

  runDBSCAN(vehicleStates) {
    const all = Array.from(vehicleStates.values());
    if (all.length === 0) {
      this.lastClusters = [];
      return this.lastClusters;
    }

    // Cap the point set so clustering stays responsive on modest college hardware.
    const points = all.slice(0, 3000);
    const dataset = points.map((v) => [v.lat, v.lon]);

    const dbscan = new clustering.DBSCAN();
    const epsilon = 0.015;
    const minPoints = 4;
    const clusters = dbscan.run(dataset, epsilon, minPoints);

    this.lastClusters = clusters.map((indices, idx) => {
      const members = indices.map((i) => points[i]);
      const centroid = members.reduce(
        (acc, cur) => {
          acc.lat += cur.lat;
          acc.lon += cur.lon;
          return acc;
        },
        { lat: 0, lon: 0 }
      );

      return {
        clusterId: idx + 1,
        size: members.length,
        centroid: {
          lat: centroid.lat / members.length,
          lon: centroid.lon / members.length,
        },
      };
    });

    return this.lastClusters;
  }
}

module.exports = {
  ClusteringService,
};
