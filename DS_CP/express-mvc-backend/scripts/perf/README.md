# Performance Testing Scripts

This folder contains scripts to test API performance and memory behavior for fleet sizes between 1,000 and 10,000 vehicles.

## Script

- `runPerformanceTest.js`

## What It Measures

- Ingestion API response time (`POST /api/fleet/location`)
- Query performance:
  - `GET /api/vehicles/live`
  - `GET /api/vehicles/nearby`
  - `GET /api/vehicles/top`
  - `GET /api/vehicles/clusters`
  - `GET /api/vehicles/history/:vehicleId`
- Memory usage:
  - Backend memory from `GET /api/health`
  - Load generator (script) memory from `process.memoryUsage()`

## Usage

1. Start backend (example on port 4001):

```powershell
$env:PORT=4001
npm start
```

2. Run performance suite:

```powershell
npm run perf:test
```

## Optional Environment Variables

- `PERF_BASE_URL` (default: `http://localhost:4001/api`)
- `PERF_VEHICLES` comma-separated scenarios (default: `1000,5000,10000`)
- `PERF_CONCURRENCY` ingestion concurrency (default: `120`)
- `PERF_QUERY_ITERATIONS` iterations per query endpoint (default: `40`)

Example:

```powershell
$env:PERF_BASE_URL='http://localhost:4001/api'
$env:PERF_VEHICLES='1000,3000,10000'
$env:PERF_CONCURRENCY='150'
$env:PERF_QUERY_ITERATIONS='50'
npm run perf:test
```

## Metrics Logging Output

The script writes logs to `scripts/perf/results/`:

- JSON report: `perf-report-<timestamp>.json`
- CSV query summary: `perf-query-metrics-<timestamp>.csv`

These files include:

- p50, p95, p99 response times
- average and max latencies
- per-scenario durations
- memory snapshots
