/**
 * perfService.js — Performance Analyzer
 * DS: Circular buffer (60 samples) per metric
 * Measures: R-Tree insert, spatial query, heap op, segment tree update, memory, throughput
 */

const websocketService = require('./websocketService');

const W  = 60;
const BCAST_MS = 2000;

const m = { rtreeIns: new Array(W).fill(0), rtreeQry: new Array(W).fill(0), heapOp: new Array(W).fill(0), segTree: new Array(W).fill(0), mem: new Array(W).fill(0), tput: new Array(W).fill(0) };
const p = { rtreeIns:0, rtreeQry:0, heapOp:0, segTree:0, mem:0, tput:0 };

let _ticks = 0, _lastTs = Date.now();

function rec(key, ms) { m[key][p[key]++ % W] = Number(ms.toFixed(4)); }

function wrap(key, fn) { const t = performance.now(); const r = fn(); rec(key, performance.now()-t); return r; }

function measureRTreeInsert(fn)  { return wrap('rtreeIns', fn); }
function measureRTreeQuery(fn)   { return wrap('rtreeQry', fn); }
function measureHeapOp(fn)       { return wrap('heapOp',   fn); }
function measureSegTree(fn)      { return wrap('segTree',  fn); }
function tick(n=1)               { _ticks += n; }

function avg(a) { return Number((a.reduce((s,v)=>s+v,0)/a.length).toFixed(4)); }
function mx(a)  { return Number(Math.max(...a).toFixed(4)); }
function p95(a) { return Number([...a].sort((x,y)=>x-y)[Math.floor(a.length*0.95)].toFixed(4)); }

function snapshot() {
  const memMB = Number((process.memoryUsage().heapUsed/1024/1024).toFixed(2));
  rec('mem', memMB);
  const now = Date.now(), tps = Number((_ticks/((now-_lastTs)/1000)).toFixed(1));
  rec('tput', tps); _ticks = 0; _lastTs = now;
  return {
    rtreeInsert:   { avg: avg(m.rtreeIns),  p95: p95(m.rtreeIns),  max: mx(m.rtreeIns)  },
    rtreeQuery:    { avg: avg(m.rtreeQry),  p95: p95(m.rtreeQry),  max: mx(m.rtreeQry)  },
    heapOp:        { avg: avg(m.heapOp),    p95: p95(m.heapOp),    max: mx(m.heapOp)    },
    segTreeUpdate: { avg: avg(m.segTree),   p95: p95(m.segTree),   max: mx(m.segTree)   },
    memMB, throughput: tps,
    history: { rtreeInsert: [...m.rtreeIns], rtreeQuery: [...m.rtreeQry], heapOp: [...m.heapOp], segTree: [...m.segTree], mem: [...m.mem], tput: [...m.tput] },
  };
}

let _t = null;
function startBroadcasting() { if (_t) return; _t = setInterval(() => websocketService.broadcast('perf:update', snapshot()), BCAST_MS); }
function stopBroadcasting()  { if (_t) { clearInterval(_t); _t = null; } }

module.exports = { measureRTreeInsert, measureRTreeQuery, measureHeapOp, measureSegTree, tick, snapshot, startBroadcasting, stopBroadcasting };