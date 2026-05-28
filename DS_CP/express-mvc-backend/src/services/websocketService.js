const { Server } = require('socket.io');

class WebSocketService {
  constructor() {
    this.io = null;
    this.pendingLocationUpdates = [];
    this.batchIntervalMs = 100;
    this.maxBatchSize = 500;
    this.flushTimer = null;
  }

  initialize(server, options = {}) {
    this.io = new Server(server, options);
    this.batchIntervalMs = Number(options.batchIntervalMs) || 100;
    this.maxBatchSize = Number(options.maxBatchSize) || 500;

    this.flushTimer = setInterval(() => this.flushLocationBatch(), this.batchIntervalMs);

    this.io.on('connection', (socket) => {
      socket.emit('connection:ready', {
        message: 'WebSocket connected',
        timestamp: Date.now(),
      });
    });
  }

  broadcast(eventName, payload) {
    if (!this.io) return;
    this.io.emit(eventName, payload);
  }

  broadcastLocation(payload) {
    if (!this.io) return;

    this.pendingLocationUpdates.push(payload);
    if (this.pendingLocationUpdates.length >= this.maxBatchSize) {
      this.flushLocationBatch();
    }
  }

  flushLocationBatch() {
    if (!this.io || this.pendingLocationUpdates.length === 0) return;

    const batch = this.pendingLocationUpdates;
    this.pendingLocationUpdates = [];

    this.io.emit('fleet:location-batch', {
      updates: batch,
      count: batch.length,
      timestamp: Date.now(),
    });

    // Preserve backward compatibility for existing listeners.
    const latest = batch[batch.length - 1];
    if (latest) {
      this.io.emit('fleet:location-updated', latest);
    }
  }

  close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushLocationBatch();
  }
}

module.exports = new WebSocketService();
