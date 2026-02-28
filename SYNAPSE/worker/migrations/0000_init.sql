-- SYNAPSE surgery history
CREATE TABLE IF NOT EXISTS surgeries (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT (datetime('now')),
  prompt TEXT NOT NULL,
  feature_id TEXT,
  feature_label TEXT,
  intervention_type TEXT CHECK(intervention_type IN ('ablate', 'amplify', 'steer')),
  strength REAL,
  layer INTEGER,
  original_response TEXT,
  steered_response TEXT,
  semantic_distance REAL,
  generation_time_ms INTEGER
);
CREATE INDEX idx_surgeries_created ON surgeries(created_at DESC);
CREATE INDEX idx_surgeries_feature ON surgeries(feature_id);
