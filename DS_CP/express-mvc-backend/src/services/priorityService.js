/**
 * priorityService.js — Priority Dispatch Scheduler
 * DS: MaxHeap (custom) sorted by urgency score
 * urgency = speed×0.4 + delayMin×0.5 + distancePenalty×0.1 × typeMultiplier
 */

const MaxHeap = require('../data-structures/MaxHeap');
const websocketService = require('./websocketService');

const BCAST_MS  = 1500;
const MAX_SIZE  = 500;
const TYPES     = ['standard','express','medical','perishable','fragile'];
const MULT      = { standard:1.0, express:1.4, medical:2.0, perishable:1.6, fragile:1.3 };

const heap      = new MaxHeap(item => item.urgency);
const shipments = new Map(); // vehicleId → shipment
const inHeap    = new Map(); // vehicleId → true

function getShipment(vehicleId) {
  if (!shipments.has(vehicleId)) {
    const h = vehicleId.split('').reduce((a,c) => a+c.charCodeAt(0), 0);
    shipments.set(vehicleId, {
      id:       `SHP-${vehicleId}-${(h%9000)+1000}`,
      type:     TYPES[h % TYPES.length],
      weight:   10 + (h % 490),
      client:   `Client-${(h%100)+1}`,
    });
  }
  return shipments.get(vehicleId);
}

function score(speed, delay, dist, type) {
  const m = MULT[type] || 1;
  return Math.round((Math.min(speed/120,1)*40 + Math.max(0,delay)*0.5 + Math.max(0,100-(dist||50))*0.1) * m * 10) / 10;
}

function updatePriority(vehicleId, speed, delayMin, distKm) {
  if (String(vehicleId).startsWith('MY-')) return;
  const s = getShipment(vehicleId);
  const urgency = score(speed, delayMin, distKm, s.type);
  const item = { vehicleId, urgency, speed: Number(speed.toFixed(1)), delayMin, distKm: distKm ? Number(distKm.toFixed(2)) : null, shipmentId: s.id, type: s.type, weight: s.weight, client: s.client, at: Date.now() };

  if (inHeap.has(vehicleId)) {
    const idx = heap.heap.findIndex(h => h.vehicleId === vehicleId);
    if (idx !== -1) {
      heap.heap[idx] = item;
      heap.heapifyUp(idx);
      heap.heapifyDown(idx);
    } else { heap.push(item); }
  } else {
    if (heap.size() < MAX_SIZE) { heap.push(item); inHeap.set(vehicleId, true); }
  }
}

function getTopUrgent(k = 15) { return heap.toSortedArrayDesc().slice(0, k); }

function getStats() {
  const all = heap.toSortedArrayDesc();
  return { queueSize: heap.size(), medical: all.filter(i=>i.type==='medical').length, express: all.filter(i=>i.type==='express').length, delayed: all.filter(i=>i.delayMin>10).length, topScore: heap.peek()?.urgency || 0 };
}

let _t = null;
function startBroadcasting() {
  if (_t) return;
  _t = setInterval(() => websocketService.broadcast('priority:update', { topUrgent: getTopUrgent(15), stats: getStats() }), BCAST_MS);
}
function stopBroadcasting() { if (_t) { clearInterval(_t); _t = null; } }

module.exports = { updatePriority, getTopUrgent, getStats, startBroadcasting, stopBroadcasting };