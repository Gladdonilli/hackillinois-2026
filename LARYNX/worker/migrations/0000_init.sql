CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT (datetime('now')),
  filename TEXT NOT NULL,
  duration_s REAL,
  verdict TEXT CHECK(verdict IN ('GENUINE', 'DEEPFAKE')),
  confidence REAL,
  max_velocity REAL,
  anomaly_frames INTEGER,
  total_frames INTEGER,
  processing_time_ms INTEGER
);
CREATE INDEX idx_analyses_created ON analyses(created_at DESC);