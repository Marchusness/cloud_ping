CREATE TABLE IF NOT EXISTS latencyData (
  id INTEGER PRIMARY KEY,
  from_airport_code TEXT NOT NULL,
  to_aws_region TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()), -- Store as Unix timestamp for efficiency
  first_ping_latency REAL NOT NULL,
  second_ping_latency REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_airport 
ON latencyData(from_airport_code);
