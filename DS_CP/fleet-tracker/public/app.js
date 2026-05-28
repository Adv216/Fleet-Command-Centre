const socket = io();

const epsEl = document.getElementById('eps');
const liveVehiclesEl = document.getElementById('liveVehicles');
const topSpeedBody = document.getElementById('topSpeedBody');
const topDistanceBody = document.getElementById('topDistanceBody');
const clusterBody = document.getElementById('clusterBody');
const apiOutput = document.getElementById('apiOutput');
const btnNearby = document.getElementById('btnNearby');
const btnHistory = document.getElementById('btnHistory');

function rows(items, renderRow) {
  return items.map(renderRow).join('');
}

socket.on('fleet:stats', (payload) => {
  epsEl.textContent = payload.eventsPerSecond;
  liveVehiclesEl.textContent = payload.liveVehicles;

  topSpeedBody.innerHTML = rows(payload.topSpeed || [], (x) => {
    return `<tr><td>${x.vehicleId}</td><td>${Number(x.speed || x.score).toFixed(2)}</td></tr>`;
  });

  topDistanceBody.innerHTML = rows(payload.topDistance || [], (x) => {
    return `<tr><td>${x.vehicleId}</td><td>${Number(x.totalDistanceKm || x.score).toFixed(3)}</td></tr>`;
  });

  clusterBody.innerHTML = rows(payload.clusters || [], (c) => {
    return `<tr><td>C-${c.clusterId}</td><td>${c.size}</td><td>${c.centroid.lat.toFixed(4)}, ${c.centroid.lon.toFixed(4)}</td></tr>`;
  });
});

btnNearby.addEventListener('click', async () => {
  const response = await fetch('/api/nearby?lat=12.9716&lon=77.5946&radiusKm=3');
  const data = await response.json();
  apiOutput.textContent = JSON.stringify(data, null, 2);
});

btnHistory.addEventListener('click', async () => {
  const liveResp = await fetch('/api/live?limit=1');
  const liveData = await liveResp.json();
  const first = liveData.data?.[0];
  if (!first) {
    apiOutput.textContent = 'No vehicle data yet. Wait a few seconds and retry.';
    return;
  }

  const endTs = Date.now();
  const startTs = endTs - 5 * 60 * 1000;
  const historyResp = await fetch(
    `/api/vehicle/${encodeURIComponent(first.vehicleId)}/history?startTs=${startTs}&endTs=${endTs}`
  );
  const historyData = await historyResp.json();
  apiOutput.textContent = JSON.stringify(historyData, null, 2);
});
