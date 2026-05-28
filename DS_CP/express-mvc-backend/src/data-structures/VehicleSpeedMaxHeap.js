class VehicleSpeedMaxHeap {
  constructor() {
    this.heap = [];
    this.indexByVehicleId = new Map();
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  has(vehicleId) {
    return this.indexByVehicleId.has(vehicleId);
  }

  batchInsertOrUpdate(items) {
    if (!Array.isArray(items)) {
      throw new Error('items must be an array');
    }

    for (const item of items) {
      if (!item) continue;
      this.insertOrUpdate(item.vehicleId, item.speedKmph, item.metadata || {});
    }
  }

  insertOrUpdate(vehicleId, speedKmph, metadata = {}) {
    if (!vehicleId || !Number.isFinite(speedKmph)) {
      throw new Error('vehicleId and numeric speedKmph are required');
    }

    const existingIndex = this.indexByVehicleId.get(vehicleId);
    if (existingIndex === undefined) {
      const node = { vehicleId, speedKmph, metadata };
      this.heap.push(node);
      const idx = this.heap.length - 1;
      this.indexByVehicleId.set(vehicleId, idx);
      this.#heapifyUp(idx);
      return;
    }

    const current = this.heap[existingIndex];
    const oldSpeed = current.speedKmph;
    current.speedKmph = speedKmph;
    current.metadata = metadata;

    if (speedKmph > oldSpeed) {
      this.#heapifyUp(existingIndex);
    } else if (speedKmph < oldSpeed) {
      this.#heapifyDown(existingIndex);
    }
  }

  remove(vehicleId) {
    const index = this.indexByVehicleId.get(vehicleId);
    if (index === undefined) return null;

    const removed = this.heap[index];
    const last = this.heap.pop();
    this.indexByVehicleId.delete(vehicleId);

    if (index < this.heap.length) {
      this.heap[index] = last;
      this.indexByVehicleId.set(last.vehicleId, index);
      this.#heapifyDown(index);
      this.#heapifyUp(index);
    }

    return removed;
  }

  extractMax() {
    if (this.heap.length === 0) return null;

    const max = this.heap[0];
    const last = this.heap.pop();
    this.indexByVehicleId.delete(max.vehicleId);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.indexByVehicleId.set(last.vehicleId, 0);
      this.#heapifyDown(0);
    }

    return max;
  }

  getTopK(k = 10) {
    const limit = Math.max(0, Math.min(this.heap.length, Number(k) || 0));
    if (limit === 0) return [];

    // Candidate heap stores index pointers to avoid mutating the main heap.
    const candidate = [{ index: 0, speedKmph: this.heap[0].speedKmph }];
    const top = [];

    while (candidate.length > 0 && top.length < limit) {
      const best = this.#popCandidateMax(candidate);
      const node = this.heap[best.index];
      top.push(node);

      const left = best.index * 2 + 1;
      const right = best.index * 2 + 2;

      if (left < this.heap.length) {
        this.#pushCandidate(candidate, { index: left, speedKmph: this.heap[left].speedKmph });
      }
      if (right < this.heap.length) {
        this.#pushCandidate(candidate, { index: right, speedKmph: this.heap[right].speedKmph });
      }
    }

    return top;
  }

  extractTopK(k = 10) {
    // Backward-compatible alias. Uses non-destructive fast top-K path.
    return this.getTopK(k);
  }

  #heapifyUp(index) {
    let i = index;

    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].speedKmph >= this.heap[i].speedKmph) break;
      this.#swap(parent, i);
      i = parent;
    }
  }

  #heapifyDown(index) {
    let i = index;

    while (true) {
      const left = i * 2 + 1;
      const right = i * 2 + 2;
      let largest = i;

      if (left < this.heap.length && this.heap[left].speedKmph > this.heap[largest].speedKmph) {
        largest = left;
      }
      if (right < this.heap.length && this.heap[right].speedKmph > this.heap[largest].speedKmph) {
        largest = right;
      }
      if (largest === i) break;
      this.#swap(i, largest);
      i = largest;
    }
  }

  #swap(a, b) {
    [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
    this.indexByVehicleId.set(this.heap[a].vehicleId, a);
    this.indexByVehicleId.set(this.heap[b].vehicleId, b);
  }

  #pushCandidate(arr, value) {
    arr.push(value);
    let i = arr.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (arr[p].speedKmph >= arr[i].speedKmph) break;
      [arr[p], arr[i]] = [arr[i], arr[p]];
      i = p;
    }
  }

  #popCandidateMax(arr) {
    const top = arr[0];
    const last = arr.pop();
    if (arr.length > 0) {
      arr[0] = last;
      let i = 0;

      while (true) {
        const left = i * 2 + 1;
        const right = i * 2 + 2;
        let largest = i;

        if (left < arr.length && arr[left].speedKmph > arr[largest].speedKmph) {
          largest = left;
        }
        if (right < arr.length && arr[right].speedKmph > arr[largest].speedKmph) {
          largest = right;
        }
        if (largest === i) break;
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        i = largest;
      }
    }

    return top;
  }
}

module.exports = {
  VehicleSpeedMaxHeap,
};
