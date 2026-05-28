const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const { SpatialIndex } = require('./structures/spatialIndex');
const { TopKMinHeap } = require('./structures/topKHeap');
const { ClusteringService } = require('./services/clusteringService');
const { ProcessingService } = require('./services/processingService');
const { QueryService } = require('./services/queryService');
const { buildApiRouter } = require('./routes/api');
const { startSimulator } = require('./simulator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const spatialIndex = new SpatialIndex();
const topKSpeedHeap = new TopKMinHeap(100, (item) => item.score);
const topKDistanceHeap = new TopKMinHeap(100, (item) => item.score);
const clusteringService = new ClusteringService();
const processingService = new ProcessingService(
  spatialIndex,
  topKSpeedHeap,
  topKDistanceHeap,
  clusteringService
);

const queryService = new QueryService(
  spatialIndex,
  processingService.segmentByVehicle,
  topKSpeedHeap,
  topKDistanceHeap
);

app.use('/api', buildApiRouter(queryService, processingService));

io.on('connection', (socket) => {
  socket.emit('welcome', {
    message: 'Connected to Real-Time Fleet Tracker',
    now: Date.now(),
  });
});

setInterval(() => {
  io.emit('fleet:stats', {
    eventsPerSecond: processingService.eps,
    liveVehicles: queryService.getLive(10000).length,
    topSpeed: queryService.topK('speed', 10),
    topDistance: queryService.topK('distance', 10),
    clusters: queryService.clusters(),
    at: Date.now(),
  });
}, 1000);

startSimulator();

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Fleet Tracker server running at http://localhost:${config.port}`);
});
