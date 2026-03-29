use rusqlite::{Connection, Result};
use std::sync::Mutex;

pub mod folders;
pub mod notebooks;
pub mod cells;
pub mod settings;

pub struct DbState(pub Mutex<Connection>);

const SCHEMA: &str = include_str!("schema.sql");

pub fn init_db() -> Result<Connection> {
    let db_path = get_db_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(&db_path)?;

    // Enable WAL mode for better concurrent performance
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    // Run schema (all CREATE TABLE IF NOT EXISTS — idempotent)
    conn.execute_batch(SCHEMA)?;

    // Rebuild FTS index on every startup (fast for small DBs)
    let _ = cells::rebuild_fts_index(&conn);

    Ok(conn)
}

/// Open an existing database file without re-running the creation schema.
/// Used when restoring from a backup that already has all tables.
pub fn open_db(path: &std::path::Path) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    Ok(conn)
}

pub fn get_db_path() -> std::path::PathBuf {
    // Store DB in ~/Library/Application Support/com.runbook.app/ on macOS
    let base = dirs_next();
    base.join("notebooks.db")
}

fn dirs_next() -> std::path::PathBuf {
    // Use Tauri's app data dir env var set by Tauri at runtime, fallback to system data dir
    if let Ok(app_dir) = std::env::var("TAURI_APP_DIR") {
        return std::path::PathBuf::from(app_dir);
    }
    dirs::data_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from(".")))
        .join("com.runbook.app")
}
