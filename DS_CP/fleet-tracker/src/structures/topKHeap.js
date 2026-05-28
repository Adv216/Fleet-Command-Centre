class TopKMinHeap {
  constructor(k, scoreSelector) {
    this.k = k;
    this.scoreSelector = scoreSelector;
    this.heap = [];
  }

  upsert(item) {
    const existingIndex = this.heap.findIndex((x) => x.vehicleId === item.vehicleId);
    if (existingIndex !== -1) {
      this.heap[existingIndex] = item;
      this._heapifyDown(existingIndex);
      this._heapifyUp(existingIndex);
      return;
    }

    if (this.heap.length < this.k) {
      this.heap.push(item);
      this._heapifyUp(this.heap.length - 1);
      return;
    }

    if (this.scoreSelector(item) > this.scoreSelector(this.heap[0])) {
      this.heap[0] = item;
      this._heapifyDown(0);
    }
  }

  toSortedDesc() {
    return [...this.heap].sort((a, b) => this.scoreSelector(b) - this.scoreSelector(a));
  }

  _heapifyUp(i) {
    let index = i;
    while (index > 0) {
      const p = (index - 1) >> 1;
      if (this.scoreSelector(this.heap[p]) <= this.scoreSelector(this.heap[index])) break;
      [this.heap[p], this.heap[index]] = [this.heap[index], this.heap[p]];
      index = p;
    }
  }

  _heapifyDown(i) {
    let index = i;
    const length = this.heap.length;
    while (true) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      if (
        left < length &&
        this.scoreSelector(this.heap[left]) < this.scoreSelector(this.heap[smallest])
      ) {
        smallest = left;
      }
      if (
        right < length &&
        this.scoreSelector(this.heap[right]) < this.scoreSelector(this.heap[smallest])
      ) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

module.exports = {
  TopKMinHeap,
};
