const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:4001/api';
const SCENARIOS = (process.env.PERF_VEHICLES || '1000,5000,10000')
  .split(',')
  .map((x) => Number(x.trim()))
  .filter((x) => Number.isInteger(x) && x > 0);
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY || 120);
const QUERY_ITERATIONS = Number(process.env.PERF_QUERY_ITERATIONS || 40);
const OUTPUT_DIR = path.resolve(__dirname, 'results');

function nowMs() {
  return Date.now();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const idx = Math.min(sortedValues.length - 1, Math.floor((p / 100) * sortedValues.length));
  return sortedValues[idx];
}

function summarizeLatency(values) {
  if (values.length === 0) {
    return { count: 0, minMs: 0, maxMs: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  return {
    count: values.length,
    minMs: Number(sorted[0].toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    avgMs: Number((sum / values.length).toFixed(2)),
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(percentile(sorted, 95).toFixed(2)),
    p99Ms: Number(percentile(sorted, 99).toFixed(2)),
  };
}

async function fetchJson(url, options = {}) {
  const started = nowMs();
  const res = await fetch(url, options);
  const elapsed = nowMs() - started;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${url} :: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return { data, elapsedMs: elapsed };
}

function createVehiclePayload(index, scenarioSalt) {
  const t = nowMs();
  const latBase = 12.9716;
  const lonBase = 77.5946;

  return {
    vehicleId: `PV${scenarioSalt}_${index + 1}`,
    lat: latBase + ((index % 120) * 0.00025),
    lon: lonBase + ((index % 120) * 0.0002),
    speed: 30 + (index % 90),
    timestamp: t + index,
  };
}

async function runInBatches(items, worker, concurrency) {
  const latencies = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (item) => {
        const elapsed = await worker(item);
        return elapsed;
      })
    );
    latencies.push(...results);
  }

  return latencies;
}

async function ingestVehicles(vehicleCount, scenarioSalt) {
  const payloads = Array.from({ length: vehicleCount }, (_, i) => createVehiclePayload(i, scenarioSalt));

  const latencies = await runInBatches(
    payloads,
    async (payload) => {
      const started = nowMs();
      await fetchJson(`${BASE_URL}/fleet/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return nowMs() - started;
    },
    CONCURRENCY
  );

  return summarizeLatency(latencies);
}

async function benchmarkEndpoint(name, url, iterations) {
  const latencies = [];

  for (let i = 0; i < iterations; i += 1) {
    const { elapsedMs } = await fetchJson(url);
    latencies.push(elapsedMs);
  }

  return {
    endpoint: name,
    url,
    ...summarizeLatency(latencies),
  };
}

async function collectMemory() {
  const backendHealth = await fetchJson(`${BASE_URL}/health`);
  const localMemory = process.memoryUsage();

  return {
    backend: backendHealth.data.memory || null,
    backendUptimeSec: backendHealth.data.uptimeSec || null,
    loadGenerator: {
      rssMb: Number((localMemory.rss / (1024 * 1024)).toFixed(2)),
      heapUsedMb: Number((localMemory.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotalMb: Number((localMemory.heapTotal / (1024 * 1024)).toFixed(2)),
      externalMb: Number((localMemory.external / (1024 * 1024)).toFixed(2)),
    },
  };
}

async function runScenario(vehicleCount) {
  const scenarioSalt = `${vehicleCount}_${nowMs()}`;
  const started = nowMs();

  const ingestMetrics = await ingestVehicles(vehicleCount, scenarioSalt);

  const centerLat = 12.9716;
  const centerLon = 77.5946;
  const anyVehicleId = `PV${scenarioSalt}_1`;
  const endTs = nowMs() + vehicleCount;
  const startTs = endTs - 60 * 60 * 1000;

  const queryMetrics = [];
  queryMetrics.push(
    await benchmarkEndpoint(
      'vehicles_live',
      `${BASE_URL}/vehicles/live?limit=200`,
      QUERY_ITERATIONS
    )
  );
  queryMetrics.push(
    await benchmarkEndpoint(
      'vehicles_nearby',
      `${BASE_URL}/vehicles/nearby?lat=${centerLat}&lon=${centerLon}&radiusKm=3&limit=200`,
      QUERY_ITERATIONS
    )
  );
  queryMetrics.push(
    await benchmarkEndpoint(
      'vehicles_top',
      `${BASE_URL}/vehicles/top?k=10`,
      QUERY_ITERATIONS
    )
  );
  queryMetrics.push(
    await benchmarkEndpoint(
      'vehicles_clusters',
      `${BASE_URL}/vehicles/clusters?epsKm=0.3&minPts=3`,
      QUERY_ITERATIONS
    )
  );
  queryMetrics.push(
    await benchmarkEndpoint(
      'vehicles_history',
      `${BASE_URL}/vehicles/history/${anyVehicleId}?startTs=${startTs}&endTs=${endTs}`,
      QUERY_ITERATIONS
    )
  );

  const memory = await collectMemory();

  return {
    scenario: {
      vehicleCount,
      concurrency: CONCURRENCY,
      queryIterations: QUERY_ITERATIONS,
      baseUrl: BASE_URL,
    },
    ingestMetrics,
    queryMetrics,
    memory,
    durationSec: Number(((nowMs() - started) / 1000).toFixed(2)),
    at: new Date().toISOString(),
  };
}

function printScenarioSummary(result) {
  console.log(`\nScenario: ${result.scenario.vehicleCount} vehicles`);
  console.log('Ingestion metrics:', result.ingestMetrics);
  console.table(
    result.queryMetrics.map((x) => ({
      endpoint: x.endpoint,
      avgMs: x.avgMs,
      p95Ms: x.p95Ms,
      p99Ms: x.p99Ms,
      maxMs: x.maxMs,
    }))
  );
  console.log('Memory:', result.memory);
  console.log(`Scenario duration: ${result.durationSec}s`);
}

function writeMetricsLog(report) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(OUTPUT_DIR, `perf-report-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  const csvPath = path.join(OUTPUT_DIR, `perf-query-metrics-${stamp}.csv`);
  const csvLines = ['scenarioVehicles,endpoint,count,avgMs,p95Ms,p99Ms,maxMs'];

  for (const scenarioResult of report.scenarios) {
    for (const q of scenarioResult.queryMetrics) {
      csvLines.push(
        [
          scenarioResult.scenario.vehicleCount,
          q.endpoint,
          q.count,
          q.avgMs,
          q.p95Ms,
          q.p99Ms,
          q.maxMs,
        ].join(',')
      );
    }
  }

  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  return { jsonPath, csvPath };
}

async function main() {
  if (SCENARIOS.length === 0) {
    throw new Error('No valid scenarios found. Set PERF_VEHICLES, e.g. 1000,5000,10000');
  }

  console.log('Running performance tests...');
  console.log({ BASE_URL, SCENARIOS, CONCURRENCY, QUERY_ITERATIONS });

  const scenarios = [];
  for (const vehicleCount of SCENARIOS) {
    const result = await runScenario(vehicleCount);
    scenarios.push(result);
    printScenarioSummary(result);
    await sleep(500);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scenarios,
  };

  const files = writeMetricsLog(report);
  console.log('\nMetrics logs written:');
  console.log(files);
}

main().catch((error) => {
  console.error('Performance test failed:', error.message);
  process.exit(1);
});
