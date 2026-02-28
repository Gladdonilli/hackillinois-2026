-- Migration 0001: Create analysis_reports table (correct schema)
-- Note: 0000_init.sql created wrong table name ('analyses'). This migration creates the correct one.
-- The index.ts Worker code expects 'analysis_reports' with these exact columns.

CREATE TABLE IF NOT EXISTS analysis_reports (
  report_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  audio_key TEXT,
  duration_s REAL,
  verdict TEXT NOT NULL,
  confidence REAL NOT NULL,
  peak_velocity REAL NOT NULL,
  threshold REAL NOT NULL,
  anomalous_frames INTEGER NOT NULL,
  total_frames INTEGER NOT NULL,
  anomaly_ratio REAL NOT NULL,
  processing_time_ms INTEGER,
  classifier_score REAL,
  classifier_model TEXT,
  ensemble_score REAL,
  client_ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_created ON analysis_reports(created_at);
