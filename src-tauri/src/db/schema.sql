CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  TEXT REFERENCES folders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notebooks (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  folder_id  TEXT REFERENCES folders(id) ON DELETE SET NULL,
  tags       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cells (
  id          TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'typescript',
  content     TEXT NOT NULL DEFAULT '',
  "order"     INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- FTS5 virtual table for full-text search across all cell content.
-- cell_id / notebook_id / notebook_title are stored unindexed (metadata only).
CREATE VIRTUAL TABLE IF NOT EXISTS cells_fts USING fts5(
  content,
  cell_id UNINDEXED,
  notebook_id UNINDEXED,
  notebook_title UNINDEXED
);
