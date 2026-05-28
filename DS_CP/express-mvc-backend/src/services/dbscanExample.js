const { DBSCAN } = require('../data-structures/DBSCAN');

const vehicles = [
  { vehicleId: 'V1', lat: 12.9716, lon: 77.5946 },
  { vehicleId: 'V2', lat: 12.9721, lon: 77.5951 },
  { vehicleId: 'V3', lat: 12.9719, lon: 77.5949 },
  { vehicleId: 'V4', lat: 12.9723, lon: 77.5952 },

  { vehicleId: 'V5', lat: 12.9905, lon: 77.6102 },
  { vehicleId: 'V6', lat: 12.9901, lon: 77.6105 },
  { vehicleId: 'V7', lat: 12.9909, lon: 77.6108 },
  { vehicleId: 'V8', lat: 12.9912, lon: 77.6104 },

  { vehicleId: 'V9', lat: 13.05, lon: 77.72 },
  { vehicleId: 'V10', lat: 12.89, lon: 77.48 },
];

const dbscan = new DBSCAN({
  epsKm: 0.25,
  minPts: 3,
});

const result = dbscan.run(vehicles);

console.log('Cluster count:', result.clusterCount);
console.log('Noise count:', result.noiseCount);

const summary = result.clusters.map((cluster, idx) => ({
  clusterId: idx,
  size: cluster.length,
  vehicleIds: cluster.map((v) => v.vehicleId),
}));

console.log('Clusters:');
console.log(JSON.stringify(summary, null, 2));

console.log('Noise vehicleIds:');
console.log(JSON.stringify(result.noise.map((v) => v.vehicleId), null, 2));
