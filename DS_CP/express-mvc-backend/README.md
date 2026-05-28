# Express MVC Backend Boilerplate

Scalability and performance extension: [SCALABILITY_PERFORMANCE_DESIGN.md](SCALABILITY_PERFORMANCE_DESIGN.md)

## Folder Structure

```text
express-mvc-backend/
├─ .env.example
├─ package.json
├─ README.md
└─ src/
   ├─ app.js
   ├─ server.js
   ├─ config/
   │  └─ index.js
   ├─ routes/
   │  ├─ index.js
   │  ├─ healthRoutes.js
   │  └─ fleetRoutes.js
   ├─ controllers/
   │  ├─ healthController.js
   │  └─ fleetController.js
   ├─ services/
   │  ├─ websocketService.js
   │  └─ fleetService.js
   ├─ data-structures/
   │  ├─ MaxHeap.js
   │  ├─ SegmentTree.js
   │  └─ RTreeIndex.js
   └─ middlewares/
      └─ errorHandler.js
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy env file

```bash
copy .env.example .env
```

3. Start server

```bash
npm run dev
```

## API Endpoints

- `GET /api/health`
- `POST /api/fleet/location`
- `GET /api/fleet/top-speed?k=10`
- `GET /api/fleet/range-metrics/:vehicleId?startTs=...&endTs=...`
- `GET /api/vehicles/live?limit=2500`
- `GET /api/vehicles/top?k=10`
- `GET /api/vehicles/clusters?epsKm=0.35&minPts=3`
- `GET /api/vehicles/summary`
- `GET /api/vehicles/hotspots?cellSizeKm=2&limit=10`

## WebSocket

Socket.IO server is initialized in `src/services/websocketService.js` and attached in `src/server.js`.

Broadcast event:
- `fleet:location-updated`
- `fleet:location-batch`

## Scalability and Performance Highlights

- R-Tree based spatial lookup for nearby and bounding-box search
- Segment Tree based time-window metrics with logarithmic query/update behavior
- Heap based ranking for fast top-K retrieval
- Rolling in-memory windows to keep state bounded
- Queue-first ingestion pattern for burst handling and decoupled processing
- WebSocket fanout optimization strategy (rooms, batching, deltas)

See detailed architecture, scaling plan, reliability model, and migration path in [SCALABILITY_PERFORMANCE_DESIGN.md](SCALABILITY_PERFORMANCE_DESIGN.md).
