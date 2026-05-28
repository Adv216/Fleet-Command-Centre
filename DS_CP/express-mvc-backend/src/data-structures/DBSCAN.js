class DBSCAN {
  constructor({ epsKm = 1, minPts = 4 } = {}) {
    if (!Number.isFinite(epsKm) || epsKm <= 0) {
      throw new Error('epsKm must be a positive number');
    }
    if (!Number.isInteger(minPts) || minPts < 1) {
      throw new Error('minPts must be an integer >= 1');
    }

    this.epsKm = epsKm;
    this.minPts = minPts;
  }

  static #toProjectedKm(lat, lon, cosLatRef) {
    const kmPerLat = 110.574;
    const kmPerLon = 111.320 * cosLatRef;
    return {
      x: lon * kmPerLon,
      y: lat * kmPerLat,
    };
  }

  #cellKey(lat, lon, latCellSize, lonCellSize) {
    const gx = Math.floor(lat / latCellSize);
    const gy = Math.floor(lon / lonCellSize);
    return `${gx}:${gy}`;
  }

  #buildGrid(points, latArr, lonArr, cellX, cellY) {
    const latCellSize = this.epsKm / 111;
    const lonCellSize = this.epsKm / 111;

    const grid = new Map();

    for (let i = 0; i < points.length; i += 1) {
      const gx = Math.floor(latArr[i] / latCellSize);
      const gy = Math.floor(lonArr[i] / lonCellSize);
      cellX[i] = gx;
      cellY[i] = gy;
      const key = `${gx}:${gy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }

    return { grid, latCellSize, lonCellSize };
  }

  #regionQuery(pointIndex, gridInfo, projectedX, projectedY, cellX, cellY, epsSqKm) {
    const { grid } = gridInfo;
    const gx = cellX[pointIndex];
    const gy = cellY[pointIndex];
    const px = projectedX[pointIndex];
    const py = projectedY[pointIndex];

    const neighbors = [];

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const key = `${gx + dx}:${gy + dy}`;
        const bucket = grid.get(key);
        if (!bucket) continue;

        for (const candidateIndex of bucket) {
          const dx = px - projectedX[candidateIndex];
          const dy = py - projectedY[candidateIndex];
          const distSq = dx * dx + dy * dy;
          if (distSq <= epsSqKm) {
            neighbors.push(candidateIndex);
          }
        }
      }
    }

    return neighbors;
  }

  run(points) {
    if (!Array.isArray(points)) {
      throw new Error('points must be an array');
    }

    const normalized = points.map((p, idx) => {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
        throw new Error(`Invalid point at index ${idx}. Expected {lat, lon, ...}`);
      }
      return p;
    });

    const n = normalized.length;
    const latArr = new Float64Array(n);
    const lonArr = new Float64Array(n);
    let latSum = 0;

    for (let i = 0; i < n; i += 1) {
      latArr[i] = normalized[i].lat;
      lonArr[i] = normalized[i].lon;
      latSum += normalized[i].lat;
    }

    const latRef = n > 0 ? latSum / n : 0;
    const cosLatRef = Math.max(0.2, Math.cos((latRef * Math.PI) / 180));

    const projectedX = new Float64Array(n);
    const projectedY = new Float64Array(n);

    for (let i = 0; i < n; i += 1) {
      const projected = DBSCAN.#toProjectedKm(latArr[i], lonArr[i], cosLatRef);
      projectedX[i] = projected.x;
      projectedY[i] = projected.y;
    }

    const epsSqKm = this.epsKm * this.epsKm;
    const visited = new Uint8Array(n);
    const labels = new Int32Array(n);
    labels.fill(-1);
    const queueTag = new Int32Array(n);
    let tagCounter = 1;

    const cellX = new Int32Array(n);
    const cellY = new Int32Array(n);
    const gridInfo = this.#buildGrid(normalized, latArr, lonArr, cellX, cellY);
    gridInfo.cosLatRef = cosLatRef;

    let clusterId = 0;

    for (let i = 0; i < n; i += 1) {
      if (visited[i] === 1) continue;
      visited[i] = 1;

      const neighbors = this.#regionQuery(i, gridInfo, projectedX, projectedY, cellX, cellY, epsSqKm);
      if (neighbors.length < this.minPts) {
        labels[i] = -1;
        continue;
      }

      labels[i] = clusterId;
      const queue = [];
      const tag = tagCounter;
      tagCounter += 1;
      for (const idx of neighbors) {
        if (queueTag[idx] !== tag) {
          queueTag[idx] = tag;
          queue.push(idx);
        }
      }
      let q = 0;

      while (q < queue.length) {
        const neighborIdx = queue[q];
        q += 1;

        if (visited[neighborIdx] === 0) {
          visited[neighborIdx] = 1;
          const nn = this.#regionQuery(
            neighborIdx,
            gridInfo,
            projectedX,
            projectedY,
            cellX,
            cellY,
            epsSqKm
          );
          if (nn.length >= this.minPts) {
            for (const idx of nn) {
              if (queueTag[idx] !== tag) {
                queueTag[idx] = tag;
                queue.push(idx);
              }
            }
          }
        }

        if (labels[neighborIdx] === -1) {
          labels[neighborIdx] = clusterId;
        }
      }

      clusterId += 1;
    }

    const clusters = Array.from({ length: clusterId }, () => []);
    const noise = [];

    for (let i = 0; i < n; i += 1) {
      const label = labels[i];
      if (label === -1) {
        noise.push(normalized[i]);
      } else {
        clusters[label].push(normalized[i]);
      }
    }

    return {
      clusters,
      noise,
      clusterCount: clusters.length,
      noiseCount: noise.length,
    };
  }
}

module.exports = {
  DBSCAN,
};
