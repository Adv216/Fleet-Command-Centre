const express = require('express');

function buildApiRouter(queryService, processingService) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      eventsPerSecond: processingService.eps,
      at: Date.now(),
    });
  });

  router.get('/live', (req, res) => {
    const limit = Number(req.query.limit) || 500;
    res.json({ data: queryService.getLive(limit) });
  });

  router.get('/nearby', (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const radiusKm = Number(req.query.radiusKm || 5);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat and lon are required numeric query params' });
    }

    res.json({ data: queryService.nearby(lat, lon, radiusKm) });
  });

  router.get('/vehicle/:vehicleId/history', (req, res) => {
    const { vehicleId } = req.params;
    const now = Date.now();
    const startTs = Number(req.query.startTs || now - 60 * 60 * 1000);
    const endTs = Number(req.query.endTs || now);

    res.json({ data: queryService.history(vehicleId, startTs, endTs) });
  });

  router.get('/topk', (req, res) => {
    const metric = req.query.metric || 'speed';
    const k = Number(req.query.k || 10);
    res.json({ data: queryService.topK(metric, k) });
  });

  router.get('/clusters', (_req, res) => {
    res.json({ data: queryService.clusters() });
  });

  return router;
}

module.exports = {
  buildApiRouter,
};
