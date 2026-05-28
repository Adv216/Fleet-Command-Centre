# Scalable and High-Performance Design (Express MVC Backend)

This document upgrades the current backend design to handle high event rates, low-latency real-time updates, and safe memory behavior.

## 1. Performance Goals

- Sustained ingestion: 1,000 vehicle updates/second
- Burst tolerance: 5,000 updates/second for short intervals
- End-to-end event freshness (ingest to websocket): p95 < 300 ms
- API latencies:
  - top-K query: p95 < 80 ms
  - range metrics: p95 < 120 ms
  - nearby query: p95 < 100 ms
- Service availability: 99.9%

## 2. Improved High-Level Architecture

```text
[Vehicle/Simulator Clients]
    -> HTTP/MQTT Ingestion Layer
        -> Message Broker (Kafka/RabbitMQ/NATS)
            -> Stream Processor Workers
               -> Spatial Index Service (R-Tree shards)
               -> Time Index Service (Segment Tree per vehicle)
               -> Ranking Service (Heap-based top-K)
               -> Alert Service (optional)
               -> WebSocket Gateway (Socket.IO rooms)
            -> Storage Layer
               -> Redis (hot cache/latest state)
               -> PostgreSQL/TimescaleDB (durable history)
               -> Object storage (cold archive)
```

## 3. Service Responsibilities (Detailed)

1. API Gateway / Ingestion
- Auth, schema validation, rate limiting
- Idempotency key checks
- Push event into queue for decoupling

2. Stream Processor
- Normalizes telemetry (speed/heading)
- Updates in-memory and distributed indexes
- Persists events asynchronously to durable storage

3. Spatial Index Service
- Uses R-Tree for bounding-box and nearby candidate queries
- Shards by geohash prefix to reduce index size per node

4. Time Query Service
- Uses Segment Tree for max/sum queries on rolling windows
- Each vehicle has a ring-buffer-backed timeline + segment tree

5. Top-K Service
- Heap for fast maintenance of top-speed or top-distance lists
- Keep per-shard heaps and merge globally every second

6. WebSocket Gateway
- Pushes incremental updates to subscribed rooms
- Backpressure and throttling for slow clients

## 4. Data Structures and Complexity

1. R-Tree ([src/data-structures/RTreeIndex.js](src/data-structures/RTreeIndex.js))
- Upsert: ~O(log n)
- Bounding-box search: ~O(log n + m), m = matches
- Benefit: avoids O(n) full scan for nearby queries

2. Segment Tree ([src/data-structures/SegmentTree.js](src/data-structures/SegmentTree.js))
- Point update: O(log n)
- Range max query: O(log n)
- Benefit: replaces O(n) range scans for time-based metrics

3. Heap ([src/data-structures/MaxHeap.js](src/data-structures/MaxHeap.js))
- Insert: O(log n)
- Extract max: O(log n)
- Top access: O(1)
- Benefit: supports continuous top-K maintenance

## 5. Memory and State Strategy

- Use typed arrays for simulator state (already implemented)
- Keep only rolling window per vehicle (e.g., last 2,048 points)
- Periodically compact stale heap entries
- Avoid copying full arrays per request
- Use bounded in-memory caches with TTL

## 6. Throughput and Scaling Plan

Horizontal scaling approach:

1. Partition by vehicle_id
- All events for one vehicle go to same partition for ordering

2. Worker autoscaling
- Increase stream processor replicas based on queue lag

3. Geo-sharding for spatial index
- Split by geohash to keep each R-Tree small and fast

4. Query tier scaling
- Separate read APIs from write/ingestion path

## 7. Persistence Model

Hot path:
- Redis stores latest state per vehicle and short replay buffers

Warm path:
- PostgreSQL/TimescaleDB stores historical telemetry
- Indexes: (vehicle_id, timestamp DESC), optional PostGIS point index

Cold path:
- Daily partitions archived to Parquet in object storage

## 8. Reliability and Fault Tolerance

- Queue acts as shock absorber during bursts
- At-least-once delivery with idempotent processing
- Dead-letter queue for malformed events
- Health checks + graceful shutdown hooks
- Snapshot/restore in-memory indexes for faster recovery

## 9. WebSocket Optimization

- Broadcast by room (fleet/region), not global emit
- Emit compact payloads (delta fields only)
- Batch updates per tick to reduce network overhead
- Disconnect slow consumers after threshold

## 10. Security and Multi-Tenant Readiness

- JWT validation at gateway
- Tenant isolation key in every event
- Per-tenant throttling and quotas
- Audit logs for write APIs

## 11. Recommended Environment Configuration

Extend [src/config/index.js](src/config/index.js) with:

- INGEST_RATE_LIMIT
- WS_BROADCAST_INTERVAL_MS
- MAX_POINTS_PER_VEHICLE
- TOPK_LIMIT_MAX
- HEAP_COMPACTION_FACTOR
- REDIS_URL
- DB_URL
- QUEUE_URL

## 12. Migration Path from Current Code

Phase 1 (current):
- Single-node Express app with in-memory indexes

Phase 2:
- Add broker + Redis + DB adapters
- Move processing to worker process

Phase 3:
- Add shard-aware services and horizontal scaling
- Add metrics and autoscaling policies

## 13. Quick Wins to Implement Next

1. Batch ingestion endpoint (array payload) to reduce HTTP overhead
2. WebSocket room subscriptions by region
3. Prometheus metrics endpoint for queue lag and p95 latency
4. Persistent storage adapter interface for Postgres/Redis
