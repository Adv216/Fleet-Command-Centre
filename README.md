# 🚛 Fleet Command Centre

A real-time fleet tracking and management system built to handle **10,000+ vehicles** sending live GPS updates every second. Built with Node.js, Express, WebSockets, and custom data structures for high-performance spatial and time-range queries.

---

## 📁 Project Structure

```
Fleet-Command-Centre/
├── DS_CP/
│   ├── fleet-tracker/          # Core real-time fleet tracker
│   └── express-mvc-backend/    # MVC backend with REST APIs & WebSocket
```

---

## 🧩 Sub-Projects

### 1. `fleet-tracker`
The core engine — simulates 10,000 vehicles, processes live GPS streams, and serves a real-time dashboard.

**Key Features:**
- Live GPS simulation (10,000 vehicles × 1 update/sec)
- R-Tree spatial indexing for nearby/region queries
- Segment Tree for time-range analytics (max speed, total distance)
- Heap-based Top-K queries (fastest vehicles, most distance)
- DBSCAN clustering for live hotspot detection
- REST APIs + WebSocket live stats dashboard

**Run it:**
```bash
cd DS_CP/fleet-tracker
npm install
copy .env.example .env
npm start
```
Dashboard available at `http://localhost:8080`

---

### 2. `express-mvc-backend`
A clean MVC-structured Express backend with a React frontend, WebSocket support, and advanced data structures.

**Key Features:**
- MVC architecture (routes → controllers → services)
- R-Tree, Segment Tree, and Max Heap implementations
- Socket.IO for real-time fleet location broadcasting
- React frontend with Vite
- Performance testing scripts (p50/p95/p99 benchmarks)

**Run it:**
```bash
cd DS_CP/express-mvc-backend
npm install
copy .env.example .env
npm run dev
```

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Real-time | Socket.IO, WebSockets |
| Frontend | React, Vite |
| Data Structures | R-Tree, Segment Tree, Max Heap, DBSCAN |
| Database (schema) | PostgreSQL / TimescaleDB |
| Cache (design) | Redis Cluster |

---

## 📡 Key API Endpoints

### Fleet Tracker
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/live?limit=500` | Live vehicle positions |
| GET | `/api/nearby?lat=&lon=&radiusKm=` | Nearby vehicles |
| GET | `/api/topk?metric=speed&k=10` | Top-K by speed |
| GET | `/api/topk?metric=distance&k=10` | Top-K by distance |
| GET | `/api/clusters` | DBSCAN cluster snapshot |
| GET | `/api/vehicle/:id/history` | Vehicle time-range history |

### Express MVC Backend
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/fleet/location` | Ingest vehicle location |
| GET | `/api/vehicles/live` | Live vehicle list |
| GET | `/api/vehicles/top?k=10` | Top-K vehicles |
| GET | `/api/vehicles/clusters` | Cluster data |
| GET | `/api/vehicles/hotspots` | Hotspot detection |

---

## 🏗️ Architecture Overview

```
[GPS Simulator / Devices]
    → [Event Bus]
        → [Processing Service]
             → R-Tree (spatial index)
             → Segment Tree (time-range metrics)
             → Heap (top-K ranking)
             → DBSCAN (clustering)
        → [Query Service]
             → REST APIs
             → WebSocket push
        → [Frontend Dashboard]
```

---

## 📊 Data Structures Used

| Structure | File | Purpose |
|---|---|---|
| R-Tree | `spatialIndex.js` | Spatial lookup, nearby search |
| Segment Tree | `segmentTree.js` | Time-range max speed & distance |
| Max Heap | `topKHeap.js` / `MaxHeap.js` | Top-K vehicle ranking |
| DBSCAN | `clusteringService.js` | Traffic hotspot detection |

---

## 📈 Scalability Design

Both sub-projects include detailed scalability documents:

- [`fleet-tracker/SCALABILITY_DESIGN.md`](DS_CP/fleet-tracker/SCALABILITY_DESIGN.md)
- [`express-mvc-backend/SCALABILITY_PERFORMANCE_DESIGN.md`](DS_CP/express-mvc-backend/SCALABILITY_PERFORMANCE_DESIGN.md)

**Highlights:**
- Targets 10,000 events/sec sustained, 30,000/sec burst
- Kafka-based event streaming for decoupled ingestion
- Geo-sharded R-Tree for horizontal spatial scaling
- Redis hot cache + TimescaleDB for durable storage
- p95 end-to-end latency target: under 500ms

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in each sub-project and configure:

```env
PORT=8080
MONGODB_URI=your_db_url
```

---

## 📝 License

MIT
