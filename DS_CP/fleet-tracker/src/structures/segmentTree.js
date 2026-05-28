class SegmentTree {
  constructor(size, operation, identityValue) {
    this.n = 1;
    while (this.n < size) this.n <<= 1;
    this.operation = operation;
    this.identityValue = identityValue;
    this.tree = new Array(this.n * 2).fill(identityValue);
  }

  update(index, value) {
    let i = index + this.n;
    this.tree[i] = value;
    i >>= 1;
    while (i > 0) {
      this.tree[i] = this.operation(this.tree[i * 2], this.tree[i * 2 + 1]);
      i >>= 1;
    }
  }

  query(left, right) {
    if (left > right) return this.identityValue;
    let l = left + this.n;
    let r = right + this.n;
    let leftResult = this.identityValue;
    let rightResult = this.identityValue;

    while (l <= r) {
      if ((l & 1) === 1) {
        leftResult = this.operation(leftResult, this.tree[l]);
        l += 1;
      }
      if ((r & 1) === 0) {
        rightResult = this.operation(this.tree[r], rightResult);
        r -= 1;
      }
      l >>= 1;
      r >>= 1;
    }

    return this.operation(leftResult, rightResult);
  }
}

class VehicleTimeSeries {
  constructor(maxPoints) {
    this.maxPoints = maxPoints;
    this.timestamps = [];
    this.speedValues = [];
    this.distanceValues = [];
    this.maxSpeedTree = new SegmentTree(maxPoints, Math.max, 0);
    this.distanceSumTree = new SegmentTree(maxPoints, (a, b) => a + b, 0);
  }

  append(timestamp, speed, distance) {
    if (this.timestamps.length >= this.maxPoints) {
      this.timestamps.shift();
      this.speedValues.shift();
      this.distanceValues.shift();
      this._rebuildTrees();
    }

    const index = this.timestamps.length;
    this.timestamps.push(timestamp);
    this.speedValues.push(speed);
    this.distanceValues.push(distance);
    this.maxSpeedTree.update(index, speed);
    this.distanceSumTree.update(index, distance);
  }

  _rebuildTrees() {
    this.maxSpeedTree = new SegmentTree(this.maxPoints, Math.max, 0);
    this.distanceSumTree = new SegmentTree(this.maxPoints, (a, b) => a + b, 0);

    for (let i = 0; i < this.timestamps.length; i += 1) {
      this.maxSpeedTree.update(i, this.speedValues[i]);
      this.distanceSumTree.update(i, this.distanceValues[i]);
    }
  }

  _findLeftIndex(startTs) {
    let lo = 0;
    let hi = this.timestamps.length - 1;
    let ans = this.timestamps.length;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.timestamps[mid] >= startTs) {
        ans = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return ans;
  }

  _findRightIndex(endTs) {
    let lo = 0;
    let hi = this.timestamps.length - 1;
    let ans = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.timestamps[mid] <= endTs) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  rangeMetrics(startTs, endTs) {
    if (this.timestamps.length === 0) {
      return { maxSpeed: 0, totalDistance: 0, points: 0 };
    }

    const left = this._findLeftIndex(startTs);
    const right = this._findRightIndex(endTs);
    if (left > right || left === this.timestamps.length || right < 0) {
      return { maxSpeed: 0, totalDistance: 0, points: 0 };
    }

    return {
      maxSpeed: this.maxSpeedTree.query(left, right),
      totalDistance: this.distanceSumTree.query(left, right),
      points: right - left + 1,
    };
  }
}

module.exports = {
  SegmentTree,
  VehicleTimeSeries,
};
