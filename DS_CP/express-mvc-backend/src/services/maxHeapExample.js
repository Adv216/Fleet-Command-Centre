const { VehicleSpeedMaxHeap } = require('../data-structures/VehicleSpeedMaxHeap');

const heap = new VehicleSpeedMaxHeap();

heap.batchInsertOrUpdate([
	{ vehicleId: 'V1', speedKmph: 74.2, metadata: { driver: 'A' } },
	{ vehicleId: 'V2', speedKmph: 82.5, metadata: { driver: 'B' } },
	{ vehicleId: 'V3', speedKmph: 67.1, metadata: { driver: 'C' } },
	{ vehicleId: 'V4', speedKmph: 91.3, metadata: { driver: 'D' } },
	{ vehicleId: 'V5', speedKmph: 88.8, metadata: { driver: 'E' } },
	{ vehicleId: 'V6', speedKmph: 78.0, metadata: { driver: 'F' } },
	{ vehicleId: 'V7', speedKmph: 64.9, metadata: { driver: 'G' } },
	{ vehicleId: 'V8', speedKmph: 95.4, metadata: { driver: 'H' } },
	{ vehicleId: 'V9', speedKmph: 83.7, metadata: { driver: 'I' } },
	{ vehicleId: 'V10', speedKmph: 76.6, metadata: { driver: 'J' } },
	{ vehicleId: 'V11', speedKmph: 69.5, metadata: { driver: 'K' } },
	{ vehicleId: 'V12', speedKmph: 85.0, metadata: { driver: 'L' } },
]);

// Speed updates from new GPS points.
heap.insertOrUpdate('V3', 92.1, { driver: 'C', note: 'new GPS update' });
heap.insertOrUpdate('V10', 71.4, { driver: 'J', note: 'traffic slowdown' });

const top10 = heap.getTopK(10);

console.log('Top 10 fastest vehicles:');
console.log(JSON.stringify(top10, null, 2));

console.log('Current max vehicle:');
console.log(JSON.stringify(heap.peek(), null, 2));
