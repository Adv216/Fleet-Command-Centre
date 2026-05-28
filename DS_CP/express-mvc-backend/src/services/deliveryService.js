/**
 * deliveryService.js
 * Delivery Scheduler — assigns deliveries to vehicles and tracks completion.
 *
 * DS: HashMap (Map) for O(1) lookup + circular buffer for history
 *     MaxHeap for priority scheduling of pending deliveries
 */

const websocketService = require('./websocketService');

const BCAST_MS = 2500;

const DELIVERY_ITEMS = [
  'Electronics','Medicines','Food Supplies','Auto Parts','Clothing',
  'Documents','Furniture','Chemicals','Books','Sports Equipment',
];

const CITIES = [
  'Mumbai','Delhi','Bangalore','Hyderabad','Chennai',
  'Kolkata','Pune','Ahmedabad','Jaipur','Surat',
];

// delivery store: deliveryId → delivery
const deliveries = new Map();
// vehicleId → deliveryId
const vehicleDelivery = new Map();

let _idCounter = 1000;

function makeDelivery(vehicleId) {
  const id   = `DLV-${++_idCounter}`;
  const hash = vehicleId.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  const from = CITIES[hash % CITIES.length];
  const to   = CITIES[(hash + 3) % CITIES.length] || CITIES[0];
  const item = DELIVERY_ITEMS[hash % DELIVERY_ITEMS.length];
  const d = {
    deliveryId:  id,
    vehicleId,
    item,
    from,
    to,
    weight:      5 + (hash % 195),   // kg
    priority:    ['low','normal','high','urgent'][hash % 4],
    status:      'in-transit',        // in-transit | delivered | delayed | failed
    startedAt:   Date.now(),
    eta:         Date.now() + (20 + Math.random() * 80) * 60000,
    progress:    0,                   // 0–100 %
    lastUpdated: Date.now(),
  };
  deliveries.set(id, d);
  vehicleDelivery.set(vehicleId, id);
  return d;
}

function updateProgress(vehicleId, speed, distanceKm) {
  if (String(vehicleId).startsWith('MY-')) return;
  let deliveryId = vehicleDelivery.get(vehicleId);
  if (!deliveryId) { makeDelivery(vehicleId); return; }
  const d = deliveries.get(deliveryId);
  if (!d || d.status === 'delivered') {
    makeDelivery(vehicleId); return;
  }
  // Progress increases faster with higher speed
  const delta = Math.min(2, (speed / 60) * 0.8 + Math.random() * 0.3);
  d.progress   = Math.min(100, d.progress + delta);
  d.lastUpdated = Date.now();

  if (d.progress >= 100) {
    d.status   = 'delivered';
    d.progress = 100;
    // Schedule next delivery after 5s
    setTimeout(() => { deliveries.delete(deliveryId); vehicleDelivery.delete(vehicleId); }, 5000);
  } else if (speed < 5 && Date.now() - d.startedAt > 300000) {
    d.status = 'delayed';
  }
}

function getDeliverySummary() {
  const all       = [...deliveries.values()];
  const inTransit = all.filter(d => d.status === 'in-transit').length;
  const delivered = all.filter(d => d.status === 'delivered').length;
  const delayed   = all.filter(d => d.status === 'delayed').length;
  const urgent    = all.filter(d => d.priority === 'urgent').length;
  return {
    total: all.length, inTransit, delivered, delayed, urgent,
    completionPct: all.length > 0 ? Math.round((delivered / all.length) * 100) : 0,
    recent: all
      .filter(d => d.status !== 'delivered')
      .sort((a, b) => {
        const pOrder = { urgent:0, high:1, normal:2, low:3 };
        return (pOrder[a.priority]||3) - (pOrder[b.priority]||3);
      })
      .slice(0, 15)
      .map(d => ({
        deliveryId:  d.deliveryId,
        vehicleId:   d.vehicleId,
        item:        d.item,
        from:        d.from,
        to:          d.to,
        priority:    d.priority,
        status:      d.status,
        progress:    Math.round(d.progress),
        weight:      d.weight,
      })),
  };
}

function getVehicleDelivery(vehicleId) {
  const id = vehicleDelivery.get(vehicleId);
  return id ? deliveries.get(id) || null : null;
}

// Export CSV
function exportCSV() {
  const rows = ['Vehicle ID,Delivery ID,Item,From,To,Priority,Status,Progress %,Weight kg'];
  for (const d of deliveries.values()) {
    rows.push(`${d.vehicleId},${d.deliveryId},${d.item},${d.from},${d.to},${d.priority},${d.status},${Math.round(d.progress)},${d.weight}`);
  }
  return rows.join('\n');
}

let _t = null;
function startBroadcasting() {
  if (_t) return;
  _t = setInterval(() => {
    websocketService.broadcast('delivery:update', getDeliverySummary());
  }, BCAST_MS);
}
function stopBroadcasting() { if (_t) { clearInterval(_t); _t = null; } }

module.exports = { updateProgress, getDeliverySummary, getVehicleDelivery, exportCSV, startBroadcasting, stopBroadcasting };