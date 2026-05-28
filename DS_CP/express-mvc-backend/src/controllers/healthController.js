function getHealth(_req, res) {
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptimeSec: Number(process.uptime().toFixed(2)),
    memory: {
      rssMb: Number((memory.rss / (1024 * 1024)).toFixed(2)),
      heapUsedMb: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotalMb: Number((memory.heapTotal / (1024 * 1024)).toFixed(2)),
      externalMb: Number((memory.external / (1024 * 1024)).toFixed(2)),
    },
  });
}

module.exports = {
  getHealth,
};
