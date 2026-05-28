function notFound(req, res, _next) {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`,
  });
}

function handle(err, _req, res, _next) {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
}

module.exports = {
  notFound,
  handle,
};
