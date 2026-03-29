use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

pub fn list_folders(conn: &Connection) -> Result<Vec<Folder>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, parent_id, created_at, updated_at
         FROM folders ORDER BY name ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Folder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn create_folder(
    conn: &Connection,
    name: &str,
    parent_id: Option<&str>,
) -> Result<Folder> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO folders (id, name, parent_id) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, name, parent_id],
    )?;
    Ok(Folder {
        id,
        name: name.to_string(),
        parent_id: parent_id.map(String::from),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

pub fn update_folder(conn: &Connection, id: &str, name: &str) -> Result<Folder> {
    conn.execute(
        "UPDATE folders SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![name, id],
    )?;
    Ok(Folder {
        id: id.to_string(),
        name: name.to_string(),
        parent_id: None,
        created_at: String::new(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

pub fn delete_folder(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM folders WHERE id = ?1", [id])?;
    Ok(())
}
