class SegmentTree {
  constructor(size) {
    this.n = 1;
    while (this.n < size) this.n <<= 1;
    this.tree = new Array(this.n * 2).fill(0);
  }

  update(index, value) {
    let i = index + this.n;
    this.tree[i] = value;
    i >>= 1;
    while (i > 0) {
      this.tree[i] = Math.max(this.tree[i * 2], this.tree[i * 2 + 1]);
      i >>= 1;
    }
  }

  query(left, right) {
    let l = left + this.n;
    let r = right + this.n;
    let res = 0;

    while (l <= r) {
      if ((l & 1) === 1) {
        res = Math.max(res, this.tree[l]);
        l += 1;
      }
      if ((r & 1) === 0) {
        res = Math.max(res, this.tree[r]);
        r -= 1;
      }
      l >>= 1;
      r >>= 1;
    }

    return res;
  }
}

module.exports = SegmentTree;
