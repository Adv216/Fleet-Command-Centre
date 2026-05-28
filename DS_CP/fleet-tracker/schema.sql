CREATE TABLE vehicles (
  vehicle_id VARCHAR(32) PRIMARY KEY,
  fleet_id VARCHAR(32),
  plate_no VARCHAR(32),
  driver_name VARCHAR(128),
  status VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gps_events (
  event_id BIGSERIAL PRIMARY KEY,
  vehicle_id VARCHAR(32) NOT NULL REFERENCES vehicles(vehicle_id),
  event_time TIMESTAMP NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  total_distance_km DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gps_vehicle_time ON gps_events(vehicle_id, event_time DESC);

CREATE TABLE vehicle_latest_state (
  vehicle_id VARCHAR(32) PRIMARY KEY REFERENCES vehicles(vehicle_id),
  last_event_time TIMESTAMP NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  total_distance_km DOUBLE PRECISION,
  cluster_id INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
  alert_id BIGSERIAL PRIMARY KEY,
  vehicle_id VARCHAR(32) REFERENCES vehicles(vehicle_id),
  alert_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  alert_time TIMESTAMP NOT NULL,
  details_json TEXT
);

CREATE TABLE cluster_snapshots (
  snapshot_id BIGSERIAL PRIMARY KEY,
  snapshot_time TIMESTAMP NOT NULL,
  cluster_id INT NOT NULL,
  algorithm VARCHAR(16) NOT NULL,
  centroid_lat DOUBLE PRECISION,
  centroid_lon DOUBLE PRECISION,
  member_count INT NOT NULL
);

CREATE TABLE topk_snapshots (
  snapshot_id BIGSERIAL PRIMARY KEY,
  snapshot_time TIMESTAMP NOT NULL,
  metric_name VARCHAR(32) NOT NULL,
  rank INT NOT NULL,
  vehicle_id VARCHAR(32) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL
);
