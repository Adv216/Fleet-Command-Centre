# Real-Time Logistics Fleet Tracker 

This project is a complete, demo-ready implementation of a real-time fleet tracker designed for 10,000 vehicles sending updates every second.

For a production-grade scalability and low-latency design extension, see [SCALABILITY_DESIGN.md](SCALABILITY_DESIGN.md).

## Features

- Handles high-frequency GPS stream with simulated 10,000 vehicles
- R-Tree spatial indexing for nearby/region queries
- Segment Tree for fast time-range analytics
- Heap-based top-K queries (speed and distance)
- DBSCAN clustering for live hotspot detection
- REST APIs + WebSocket live stats dashboard

## High-Level Architecture Diagram (Text Form)

```text
[GPS Simulator / Vehicle Devices]
    -> [Event Bus (in-process stream)]
        -> [Processing Service]
             -> R-Tree update (spatial index)
             -> Segment Tree update (time-range metrics)
             -> Heap update (top-K fastest/top distance)
             -> DBSCAN clustering worker
             -> In-memory store (latest + history)
        -> [Query Service]
             -> REST APIs (/api/*)
             -> WebSocket push (fleet:stats)
        -> [Frontend Dashboard]
```

## Backend Services and Responsibilities

1. Ingestion + Event Bus
- Accepts GPS events from simulator
- Streams events to processing pipeline

2. Processing Service
- Updates latest vehicle state
- Updates R-Tree, Segment Tree, Heap structures
- Computes total distance and EPS (events per second)

3. Clustering Service
- Runs DBSCAN on current active points every 3 seconds
- Generates cluster snapshots

4. Query Service
- Live vehicles endpoint
- Nearby search endpoint
- History + time-range metrics endpoint
- Top-K endpoints
- Cluster endpoint

5. WebSocket Streamer
- Emits fleet stats every second to dashboard

## Data Flow (GPS -> processing -> storage -> frontend)

1. Simulator emits GPS updates every second.
2. Event bus publishes `gps.update`.
3. Processing service consumes each event.
4. Processing updates data structures and in-memory storage.
5. Query service reads processed state.
6. REST + WebSocket expose data to frontend.

## Database Schema (Submission-Ready)

The live demo uses in-memory data for speed and simplicity. For report submission, use this SQL schema from [schema.sql](schema.sql).

### Suggested Tables

- `vehicles`
- `gps_events`
- `vehicle_latest_state`
- `alerts`
- `cluster_snapshots`
- `topk_snapshots`

## Where Each Data Structure Is Used

1. R-Tree
- File: [src/structures/spatialIndex.js](src/structures/spatialIndex.js)
- Used for spatial lookup and candidate filtering in nearby search

2. Segment Tree
- File: [src/structures/segmentTree.js](src/structures/segmentTree.js)
- Used per-vehicle for range queries: max speed, total distance in interval

3. Heap (Top-K)
- File: [src/structures/topKHeap.js](src/structures/topKHeap.js)
- Maintains top-K vehicles by speed and distance in near real-time

4. DBSCAN
- File: [src/services/clusteringService.js](src/services/clusteringService.js)
- Finds dense clusters (traffic hotspots)

## API Endpoints

- `GET /api/health`
- `GET /api/live?limit=500`
- `GET /api/nearby?lat=12.97&lon=77.59&radiusKm=3`
- `GET /api/vehicle/:vehicleId/history?startTs=...&endTs=...`
- `GET /api/topk?metric=speed&k=10`
- `GET /api/topk?metric=distance&k=10`
- `GET /api/clusters`

## Run Instructions

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
copy .env.example .env
```

3. Start project

```bash
npm start
```

4. Open dashboard

- [public/index.html](public/index.html) is served at `http://localhost:8080`

## Performance Notes

- Simulator defaults: 10,000 events/sec (10k vehicles x 1 update/sec)
- In-memory indexing gives low-latency demo behavior for college setups
- DBSCAN input is capped for responsiveness on modest hardware

## Scalability and Performance Enhancements

- Event-driven architecture upgraded with queue-based buffering and backpressure strategy
- Explicit partitioning plan (vehicle-id partitioning and geo-sharding)
- Per-service latency budgets and p95/p99 performance targets
- Fault tolerance strategy with checkpoints, idempotency, and dead-letter handling
- Multi-tier storage plan (hot cache, time-series DB, object storage)
- Detailed observability and SLO metrics for operations

See full details in [SCALABILITY_DESIGN.md](SCALABILITY_DESIGN.md).

## Key Source Files

- [src/server.js](src/server.js)
- [src/simulator.js](src/simulator.js)
- [src/services/processingService.js](src/services/processingService.js)
- [src/services/queryService.js](src/services/queryService.js)
- [src/services/clusteringService.js](src/services/clusteringService.js)
- [src/structures/spatialIndex.js](src/structures/spatialIndex.js)
- [src/structures/segmentTree.js](src/structures/segmentTree.js)
- [src/structures/topKHeap.js](src/structures/topKHeap.js)
