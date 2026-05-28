const http = require('http');
const app  = require('./app');
const config             = require('./config');
const websocketService   = require('./services/websocketService');
const fleetService       = require('./services/fleetService');
const { GPSSimulator }   = require('./services/gpsSimulator');
const etaService         = require('./services/etaService');
const priorityService    = require('./services/priorityService');
const perfService        = require('./services/perfService');
const anomalyService     = require('./services/anomalyService');
const cityStatsService   = require('./services/cityStatsService');
const deliveryService    = require('./services/deliveryService');
const breakdownService   = require('./services/breakdownService');

const server = http.createServer(app);
websocketService.initialize(server, { cors: { origin: config.clientOrigin } });

const simulator = new GPSSimulator({
  vehicleCount: config.simulatorVehicleCount || 1000,
  intervalMs:   config.simulatorIntervalMs   || 1000,
  onBatch(updates) {
    for (const u of updates) {
      try {
        fleetService.processLocation({
          vehicleId: u.vehicleId,
          lat:       u.lat,
          lon:       u.lon,
          speed:     u.speedKmph,
          timestamp: u.timestamp,
          city:      u.city,
        });
      } catch (_) {}
    }
  },
});

simulator.start();
etaService.startBroadcasting();
priorityService.startBroadcasting();
perfService.startBroadcasting();
anomalyService.startBroadcasting();
cityStatsService.startBroadcasting();
deliveryService.startBroadcasting();
breakdownService.startBroadcasting();

server.listen(config.port, () => {
  console.log(`✅  Server  →  http://localhost:${config.port}`);
  console.log(`   GPS sim  :  ${config.simulatorVehicleCount || 1000} vehicles · 12 Indian cities`);
  console.log(`   Services :  ETA · Priority · Perf · Anomaly · CityStats · Delivery · Breakdown`);
});

function shutdown() {
  simulator.stop();
  [etaService, priorityService, perfService, anomalyService, cityStatsService, deliveryService]
    .concat([breakdownService]).forEach(s => s.stopBroadcasting());
  server.close();
  process.exit(0);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);