class MinHeap {
  constructor(compareFn) {
    this.compareFn = compareFn;
    this.data = [];
  }

  size() {
    return this.data.length;
  }

  push(value) {
    this.data.push(value);
    this.#heapifyUp(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 0) return null;
    const root = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this.#heapifyDown(0);
    }
    return root;
  }

  #heapifyUp(index) {
    let i = index;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.compareFn(this.data[p], this.data[i]) <= 0) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  #heapifyDown(index) {
    let i = index;
    while (true) {
      const left = i * 2 + 1;
      const right = i * 2 + 2;
      let best = i;

      if (left < this.data.length && this.compareFn(this.data[left], this.data[best]) < 0) {
        best = left;
      }
      if (right < this.data.length && this.compareFn(this.data[right], this.data[best]) < 0) {
        best = right;
      }
      if (best === i) break;
      [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
      i = best;
    }
  }
}

function createMBR(minX, minY, maxX, maxY) {
  return { minX, minY, maxX, maxY };
}

function pointMBR(x, y) {
  return createMBR(x, y, x, y);
}

function unionMBR(a, b) {
  return createMBR(
    Math.min(a.minX, b.minX),
    Math.min(a.minY, b.minY),
    Math.max(a.maxX, b.maxX),
    Math.max(a.maxY, b.maxY)
  );
}

function area(mbr) {
  return Math.max(0, mbr.maxX - mbr.minX) * Math.max(0, mbr.maxY - mbr.minY);
}

function enlargement(current, incoming) {
  return area(unionMBR(current, incoming)) - area(current);
}

function intersects(a, b) {
  return !(a.minX > b.maxX || a.maxX < b.minX || a.minY > b.maxY || a.maxY < b.minY);
}

function minDistPointToMBR(x, y, mbr) {
  const dx = x < mbr.minX ? mbr.minX - x : x > mbr.maxX ? x - mbr.maxX : 0;
  const dy = y < mbr.minY ? mbr.minY - y : y > mbr.maxY ? y - mbr.maxY : 0;
  return dx * dx + dy * dy;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class RTreeNode {
  constructor(isLeaf, maxEntries) {
    this.isLeaf = isLeaf;
    this.maxEntries = maxEntries;
    this.children = [];
    this.mbr = null;
    this.parent = null;
  }

  addChild(child) {
    this.children.push(child);
    if (child instanceof RTreeNode) {
      child.parent = this;
    } else if (this.isLeaf) {
      Object.defineProperty(child, '_leaf', {
        value: this,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    this.mbr = this.mbr ? unionMBR(this.mbr, child.mbr) : { ...child.mbr };
  }

  recomputeMBR() {
    if (this.children.length === 0) {
      this.mbr = null;
      return;
    }
    let result = { ...this.children[0].mbr };
    for (let i = 1; i < this.children.length; i += 1) {
      result = unionMBR(result, this.children[i].mbr);
    }
    this.mbr = result;
  }
}

class RTree {
  constructor({ maxEntries = 16, minEntries } = {}) {
    if (maxEntries < 4) {
      throw new Error('maxEntries must be >= 4');
    }
    this.maxEntries = maxEntries;
    this.minEntries = minEntries || Math.floor(maxEntries * 0.4);
    this.root = new RTreeNode(true, this.maxEntries);
    this.size = 0;
    this.entryByVehicle = new Map();
  }

  insertVehicle(vehicleId, lat, lon, payload = {}) {
    this.upsertVehicle(vehicleId, lat, lon, payload);
  }

  upsertVehicle(vehicleId, lat, lon, payload = {}) {
    const existing = this.entryByVehicle.get(vehicleId);
    if (existing) {
      this.#removeEntry(existing);
    }

    const entry = {
      vehicleId,
      lat,
      lon,
      payload,
      mbr: pointMBR(lon, lat),
    };
    this.#insertEntry(entry);
    this.entryByVehicle.set(vehicleId, entry);
  }

  removeVehicle(vehicleId) {
    const existing = this.entryByVehicle.get(vehicleId);
    if (!existing) return false;
    this.#removeEntry(existing);
    return true;
  }

  #insertEntry(entry) {
    const leaf = this.#chooseLeaf(this.root, entry.mbr);
    leaf.addChild(entry);
    this.size += 1;

    if (leaf.children.length > this.maxEntries) {
      this.#handleOverflow(leaf);
    }

    this.#adjustTreeUpward(leaf);
  }

  #removeEntry(entry) {
    const leaf = entry._leaf;
    if (!leaf) return;

    const idx = leaf.children.indexOf(entry);
    if (idx === -1) return;

    leaf.children.splice(idx, 1);
    this.size -= 1;
    this.entryByVehicle.delete(entry.vehicleId);
    delete entry._leaf;

    this.#adjustTreeUpward(leaf);
    this.#condenseTree(leaf);

    if (!this.root.isLeaf && this.root.children.length === 1) {
      this.root = this.root.children[0];
      this.root.parent = null;
    }
    if (this.root.children.length === 0) {
      this.root = new RTreeNode(true, this.maxEntries);
    }
  }

  #condenseTree(node) {
    let cur = node;
    const reinsertEntries = [];

    while (cur && cur !== this.root) {
      const parent = cur.parent;
      if (cur.children.length < this.minEntries) {
        const idx = parent.children.indexOf(cur);
        if (idx !== -1) parent.children.splice(idx, 1);
        this.#collectLeafEntries(cur, reinsertEntries);
      }
      parent.recomputeMBR();
      cur = parent;
    }

    for (const orphan of reinsertEntries) {
      orphan._leaf = null;
      this.#insertEntry(orphan);
      this.entryByVehicle.set(orphan.vehicleId, orphan);
    }
  }

  #collectLeafEntries(node, out) {
    if (node.isLeaf) {
      for (const entry of node.children) {
        out.push(entry);
      }
      return;
    }
    for (const child of node.children) {
      this.#collectLeafEntries(child, out);
    }
  }

  #chooseLeaf(node, entryMBR) {
    let cur = node;
    while (!cur.isLeaf) {
      let bestChild = null;
      let bestEnlargement = Infinity;
      let bestArea = Infinity;

      for (const child of cur.children) {
        const e = enlargement(child.mbr, entryMBR);
        const a = area(child.mbr);
        if (e < bestEnlargement || (e === bestEnlargement && a < bestArea)) {
          bestEnlargement = e;
          bestArea = a;
          bestChild = child;
        }
      }

      cur = bestChild;
    }
    return cur;
  }

  #handleOverflow(node) {
    const [left, right] = this.#splitNode(node);

    if (node === this.root) {
      const newRoot = new RTreeNode(false, this.maxEntries);
      newRoot.addChild(left);
      newRoot.addChild(right);
      this.root = newRoot;
      return;
    }

    const parent = node.parent;
    const idx = parent.children.indexOf(node);
    parent.children.splice(idx, 1);
    parent.addChild(left);
    parent.addChild(right);
    parent.recomputeMBR();

    if (parent.children.length > this.maxEntries) {
      this.#handleOverflow(parent);
    }
  }

  #splitNode(node) {
    const all = [...node.children];
    const [seed1, seed2] = this.#pickSeedsLinear(all);

    const left = new RTreeNode(node.isLeaf, this.maxEntries);
    const right = new RTreeNode(node.isLeaf, this.maxEntries);

    left.addChild(seed1);
    right.addChild(seed2);

    const seed1Idx = all.indexOf(seed1);
    all.splice(seed1Idx, 1);
    const seed2Idx = all.indexOf(seed2);
    all.splice(seed2Idx, 1);

    while (all.length > 0) {
      if (left.children.length + all.length === this.minEntries) {
        for (const item of all) left.addChild(item);
        all.length = 0;
        break;
      }
      if (right.children.length + all.length === this.minEntries) {
        for (const item of all) right.addChild(item);
        all.length = 0;
        break;
      }

      const next = all.pop();
      const enlargeLeft = enlargement(left.mbr, next.mbr);
      const enlargeRight = enlargement(right.mbr, next.mbr);

      if (enlargeLeft < enlargeRight) {
        left.addChild(next);
      } else if (enlargeRight < enlargeLeft) {
        right.addChild(next);
      } else {
        const areaLeft = area(left.mbr);
        const areaRight = area(right.mbr);
        if (areaLeft < areaRight) left.addChild(next);
        else if (areaRight < areaLeft) right.addChild(next);
        else if (left.children.length <= right.children.length) left.addChild(next);
        else right.addChild(next);
      }
    }

    left.recomputeMBR();
    right.recomputeMBR();
    return [left, right];
  }

  #pickSeedsLinear(children) {
    let minXIdx = 0;
    let maxXIdx = 0;
    let minYIdx = 0;
    let maxYIdx = 0;

    for (let i = 1; i < children.length; i += 1) {
      const prevMinX = children[minXIdx].mbr.minX;
      const prevMaxX = children[maxXIdx].mbr.maxX;
      const prevMinY = children[minYIdx].mbr.minY;
      const prevMaxY = children[maxYIdx].mbr.maxY;

      if (children[i].mbr.minX < prevMinX) minXIdx = i;
      if (children[i].mbr.maxX > prevMaxX) maxXIdx = i;
      if (children[i].mbr.minY < prevMinY) minYIdx = i;
      if (children[i].mbr.maxY > prevMaxY) maxYIdx = i;
    }

    const spreadX = children[maxXIdx].mbr.maxX - children[minXIdx].mbr.minX;
    const spreadY = children[maxYIdx].mbr.maxY - children[minYIdx].mbr.minY;

    let firstIdx = spreadX >= spreadY ? minXIdx : minYIdx;
    let secondIdx = spreadX >= spreadY ? maxXIdx : maxYIdx;

    if (firstIdx === secondIdx) {
      firstIdx = 0;
      secondIdx = 1;
    }

    return [children[firstIdx], children[secondIdx]];
  }

  #adjustTreeUpward(node) {
    let cur = node;
    while (cur) {
      cur.recomputeMBR();
      cur = cur.parent;
    }
  }

  rangeSearchRadius(lat, lon, radiusKm, options = {}) {
    if (radiusKm <= 0) return [];

    const { sort = true, limit = Infinity } = options;
    const finiteLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : Infinity;

    const topK = [];
    const maxHeapPushByDistance = (item) => {
      topK.push(item);
      let i = topK.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (topK[p].distanceKm >= topK[i].distanceKm) break;
        [topK[p], topK[i]] = [topK[i], topK[p]];
        i = p;
      }
    };

    const maxHeapReplaceRootByDistance = (item) => {
      if (topK.length === 0) return;
      topK[0] = item;
      let i = 0;
      while (true) {
        const left = i * 2 + 1;
        const right = i * 2 + 2;
        let largest = i;

        if (left < topK.length && topK[left].distanceKm > topK[largest].distanceKm) {
          largest = left;
        }
        if (right < topK.length && topK[right].distanceKm > topK[largest].distanceKm) {
          largest = right;
        }
        if (largest === i) break;
        [topK[i], topK[largest]] = [topK[largest], topK[i]];
        i = largest;
      }
    };

    const deltaLat = radiusKm / 111;
    const deltaLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const query = createMBR(lon - deltaLon, lat - deltaLat, lon + deltaLon, lat + deltaLat);

    const candidates = [];
    const stack = [this.root];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || !node.mbr || !intersects(node.mbr, query)) continue;

      if (node.isLeaf) {
        for (const entry of node.children) {
          if (!intersects(entry.mbr, query)) continue;
          const distanceKm = haversineKm(lat, lon, entry.lat, entry.lon);
          if (distanceKm <= radiusKm) {
            const enriched = { ...entry, distanceKm };

            if (sort && Number.isFinite(finiteLimit)) {
              if (topK.length < finiteLimit) {
                maxHeapPushByDistance(enriched);
              } else if (enriched.distanceKm < topK[0].distanceKm) {
                maxHeapReplaceRootByDistance(enriched);
              }
              continue;
            }

            candidates.push(enriched);
            if (!sort && candidates.length >= limit) {
              return candidates;
            }
          }
        }
      } else {
        for (let i = node.children.length - 1; i >= 0; i -= 1) {
          const child = node.children[i];
          if (child.mbr && intersects(child.mbr, query)) {
            stack.push(child);
          }
        }
      }
    }

    if (sort && Number.isFinite(finiteLimit)) {
      return topK.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    if (sort) {
      candidates.sort((a, b) => a.distanceKm - b.distanceKm);
      if (Number.isFinite(limit)) {
        return candidates.slice(0, limit);
      }
    }

    return candidates;
  }

  nearestNeighbor(lat, lon) {
    if (this.size === 0 || !this.root.mbr) return null;

    const pq = new MinHeap((a, b) => a.priority - b.priority);
    pq.push({ node: this.root, priority: minDistPointToMBR(lon, lat, this.root.mbr) });

    let best = null;
    let bestDistSq = Infinity;

    while (pq.size() > 0) {
      const current = pq.pop();
      if (!current || current.priority > bestDistSq) break;

      const { node } = current;
      if (node.isLeaf) {
        for (const entry of node.children) {
          const distSq = minDistPointToMBR(lon, lat, entry.mbr);
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            best = entry;
          }
        }
      } else {
        for (const child of node.children) {
          if (!child.mbr) continue;
          const md = minDistPointToMBR(lon, lat, child.mbr);
          if (md <= bestDistSq) {
            pq.push({ node: child, priority: md });
          }
        }
      }
    }

    if (!best) return null;
    const distanceKm = haversineKm(lat, lon, best.lat, best.lon);
    return { ...best, distanceKm };
  }
}

module.exports = {
  RTree,
};
