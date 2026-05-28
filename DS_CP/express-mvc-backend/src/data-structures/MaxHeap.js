class MaxHeap {
  constructor(scoreFn = (x) => x) {
    this.heap = [];
    this.scoreFn = scoreFn;
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0] || null;
  }

  push(value) {
    this.heap.push(value);
    this.heapifyUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }
    return top;
  }

  toSortedArrayDesc() {
    const copy = [...this.heap].sort((a, b) => this.scoreFn(b) - this.scoreFn(a));
    return copy;
  }

  heapifyUp(index) {
    let i = index;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.scoreFn(this.heap[p]) >= this.scoreFn(this.heap[i])) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  heapifyDown(index) {
    let i = index;
    while (true) {
      const left = i * 2 + 1;
      const right = i * 2 + 2;
      let best = i;

      if (left < this.heap.length && this.scoreFn(this.heap[left]) > this.scoreFn(this.heap[best])) {
        best = left;
      }
      if (right < this.heap.length && this.scoreFn(this.heap[right]) > this.scoreFn(this.heap[best])) {
        best = right;
      }
      if (best === i) break;
      [this.heap[best], this.heap[i]] = [this.heap[i], this.heap[best]];
      i = best;
    }
  }

  // Returns a copy sorted highest→lowest score (does NOT mutate the heap)
  toSortedArrayDesc() {
    return [...this.heap].sort((a, b) => this.scoreFn(b) - this.scoreFn(a));
  }
}

module.exports = MaxHeap;