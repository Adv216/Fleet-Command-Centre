const { RTree } = require('../data-structures/RTree');

const vehicles = [
  { vehicleId: 'V101', lat: 12.9716, lon: 77.5946 },
  { vehicleId: 'V102', lat: 12.976, lon: 77.6 },
  { vehicleId: 'V103', lat: 12.98, lon: 77.58 },
  { vehicleId: 'V104', lat: 12.95, lon: 77.59 },
  { vehicleId: 'V105', lat: 12.99, lon: 77.61 },
];

const rtree = new RTree({ maxEntries: 8 });

for (const v of vehicles) {
  rtree.upsertVehicle(v.vehicleId, v.lat, v.lon, { status: 'active' });
}

rtree.upsertVehicle('V102', 12.977, 77.601, { status: 'active', note: 'updated position' });

const nearby = rtree.rangeSearchRadius(12.9716, 77.5946, 3, { sort: true, limit: 10 });
const nearest = rtree.nearestNeighbor(12.9716, 77.5946);

console.log('Range Search (3 km):');
console.log(JSON.stringify(nearby, null, 2));

console.log('Nearest Neighbor:');
console.log(JSON.stringify(nearest, null, 2));
