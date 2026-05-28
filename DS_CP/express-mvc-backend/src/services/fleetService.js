const { RTree } = require('../data-structures/RTree');
const { VehicleSpeedMaxHeap } = require('../data-structures/VehicleSpeedMaxHeap');
const { VehicleDistanceTimeline } = require('../data-structures/DistanceSegmentTree');
const { DBSCAN } = require('../data-structures/DBSCAN');
const websocketService   = require('./websocketService');
const anomalyService     = require('./anomalyService');
const cityStatsService   = require('./cityStatsService');
const trailService       = require('./trailService');
const etaService         = require('./etaService');
const priorityService    = require('./priorityService');
const perfService        = require('./perfService');
const deliveryService    = require('./deliveryService');
const breakdownService   = require('./breakdownService');

const latestByVehicle = new Map();
const previousLocationByVehicle = new Map();
const distanceTimelineByVehicle = new Map();
const topSpeedHeap = new VehicleSpeedMaxHeap();
const spatialIndex = new RTree({ maxEntries: 32 });
const DEFAULT_HISTORY_POINTS = 4096;
const LIVE_CACHE_TTL_MS = 250;
const CLUSTER_CACHE_TTL_MS = 1000;
const MAX_CLUSTER_POINTS = 5000;
const CLUSTER_MAX_STALE_MS = 3000;
const MAX_CACHE_KEYS = 32;
const TOP_CACHE_TTL_MS = 200;
const SUMMARY_CACHE_TTL_MS = 250;
const HOTSPOT_CACHE_TTL_MS = 1000;
const SPEED_BUCKET_BOUNDS = [20, 40, 60, 80, 100, 120, Infinity];
const HIGH_SPEED_THRESHOLD = 80;
const MOVING_SPEED_THRESHOLD = 5;

let stateVersion = 0;
const liveCacheByLimit = new Map();
const clusterCacheByKey = new Map();
const topCacheByK = new Map();
const summaryCache = { version: -1, computedAt: 0, data: null };
const hotspotCacheByKey = new Map();

const speedByVehicle = new Map();
const speedBucketCounts = new Array(SPEED_BUCKET_BOUNDS.length).fill(0);
let totalSpeedKmph = 0;
let movingVehiclesCount = 0;
let highSpeedVehiclesCount = 0;

function enforceCacheLimit(cacheMap) {
  while (cacheMap.size > MAX_CACHE_KEYS) {
    const oldestKey = cacheMap.keys().next().value;
    cacheMap.delete(oldestKey);
  }
}

function minHeapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].timestamp <= heap[i].timestamp) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function minHeapReplaceRoot(heap, item) {
  if (heap.length === 0) return;
  heap[0] = item;
  let i = 0;
  while (true) {
    const left = i * 2 + 1;
    const right = i * 2 + 2;
    let smallest = i;

    if (left < heap.length && heap[left].timestamp < heap[smallest].timestamp) {
      smallest = left;
    }
    if (right < heap.length && heap[right].timestamp < heap[smallest].timestamp) {
      smallest = right;
    }
    if (smallest === i) break;
    [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
    i = smallest;
  }
}

function hotspotMinHeapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].count <= heap[i].count) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function hotspotMinHeapReplaceRoot(heap, item) {
  if (heap.length === 0) return;
  heap[0] = item;
  let i = 0;
  while (true) {
    const left = i * 2 + 1;
    const right = i * 2 + 2;
    let smallest = i;

    if (left < heap.length && heap[left].count < heap[smallest].count) {
      smallest = left;
    }
    if (right < heap.length && heap[right].count < heap[smallest].count) {
      smallest = right;
    }
    if (smallest === i) break;
    [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
    i = smallest;
  }
}

function distanceMaxHeapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].distanceKm >= heap[i].distanceKm) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function distanceMaxHeapReplaceRoot(heap, item) {
  if (heap.length === 0) return;
  heap[0] = item;
  let i = 0;
  while (true) {
    const left = i * 2 + 1;
    const right = i * 2 + 2;
    let largest = i;

    if (left < heap.length && heap[left].distanceKm > heap[largest].distanceKm) {
      largest = left;
    }
    if (right < heap.length && heap[right].distanceKm > heap[largest].distanceKm) {
      largest = right;
    }
    if (largest === i) break;
    [heap[i], heap[largest]] = [heap[largest], heap[i]];
    i = largest;
  }
}

function getSpeedBucketIndex(speed) {
  if (speed < 20) return 0;
  if (speed < 40) return 1;
  if (speed < 60) return 2;
  if (speed < 80) return 3;
  if (speed < 100) return 4;
  if (speed < 120) return 5;
  return 6;
}

function applySpeedDeltas(vehicleId, newSpeed) {
  const previousSpeed = speedByVehicle.get(vehicleId);

  if (Number.isFinite(previousSpeed)) {
    totalSpeedKmph -= previousSpeed;
    speedBucketCounts[getSpeedBucketIndex(previousSpeed)] -= 1;
    if (previousSpeed >= MOVING_SPEED_THRESHOLD) movingVehiclesCount -= 1;
    if (previousSpeed >= HIGH_SPEED_THRESHOLD) highSpeedVehiclesCount -= 1;
  }

  speedByVehicle.set(vehicleId, newSpeed);
  totalSpeedKmph += newSpeed;
  speedBucketCounts[getSpeedBucketIndex(newSpeed)] += 1;
  if (newSpeed >= MOVING_SPEED_THRESHOLD) movingVehiclesCount += 1;
  if (newSpeed >= HIGH_SPEED_THRESHOLD) highSpeedVehiclesCount += 1;
}

function samplePointsForClustering(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
    if (sampled.length >= maxPoints) break;
  }
  return sampled;
}

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

function getOrCreateDistanceTimeline(vehicleId) {
  if (!distanceTimelineByVehicle.has(vehicleId)) {
    distanceTimelineByVehicle.set(vehicleId, new VehicleDistanceTimeline(DEFAULT_HISTORY_POINTS));
  }
  return distanceTimelineByVehicle.get(vehicleId);
}

function buildClusterSummary(result, includeVehicleIds) {
  return result.clusters.map((cluster, idx) => {
    let sumLat = 0;
    let sumLon = 0;
    for (const point of cluster) {
      sumLat += point.lat;
      sumLon += point.lon;
    }

    const summary = {
      clusterId: idx,
      size: cluster.length,
      centroid: {
        lat: cluster.length ? sumLat / cluster.length : 0,
        lon: cluster.length ? sumLon / cluster.length : 0,
      },
    };

    if (includeVehicleIds) {
      summary.vehicleIds = cluster.map((p) => p.vehicleId);
    }

    return summary;
  });
}

function processLocation(payload) {
  const { vehicleId, lat, lon, speed, timestamp = Date.now() } = payload;

  if (!vehicleId || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(speed)) {
    const error = new Error('vehicleId, lat, lon, speed are required and must be valid');
    error.status = 400;
    throw error;
  }

  const previous = previousLocationByVehicle.get(vehicleId);
  const distanceDeltaKm = previous ? haversineKm(previous.lat, previous.lon, lat, lon) : 0;

  const point = { vehicleId, lat, lon, speed, timestamp, distanceDeltaKm };
  latestByVehicle.set(vehicleId, point);
  applySpeedDeltas(vehicleId, speed);
  previousLocationByVehicle.set(vehicleId, { lat, lon, timestamp });
  // Instrumented R-Tree insert
  perfService.measureRTreeInsert(() =>
    spatialIndex.upsertVehicle(vehicleId, lat, lon, { speed, timestamp })
  );

  const distanceTimeline = getOrCreateDistanceTimeline(vehicleId);
  try {
    perfService.measureSegTree(() =>
      distanceTimeline.pointUpdateByTime(timestamp, distanceDeltaKm)
    );
  } catch (_error) {}

  perfService.measureHeapOp(() =>
    topSpeedHeap.insertOrUpdate(vehicleId, speed, { timestamp, lat, lon })
  );

  // Trail history
  trailService.push(vehicleId, lat, lon, speed, timestamp);

  // Anomaly detection
  anomalyService.detect(vehicleId, lat, lon, speed, payload.city);

  // City stats
  cityStatsService.update(vehicleId, payload.city, speed);

  // ETA tracking
  etaService.updateVehicleETA(vehicleId, lat, lon, speed);

  // Priority dispatch
  const etaRec = etaService.getVehicleETA(vehicleId);
  priorityService.updatePriority(vehicleId, speed, etaRec ? etaRec.delayMinutes : 0, etaRec ? etaRec.distanceKm : null);

  // Delivery progress
  deliveryService.updateProgress(vehicleId, speed, distanceDeltaKm);

  // Breakdown detection
  const vehicleDelivery = deliveryService.getVehicleDelivery(vehicleId);
  breakdownService.recordPosition(vehicleId, lat, lon, speed);
  breakdownService.checkVehicle(vehicleId, lat, lon, speed, vehicleDelivery);

  // Perf throughput
  perfService.tick(1);

  stateVersion += 1;

  websocketService.broadcastLocation(point);

  return point;
}

function getTopSpeedVehicles(k = 10) {
  const limit = Math.max(1, Math.min(Number(k) || 10, 1000));
  const now = Date.now();
  const cacheKey = `${limit}`;
  const cached = topCacheByK.get(cacheKey);

  if (cached && now - cached.computedAt <= TOP_CACHE_TTL_MS) {
    return cached.data;
  }

  const data = topSpeedHeap.getTopK(limit);
  topCacheByK.set(cacheKey, {
    computedAt: now,
    data,
  });
  enforceCacheLimit(topCacheByK);

  return data;
}

function getVehicleHistoryDistance(vehicleId, startTs, endTs) {
  const timeline = distanceTimelineByVehicle.get(vehicleId);
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
    const error = new Error('startTs and endTs query params are required numbers');
    error.status = 400;
    throw error;
  }

  if (!timeline) {
    return {
      vehicleId,
      startTs,
      endTs,
      totalDistanceKm: 0,
    };
  }

  return {
    vehicleId,
    startTs,
    endTs,
    totalDistanceKm: timeline.rangeDistanceByTime(startTs, endTs),
  };
}

function getVehicleRangeMetrics(vehicleId, startTs, endTs) {
  return getVehicleHistoryDistance(vehicleId, startTs, endTs);
}

function getLiveVehicles(limit = 1000) {
  const bounded = Math.max(1, Math.min(Number(limit) || 1000, 10000));
  const now = Date.now();

  const cacheKey = `${bounded}`;
  const cached = liveCacheByLimit.get(cacheKey);
  if (cached && now - cached.computedAt <= LIVE_CACHE_TTL_MS) {
    return cached.data;
  }

  // O(n log k): keep only latest k vehicles by timestamp in a min-heap.
  const minHeap = [];
  for (const point of latestByVehicle.values()) {
    if (minHeap.length < bounded) {
      minHeapPush(minHeap, point);
    } else if (point.timestamp > minHeap[0].timestamp) {
      minHeapReplaceRoot(minHeap, point);
    }
  }

  const data = minHeap.sort((a, b) => b.timestamp - a.timestamp);
  liveCacheByLimit.set(cacheKey, {
    version: stateVersion,
    computedAt: now,
    data,
  });
  enforceCacheLimit(liveCacheByLimit);

  return data;
}

function getNearbyVehicles(lat, lon, radiusKm = 5, limit = 1000) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    const error = new Error('lat, lon, radiusKm must be valid numbers');
    error.status = 400;
    throw error;
  }

  const bounded = Math.max(1, Math.min(Number(limit) || 1000, 10000));
  const nearbyEntries = spatialIndex.rangeSearchRadius(lat, lon, radiusKm, {
    sort: true,
    limit: bounded,
  });

  const result = [];
  for (const entry of nearbyEntries) {
    const latest = latestByVehicle.get(entry.vehicleId);
    if (!latest) continue;
    result.push({ ...latest, distanceKm: entry.distanceKm });
  }
  return result;
}

function getNearestVehicle(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const error = new Error('lat and lon must be valid numbers');
    error.status = 400;
    throw error;
  }

  const nearest = spatialIndex.nearestNeighbor(lat, lon);
  if (!nearest) return null;

  const latest = latestByVehicle.get(nearest.vehicleId);
  if (!latest) {
    return {
      vehicleId: nearest.vehicleId,
      lat: nearest.lat,
      lon: nearest.lon,
      distanceKm: nearest.distanceKm,
    };
  }

  return {
    ...latest,
    distanceKm: nearest.distanceKm,
  };
}

function getNearestVehicles(lat, lon, k = 5) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const error = new Error('lat and lon must be valid numbers');
    error.status = 400;
    throw error;
  }

  const limit = Math.max(1, Math.min(Number(k) || 5, 50));
  if (latestByVehicle.size === 0) return [];

  // O(n log k): scan once, keep only top-k closest in a max-heap.
  const nearestHeap = [];
  for (const point of latestByVehicle.values()) {
    const distanceKm = haversineKm(lat, lon, point.lat, point.lon);
    const candidate = { ...point, distanceKm };

    if (nearestHeap.length < limit) {
      distanceMaxHeapPush(nearestHeap, candidate);
    } else if (distanceKm < nearestHeap[0].distanceKm) {
      distanceMaxHeapReplaceRoot(nearestHeap, candidate);
    }
  }

  return nearestHeap.sort((a, b) => a.distanceKm - b.distanceKm);
}

function getVehicleClusters(epsKm = 0.5, minPts = 3, includeVehicleIds = false) {
  const eps = Number.isFinite(epsKm) ? epsKm : 0.5;
  const min = Number.isFinite(minPts) ? Math.max(1, Math.floor(minPts)) : 3;
  const includeIds = Boolean(includeVehicleIds);
  const cacheKey = `${eps}:${min}:${includeIds ? 1 : 0}`;
  const now = Date.now();

  const cached = clusterCacheByKey.get(cacheKey);
  if (cached && now - cached.computedAt <= CLUSTER_CACHE_TTL_MS) {
    return cached.data;
  }

  // Under continuous updates, avoid recomputing clusters on every request by allowing
  // a bounded staleness window.
  if (
    cached &&
    now - cached.computedAt <= CLUSTER_MAX_STALE_MS &&
    stateVersion - cached.version < 200
  ) {
    return cached.data;
  }

  const points = Array.from(latestByVehicle.values());
  if (points.length === 0) {
    const empty = {
      clusterCount: 0,
      noiseCount: 0,
      clusters: [],
      noiseVehicleIds: [],
      clusteredPoints: 0,
      totalLivePoints: 0,
    };
    clusterCacheByKey.set(cacheKey, {
      version: stateVersion,
      computedAt: now,
      data: empty,
    });
    enforceCacheLimit(clusterCacheByKey);
    return empty;
  }

  const pointsForClustering = samplePointsForClustering(points, MAX_CLUSTER_POINTS);

  const dbscan = new DBSCAN({
    epsKm: eps,
    minPts: min,
  });

  const result = dbscan.run(pointsForClustering);
  const response = {
    clusterCount: result.clusterCount,
    noiseCount: result.noiseCount,
    clusters: buildClusterSummary(result, includeIds),
    noiseVehicleIds: result.noise.map((p) => p.vehicleId),
    clusteredPoints: pointsForClustering.length,
    totalLivePoints: points.length,
  };

  clusterCacheByKey.set(cacheKey, {
    version: stateVersion,
    computedAt: now,
    data: response,
  });
  enforceCacheLimit(clusterCacheByKey);

  return response;
}

function getFleetSummary() {
  const now = Date.now();
  if (
    summaryCache.data &&
    summaryCache.version === stateVersion &&
    now - summaryCache.computedAt <= SUMMARY_CACHE_TTL_MS
  ) {
    return summaryCache.data;
  }

  const liveVehicles = latestByVehicle.size;
  const avgSpeedKmph = liveVehicles > 0 ? totalSpeedKmph / liveVehicles : 0;

  const speedDistribution = speedBucketCounts.map((count, idx) => {
    const upper = SPEED_BUCKET_BOUNDS[idx];
    const lower = idx === 0 ? 0 : SPEED_BUCKET_BOUNDS[idx - 1];
    const label = Number.isFinite(upper) ? `${lower}-${upper}` : `${lower}+`;
    return { label, count };
  });

  const data = {
    liveVehicles,
    movingVehicles: movingVehiclesCount,
    idleVehicles: Math.max(0, liveVehicles - movingVehiclesCount),
    highSpeedVehicles: highSpeedVehiclesCount,
    avgSpeedKmph,
    speedDistribution,
    updatedAt: now,
  };

  summaryCache.version = stateVersion;
  summaryCache.computedAt = now;
  summaryCache.data = data;

  return data;
}

function getHotspots(cellSizeKm = 2, limit = 10) {
  const km = Number.isFinite(cellSizeKm) ? cellSizeKm : 2;
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 10, 100));

  if (km <= 0) {
    const error = new Error('cellSizeKm must be a valid positive number');
    error.status = 400;
    throw error;
  }

  const now = Date.now();
  const cacheKey = `${km}:${boundedLimit}`;
  const cached = hotspotCacheByKey.get(cacheKey);
  if (
    cached &&
    cached.version === stateVersion &&
    now - cached.computedAt <= HOTSPOT_CACHE_TTL_MS
  ) {
    return cached.data;
  }

  const latStep = km / 110.574;
  const grid = new Map();

  for (const point of latestByVehicle.values()) {
    const lonDivisor = Math.max(0.15, Math.cos((point.lat * Math.PI) / 180));
    const lonStep = km / (111.32 * lonDivisor);
    const row = Math.floor(point.lat / latStep);
    const col = Math.floor(point.lon / lonStep);
    const key = `${row}:${col}`;

    let bucket = grid.get(key);
    if (!bucket) {
      bucket = {
        key,
        count: 0,
        sumLat: 0,
        sumLon: 0,
        sumSpeed: 0,
        maxSpeed: 0,
      };
      grid.set(key, bucket);
    }

    bucket.count += 1;
    bucket.sumLat += point.lat;
    bucket.sumLon += point.lon;
    bucket.sumSpeed += point.speed;
    bucket.maxSpeed = Math.max(bucket.maxSpeed, point.speed);
  }

  const topGrid = [];
  for (const bucket of grid.values()) {
    if (topGrid.length < boundedLimit) {
      hotspotMinHeapPush(topGrid, bucket);
    } else if (bucket.count > topGrid[0].count) {
      hotspotMinHeapReplaceRoot(topGrid, bucket);
    }
  }

  const hotspots = topGrid
    .sort((a, b) => b.count - a.count)
    .map((bucket, idx) => ({
      rank: idx + 1,
      cellId: bucket.key,
      count: bucket.count,
      centroid: {
        lat: bucket.count ? bucket.sumLat / bucket.count : 0,
        lon: bucket.count ? bucket.sumLon / bucket.count : 0,
      },
      avgSpeedKmph: bucket.count ? bucket.sumSpeed / bucket.count : 0,
      maxSpeedKmph: bucket.maxSpeed,
    }));

  const data = {
    cellSizeKm: km,
    totalCells: grid.size,
    hotspots,
  };

  hotspotCacheByKey.set(cacheKey, {
    version: stateVersion,
    computedAt: now,
    data,
  });
  enforceCacheLimit(hotspotCacheByKey);

  return data;
}

function getVehicleTrail(vehicleId) { return trailService.getTrail(vehicleId); }

module.exports = {
  processLocation,
  getLiveVehicles,
  getVehicleHistoryDistance,
  getTopSpeedVehicles,
  getVehicleRangeMetrics,
  getNearbyVehicles,
  getNearestVehicle,
  getNearestVehicles,
  getVehicleClusters,
  getFleetSummary,
  getHotspots,
  getVehicleTrail,
};