const { VehicleDistanceTimeline } = require('../data-structures/DistanceSegmentTree');

const timeline = new VehicleDistanceTimeline(16);

const t0 = 1713500000000;

timeline.pointUpdateByTime(t0 + 0 * 1000, 0.30);
timeline.pointUpdateByTime(t0 + 1 * 1000, 0.45);
timeline.pointUpdateByTime(t0 + 2 * 1000, 0.50);
timeline.pointUpdateByTime(t0 + 3 * 1000, 0.35);
timeline.pointUpdateByTime(t0 + 4 * 1000, 0.40);

const q1 = timeline.rangeDistanceByTime(t0 + 1 * 1000, t0 + 3 * 1000);
console.log('Distance from t1 to t3 (km):', q1.toFixed(2));

// Correct one GPS point: update distance at t2 from 0.50 -> 0.55
timeline.pointUpdateByTime(t0 + 2 * 1000, 0.55);

const q2 = timeline.rangeDistanceByTime(t0 + 1 * 1000, t0 + 3 * 1000);
console.log('After point update, distance from t1 to t3 (km):', q2.toFixed(2));

const q3 = timeline.rangeDistanceByTime(t0 + 0 * 1000, t0 + 4 * 1000);
console.log('Distance from t0 to t4 (km):', q3.toFixed(2));
