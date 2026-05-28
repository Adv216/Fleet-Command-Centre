class DistanceSegmentTree {
  constructor(size) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error('size must be a positive integer');
    }

    this.size = size;
    this.n = 1;
    while (this.n < size) this.n <<= 1;
    this.tree = new Float64Array(this.n * 2);
  }

  pointUpdate(index, value) {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      throw new Error('index out of bounds');
    }

    let i = index + this.n;
    this.tree[i] = value;
    i >>= 1;

    while (i > 0) {
      this.tree[i] = this.tree[i * 2] + this.tree[i * 2 + 1];
      i >>= 1;
    }
  }

  rangeQuery(left, right) {
    if (!Number.isInteger(left) || !Number.isInteger(right)) {
      throw new Error('left and right must be integers');
    }
    if (left < 0 || right < 0 || left > right || right >= this.size) {
      throw new Error('invalid range');
    }

    let l = left + this.n;
    let r = right + this.n;
    let sum = 0;

    while (l <= r) {
      if ((l & 1) === 1) {
        sum += this.tree[l];
        l += 1;
      }
      if ((r & 1) === 0) {
        sum += this.tree[r];
        r -= 1;
      }
      l >>= 1;
      r >>= 1;
    }

    return sum;
  }
}

class VehicleDistanceTimeline {
  constructor(maxPoints = 4096) {
    if (!Number.isInteger(maxPoints) || maxPoints <= 0) {
      throw new Error('maxPoints must be a positive integer');
    }

    this.maxPoints = maxPoints;
    this.timestamps = new Float64Array(maxPoints);
    this.distancesKm = new Float64Array(maxPoints);
    this.start = 0;
    this.count = 0;
    this.tree = new DistanceSegmentTree(maxPoints);
  }

  static #lowerBound(arr, target) {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  static #upperBound(arr, target) {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  #physicalIndex(logicalIndex) {
    return (this.start + logicalIndex) % this.maxPoints;
  }

  #timestampAtLogical(logicalIndex) {
    return this.timestamps[this.#physicalIndex(logicalIndex)];
  }

  #distanceAtLogical(logicalIndex) {
    return this.distancesKm[this.#physicalIndex(logicalIndex)];
  }

  #lowerBoundTimestamp(target) {
    let lo = 0;
    let hi = this.count;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.#timestampAtLogical(mid) < target) lo = mid + 1;
      else hi = mid;
    }

    return lo;
  }

  #upperBoundTimestamp(target) {
    let lo = 0;
    let hi = this.count;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.#timestampAtLogical(mid) <= target) lo = mid + 1;
      else hi = mid;
    }

    return lo;
  }

  #appendPoint(timestampMs, distanceKm) {
    if (this.count < this.maxPoints) {
      const physical = this.#physicalIndex(this.count);
      this.timestamps[physical] = timestampMs;
      this.distancesKm[physical] = distanceKm;
      this.tree.pointUpdate(physical, distanceKm);
      this.count += 1;
      return;
    }

    // Overwrite oldest slot and advance start pointer (fixed-memory rolling window).
    const overwritePhysical = this.start;
    this.timestamps[overwritePhysical] = timestampMs;
    this.distancesKm[overwritePhysical] = distanceKm;
    this.tree.pointUpdate(overwritePhysical, distanceKm);
    this.start = (this.start + 1) % this.maxPoints;
  }

  pointUpdateByTime(timestampMs, distanceKm) {
    if (!Number.isFinite(timestampMs) || !Number.isFinite(distanceKm)) {
      throw new Error('timestampMs and distanceKm must be numbers');
    }

    if (this.count === 0) {
      this.#appendPoint(timestampMs, distanceKm);
      return;
    }

    const lastTs = this.#timestampAtLogical(this.count - 1);

    if (timestampMs > lastTs) {
      this.#appendPoint(timestampMs, distanceKm);
      return;
    }

    const idx = this.#lowerBoundTimestamp(timestampMs);
    if (idx < this.count && this.#timestampAtLogical(idx) === timestampMs) {
      const physical = this.#physicalIndex(idx);
      this.distancesKm[physical] = distanceKm;
      this.tree.pointUpdate(physical, distanceKm);
      return;
    }

    throw new Error(
      'Out-of-order inserts are not supported in rolling mode. Insert monotonic timestamps or update existing timestamp.'
    );
  }

  rangeDistanceByTime(startMs, endMs) {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
      throw new Error('invalid time range');
    }

    if (this.count === 0) return 0;

    const left = this.#lowerBoundTimestamp(startMs);
    const rightExclusive = this.#upperBoundTimestamp(endMs);
    const right = rightExclusive - 1;

    if (left > right || left >= this.count || right < 0) {
      return 0;
    }

    const leftPhysical = this.#physicalIndex(left);
    const rightPhysical = this.#physicalIndex(right);

    if (leftPhysical <= rightPhysical) {
      return this.tree.rangeQuery(leftPhysical, rightPhysical);
    }

    return (
      this.tree.rangeQuery(leftPhysical, this.maxPoints - 1) +
      this.tree.rangeQuery(0, rightPhysical)
    );
  }
}

module.exports = {
  DistanceSegmentTree,
  VehicleDistanceTimeline,
};
