use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notebook {
    pub id: String,
    pub title: String,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    pub tags: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotebookSummary {
    pub id: String,
    pub title: String,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    pub tags: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "cellCount")]
    pub cell_count: i64,
}

pub fn list_notebooks(conn: &Connection) -> Result<Vec<NotebookSummary>> {
    let mut stmt = conn.prepare(
        "SELECT n.id, n.title, n.folder_id, n.tags, n.created_at, n.updated_at,
                COUNT(c.id) AS cell_count
         FROM notebooks n
         LEFT JOIN cells c ON c.notebook_id = n.id
         GROUP BY n.id
         ORDER BY n.updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(NotebookSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            folder_id: row.get(2)?,
            tags: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            cell_count: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn get_notebook(conn: &Connection, id: &str) -> Result<Option<Notebook>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, folder_id, tags, created_at, updated_at
         FROM notebooks WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map([id], |row| {
        Ok(Notebook {
            id: row.get(0)?,
            title: row.get(1)?,
            folder_id: row.get(2)?,
            tags: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;
    Ok(rows.next().transpose()?)
}

pub fn create_notebook(
    conn: &Connection,
    title: &str,
    tags: &str,
    folder_id: Option<&str>,
) -> Result<Notebook> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO notebooks (id, title, tags, folder_id) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, title, tags, folder_id],
    )?;
    Ok(Notebook {
        id: id.clone(),
        title: title.to_string(),
        folder_id: folder_id.map(String::from),
        tags: tags.to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

pub fn update_notebook(
    conn: &Connection,
    id: &str,
    title: &str,
    tags: &str,
    folder_id: Option<&str>,
) -> Result<Notebook> {
    conn.execute(
        "UPDATE notebooks SET title = ?1, tags = ?2, folder_id = ?3, updated_at = datetime('now')
         WHERE id = ?4",
        rusqlite::params![title, tags, folder_id, id],
    )?;
    // Re-fetch so created_at is populated correctly
    get_notebook(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn delete_notebook(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM notebooks WHERE id = ?1", [id])?;
    Ok(())
}

pub fn duplicate_notebook(conn: &Connection, id: &str) -> Result<Notebook> {
    let original = get_notebook(conn, id)?
        .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)?;

    let new_id = Uuid::new_v4().to_string();
    let new_title = format!("{} (copy)", original.title);

    conn.execute(
        "INSERT INTO notebooks (id, title, tags, folder_id)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![new_id, new_title, original.tags, original.folder_id],
    )?;

    // Duplicate cells with proper UUID primary keys
    {
        let mut stmt = conn.prepare(
            "SELECT type, language, content, \"order\" FROM cells WHERE notebook_id = ?1 ORDER BY \"order\" ASC",
        )?;
        let cells: Vec<(String, String, String, i32)> = stmt
            .query_map([id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)))
            .and_then(|rows| rows.collect())?;
        for (cell_type, language, content, order) in cells {
            let cell_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO cells (id, notebook_id, type, language, content, \"order\")
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![cell_id, new_id, cell_type, language, content, order],
            )?;
        }
    }

    Ok(Notebook {
        id: new_id,
        title: new_title,
        folder_id: original.folder_id,
        tags: original.tags,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

pub fn search_notebooks(conn: &Connection, query: &str) -> Result<Vec<NotebookSummary>> {
    // Escape LIKE special characters so a literal '%' or '_' in the search
    // query matches itself rather than acting as a wildcard.
    let escaped = query.replace('\\', r"\\").replace('%', r"\%").replace('_', r"\_");
    let pattern = format!("%{}%", escaped);
    let mut stmt = conn.prepare(
        "SELECT n.id, n.title, n.folder_id, n.tags, n.created_at, n.updated_at,
                COUNT(c.id) AS cell_count
         FROM notebooks n
         LEFT JOIN cells c ON c.notebook_id = n.id
         WHERE n.title LIKE ?1 ESCAPE '\\' OR n.tags LIKE ?1 ESCAPE '\\'
         GROUP BY n.id
         ORDER BY n.updated_at DESC",
    )?;
    let rows = stmt.query_map([pattern], |row| {
        Ok(NotebookSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            folder_id: row.get(2)?,
            tags: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            cell_count: row.get(6)?,
        })
    })?;
    rows.collect()
}
