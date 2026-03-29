use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cell {
    pub id: String,
    #[serde(rename = "notebookId")]
    pub notebook_id: String,
    #[serde(rename = "type")]
    pub cell_type: String,
    pub language: String,
    pub content: String,
    pub order: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

pub fn list_cells(conn: &Connection, notebook_id: &str) -> Result<Vec<Cell>> {
    let mut stmt = conn.prepare(
        "SELECT id, notebook_id, type, language, content, \"order\", created_at, updated_at
         FROM cells WHERE notebook_id = ?1 ORDER BY \"order\" ASC",
    )?;
    let rows = stmt.query_map([notebook_id], |row| {
        Ok(Cell {
            id: row.get(0)?,
            notebook_id: row.get(1)?,
            cell_type: row.get(2)?,
            language: row.get(3)?,
            content: row.get(4)?,
            order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect()
}

pub fn create_cell(
    conn: &Connection,
    notebook_id: &str,
    cell_type: &str,
    language: &str,
    order: i32,
) -> Result<Cell> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO cells (id, notebook_id, type, language, content, \"order\")
         VALUES (?1, ?2, ?3, ?4, '', ?5)",
        rusqlite::params![id, notebook_id, cell_type, language, order],
    )?;
    // Update notebook updated_at
    conn.execute(
        "UPDATE notebooks SET updated_at = datetime('now') WHERE id = ?1",
        [notebook_id],
    )?;
    let created = Cell {
        id: id.clone(),
        notebook_id: notebook_id.to_string(),
        cell_type: cell_type.to_string(),
        language: language.to_string(),
        content: String::new(),
        order,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    // FTS: empty content — nothing to index yet
    Ok(created)
}

pub fn update_cell(
    conn: &Connection,
    id: &str,
    content: &str,
    language: &str,
    order: i32,
) -> Result<Cell> {
    conn.execute(
        "UPDATE cells SET content = ?1, language = ?2, \"order\" = ?3, updated_at = datetime('now')
         WHERE id = ?4",
        rusqlite::params![content, language, order, id],
    )?;
    // Update parent notebook updated_at
    conn.execute(
        "UPDATE notebooks SET updated_at = datetime('now')
         WHERE id = (SELECT notebook_id FROM cells WHERE id = ?1)",
        [id],
    )?;
    // Re-fetch the full row so no fields are left empty
    let mut stmt = conn.prepare(
        "SELECT id, notebook_id, type, language, content, \"order\", created_at, updated_at
         FROM cells WHERE id = ?1",
    )?;
    let cell = stmt.query_row([id], |row| {
        Ok(Cell {
            id: row.get(0)?,
            notebook_id: row.get(1)?,
            cell_type: row.get(2)?,
            language: row.get(3)?,
            content: row.get(4)?,
            order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    // Keep FTS index in sync
    let _ = fts_upsert(conn, id, &cell.notebook_id, &cell.content);
    Ok(cell)
}

pub fn delete_cell(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM cells WHERE id = ?1", [id])?;
    conn.execute("DELETE FROM cells_fts WHERE cell_id = ?1", [id])?;
    Ok(())
}

pub fn reorder_cells(conn: &Connection, notebook_id: &str, ordered_ids: &[String]) -> Result<()> {
    for (i, cell_id) in ordered_ids.iter().enumerate() {
        conn.execute(
            "UPDATE cells SET \"order\" = ?1 WHERE id = ?2 AND notebook_id = ?3",
            rusqlite::params![i as i32, cell_id, notebook_id],
        )?;
    }
    Ok(())
}

#[derive(Debug, serde::Serialize)]
pub struct CellSearchResult {
    #[serde(rename = "cellId")]
    pub cell_id: String,
    #[serde(rename = "notebookId")]
    pub notebook_id: String,
    #[serde(rename = "notebookTitle")]
    pub notebook_title: String,
    pub snippet: String,
}

/// Full-text search across all cell content via FTS5.
/// Falls back to graceful empty result if the FTS table is not yet populated.
pub fn search_cells_fts(conn: &Connection, query: &str) -> Result<Vec<CellSearchResult>> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let mut stmt = conn.prepare(
        "SELECT cell_id, notebook_id, notebook_title,
                snippet(cells_fts, 0, '<mark>', '</mark>', '…', 20)
         FROM cells_fts
         WHERE cells_fts MATCH ?1
         ORDER BY rank
         LIMIT 50",
    )?;
    let rows = stmt.query_map([query], |row| {
        Ok(CellSearchResult {
            cell_id: row.get(0)?,
            notebook_id: row.get(1)?,
            notebook_title: row.get(2)?,
            snippet: row.get(3)?,
        })
    })?;
    rows.collect()
}

/// (Re-)index all cells into the FTS5 table. Safe to call on every startup
/// because it deletes everything and re-inserts. For large DBs a trigger-based
/// approach is better, but this is simple and correct for our scale.
pub fn rebuild_fts_index(conn: &Connection) -> Result<()> {
    conn.execute_batch("DELETE FROM cells_fts;")?;
    conn.execute_batch(
        "INSERT INTO cells_fts(content, cell_id, notebook_id, notebook_title)
         SELECT c.content, c.id, c.notebook_id, n.title
         FROM cells c
         JOIN notebooks n ON n.id = c.notebook_id
         WHERE c.content != '';",
    )?;
    Ok(())
}

/// Upsert a single cell in the FTS index. called after create / update.
pub fn fts_upsert(conn: &Connection, cell_id: &str, notebook_id: &str, content: &str) -> Result<()> {
    conn.execute("DELETE FROM cells_fts WHERE cell_id = ?1", [cell_id])?;
    if !content.is_empty() {
        let title: String = conn.query_row(
            "SELECT title FROM notebooks WHERE id = ?1",
            [notebook_id],
            |r| r.get(0),
        )?;
        conn.execute(
            "INSERT INTO cells_fts(content, cell_id, notebook_id, notebook_title) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![content, cell_id, notebook_id, title],
        )?;
    }
    Ok(())
}
