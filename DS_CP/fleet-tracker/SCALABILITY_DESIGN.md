# Scalable and Low-Latency Design Upgrade

This document upgrades the existing fleet tracker from a working college demo to a production-grade architecture blueprint with explicit scalability and performance details.

## 1. Target Non-Functional Goals

- Ingestion: 10,000 vehicle updates per second sustained, 30,000 per second burst
- End-to-end freshness (device to dashboard): p95 under 500 ms, p99 under 1 second
- Query latency:
  - live map viewport: p95 under 100 ms
  - nearby search: p95 under 120 ms
  - top-K queries: p95 under 80 ms
  - history range query: p95 under 250 ms for 24-hour windows
- Availability: 99.9% for read APIs, 99.5% for full real-time pipeline

## 2. Improved High-Level Architecture (Text Diagram)

```text
[GPS Devices / Mobile SDKs]
   -> MQTT over TLS / HTTPS
[Global LB + API Gateway]
   -> auth, quota, schema validation, idempotency check
[Ingestion Service]
   -> append to Kafka topic gps.raw (partition key = vehicle_id)

[Stream Processing Cluster (Flink / Kafka Streams)]
   -> parse + enrich + dedupe + late-event handling
   -> branch A: Latest state updater (Redis Cluster)
   -> branch B: Spatial index updater (R-Tree shard workers)
   -> branch C: Time index updater (Segment Tree shard workers)
   -> branch D: Top-K aggregator (Heap per metric/shard + global merge)
   -> branch E: Clustering pipeline (DBSCAN real-time + K-Means batch)
   -> branch F: Alert rules and notification events
   -> persist raw/enriched to TSDB + Object Storage

[Online Query Layer]
   -> Query API (REST/GraphQL)
   -> WebSocket fanout service
   -> cache layer (Redis read-through)

[Storage Layer]
   -> Redis Cluster (hot, latest state, short history)
   -> PostgreSQL/Timescale or Cassandra (durable time-series)
   -> Object storage (Parquet) for analytics and replay

[Frontend]
   -> map rendering + timeline + top-K + clusters + alerts
```

## 3. Service Responsibilities (Detailed)

1. API Gateway
- JWT validation and device token checks
- Global rate limit and per-device quotas
- Payload size and schema validation
- Optional request signature validation

2. Ingestion Service
- Converts protocol payloads into canonical event schema
- Adds ingest timestamp and trace id
- Publishes to Kafka with retry and idempotent producer

3. Stream Processor
- Enrichment: speed smoothing, heading normalization, geofence pre-tagging
- Dedupe: event_id and vehicle sequence number checks
- Late event policy: accept within configurable watermark (for example 5 seconds)
- Emits clean events to downstream topics and storage sinks

4. Spatial Index Service
- Maintains distributed in-memory R-Tree shards by geohash prefix
- Supports viewport query and nearest neighbor query
- Performs periodic snapshot/restore for fast recovery

5. Time Query Service
- Maintains per-vehicle Segment Tree over rolling time windows
- Serves max speed, sum distance, idle duration in arbitrary ranges
- Compacts old data into coarser buckets for memory efficiency

6. Top-K Service
- Maintains shard-local heaps for each metric
- Periodic global merge of shard heaps to produce exact global top-K
- Supports metric windows: now, 5 min, 1 hour

7. Clustering Service
- Real-time DBSCAN on active points in each region shard
- Optional mini-batch K-Means for route or behavior profiling
- Publishes cluster snapshots and centroid drift metrics

8. Alert Service
- Rule engine on stream: overspeed, idle too long, route deviation, geofence events
- Deduplicates repetitive alerts and adds cooldown windows

9. Query/API Service
- Uses hot path from Redis and in-memory indexes for low latency
- Falls back to TSDB for deep history
- Supports pagination, cursor-based scrolling, and bounding-box filters

10. WebSocket Fanout
- Region-room and fleet-room channels to reduce broadcast volume
- Delta updates instead of full payload pushes
- Backpressure and client rate caps

## 4. Data Flow with Latency Budget

1. Device sends event every second (0 to 100 ms network variance)
2. Gateway + ingestion validation (10 to 30 ms)
3. Kafka append and replication ack (10 to 40 ms)
4. Stream processing and index updates (40 to 150 ms)
5. Query read + websocket emit (30 to 120 ms)
6. Frontend render (20 to 80 ms)

Expected total p95: around 200 to 420 ms.

## 5. Database and Storage Design

### 5.1 Hot Storage (Redis Cluster)

Keys:
- vehicle:latest:{vehicle_id} -> latest telemetry JSON
- geo:cell:{geohash} -> active vehicle ids in cell
- topk:{metric}:{window} -> sorted top-K snapshot
- cluster:latest:{region} -> cluster JSON snapshot

Retention:
- latest state: 24 hours
- short history cache: 15 to 60 minutes for fast replay

### 5.2 Durable Time-Series Storage

Primary choice for college report:
- PostgreSQL + Timescale extension

Table strategy:
- gps_events hypertable partitioned by day and hash(vehicle_id)
- compression on older chunks
- retention policy for raw data and downsampled aggregates

Indexes:
- (vehicle_id, event_time DESC)
- (fleet_id, event_time DESC)
- optional PostGIS geom index for historical geo lookups

### 5.3 Data Lake

- Store raw and enriched events as Parquet partitioned by date/hour/region
- Enables offline analytics, model training, and replay testing

## 6. Data Structure Placement and Complexity

1. R-Tree
- Placement: Spatial Index Service per region shard
- Query complexity:
  - insertion: approximately O(log n)
  - nearest/range: O(log n + m), m = result count
- Notes:
  - Keep one active R-Tree per shard
  - Rebuild asynchronously during heavy churn windows

2. Segment Tree
- Placement: Time Query Service per vehicle shard
- Use-case:
  - range max speed, range sum distance, range count idle
- Complexity:
  - point update O(log n)
  - range query O(log n)
- Memory optimization:
  - ring-buffer leaves + periodic downsampling

3. Heap
- Placement: Top-K Service
- Use-case:
  - top K speed, distance, delay, idle
- Complexity:
  - update O(log K)
  - top element O(1)
- Distributed strategy:
  - local heaps per shard
  - merge heaps every 1 second for global top-K

4. DBSCAN or K-Means
- DBSCAN placement: real-time cluster worker by region
- K-Means placement: batch analytics pipeline (5 to 15 minute intervals)
- Trade-off:
  - DBSCAN handles noise and unknown cluster count
  - K-Means is cheaper and stable for periodic grouping

## 7. Partitioning and Horizontal Scale

- Kafka partitions:
  - start with 48 partitions for gps.raw
  - scale to 96 for burst and future growth
- Stream processors:
  - at least one consumer task per partition group
- Spatial sharding:
  - geohash prefix level 4 to 6 depending on city scale
- Time-series sharding:
  - hash(vehicle_id) for write parallelism

Rule of thumb:
- Keep per-shard active vehicles under 20k for predictable latency

## 8. Fault Tolerance and Correctness

- At-least-once ingestion with idempotent write semantics
- Per-vehicle ordering guaranteed by partition key vehicle_id
- Processor checkpoints every few seconds
- Dead-letter topic for malformed payloads
- Snapshot recovery for in-memory indexes

## 9. Observability and SLO Monitoring

Track these metrics:
- ingest_events_per_second
- kafka_consumer_lag
- stream_processing_latency_ms
- websocket_fanout_latency_ms
- query_p95_ms and query_p99_ms by endpoint
- dropped_messages and dedupe_rate
- cluster_compute_time_ms

Alert examples:
- consumer lag > 10 seconds for 3 minutes
- p95 live query latency > 150 ms
- websocket delivery success < 99%

## 10. Security and Multi-Tenancy

- TLS for all external traffic
- mTLS internal optional for service-to-service communication
- Role-based access for fleet operators and admins
- Fleet-level tenant isolation in keys and query filters
- PII minimization and encrypted storage for sensitive fields

## 11. Capacity Planning Example (10k Vehicles)

Input rate:
- 10k events/sec
- event size approximately 220 bytes payload + protocol overhead

Rough data volume:
- raw event stream about 2.2 MB/sec payload-only
- around 190 GB/day before compression and metadata

Practical storage policy:
- keep raw 7 to 30 days hot
- move older data to Parquet/object storage
- maintain hourly aggregates for long-term analytics

## 12. Upgrade Path from Current Project

Phase 1 (already done):
- single-node in-memory pipeline with required data structures

Phase 2:
- swap in Kafka and Redis
- move simulator and API into separate processes
- add Timescale persistence

Phase 3:
- deploy processor replicas and shard indexes
- add observability stack and autoscaling
- introduce alerting and replay workflows

## 13. Viva-Ready Summary

- The system is event-driven and horizontally scalable.
- Low latency comes from hot in-memory indexes and websocket push.
- Correctness comes from per-vehicle ordering, idempotency, and checkpointing.
- Required data structures are integrated into separate, purpose-built services.
- Architecture can evolve from college demo to production without redesigning core flow.
