const express = require('express');
const cors = require('cors');

const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests and configured frontend dev/prod origins.
      if (!origin || config.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use(errorHandler.notFound);
app.use(errorHandler.handle);

module.exports = app;
