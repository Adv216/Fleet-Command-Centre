const { EventEmitter } = require('events');

class FleetEventBus extends EventEmitter {}

module.exports = new FleetEventBus();
