// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod execute;
mod export;

use db::{cells, folders, notebooks, settings, DbState};
use std::sync::Mutex;
use tauri::State;

// ─── Notebook commands ────────────────────────────────────────────────────────

#[tauri::command]
fn list_notebooks(state: State<DbState>) -> Result<Vec<notebooks::NotebookSummary>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    notebooks::list_notebooks(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_notebook(state: State<DbState>, id: String) -> Result<Option<notebooks::Notebook>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    notebooks::get_notebook(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_notebook(
    state: State<DbState>,
    title: String,
    tags: String,
    folder_id: Option<String>,
) -> Result<notebooks::Notebook, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    notebooks::create_notebook(&conn, &title, &tags, folder_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_notebook(
    state: State<DbState>,
    id: String,
    title: String,
    tags: String,
    folder_id: Option<String>,
) -> Result<notebooks::Notebook, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    notebooks::update_notebook(&conn, &id, &title, &tags, folder_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_notebook(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    notebooks::delete_notebook(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn duplicate_notebook(
    state: State<DbState>,
    id: String,
) -> Result<notebooks::Notebook, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    notebooks::duplicate_notebook(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn search_notebooks(
    state: State<DbState>,
    query: String,
) -> Result<Vec<notebooks::NotebookSummary>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    notebooks::search_notebooks(&conn, &query).map_err(|e| e.to_string())
}

// ─── Cell commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn list_cells(state: State<DbState>, notebook_id: String) -> Result<Vec<cells::Cell>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    cells::list_cells(&conn, &notebook_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_cell(
    state: State<DbState>,
    notebook_id: String,
    cell_type: String,
    language: String,
    order: i32,
) -> Result<cells::Cell, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    cells::create_cell(&conn, &notebook_id, &cell_type, &language, order)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_cell(
    state: State<DbState>,
    id: String,
    content: String,
    language: String,
    order: i32,
) -> Result<cells::Cell, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    cells::update_cell(&conn, &id, &content, &language, order).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_cell(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    cells::delete_cell(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
fn reorder_cells(
    state: State<DbState>,
    notebook_id: String,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    cells::reorder_cells(&conn, &notebook_id, &ordered_ids).map_err(|e| e.to_string())
}

// ─── Folder commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn list_folders(state: State<DbState>) -> Result<Vec<folders::Folder>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    folders::list_folders(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_folder(
    state: State<DbState>,
    name: String,
    parent_id: Option<String>,
) -> Result<folders::Folder, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    folders::create_folder(&conn, &name, parent_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_folder(
    state: State<DbState>,
    id: String,
    name: String,
) -> Result<folders::Folder, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    folders::update_folder(&conn, &id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_folder(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    folders::delete_folder(&conn, &id).map_err(|e| e.to_string())
}

// ─── Settings commands ────────────────────────────────────────────────────────

#[tauri::command]
fn get_setting(state: State<DbState>, key: String) -> Result<Option<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    settings::get_setting(&conn, &key).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_setting(state: State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    settings::set_setting(&conn, &key, &value).map_err(|e| e.to_string())
}

// ─── Execution command ────────────────────────────────────────────────────────

#[tauri::command]
async fn execute_code(
    language: String,
    code: String,
    timeout_ms: u64,
) -> execute::ExecuteResult {
    tokio::task::spawn_blocking(move || execute::execute_code(&language, &code, timeout_ms))
        .await
        .unwrap_or_else(|_| execute::ExecuteResult {
            stdout: String::new(),
            stderr: "Execution task panicked".into(),
            exit_code: 1,
        })
}

// ─── Full-text search command ─────────────────────────────────────────────────

#[tauri::command]
fn search_content(
    state: State<DbState>,
    query: String,
) -> Result<Vec<cells::CellSearchResult>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    cells::search_cells_fts(&conn, &query).map_err(|e| e.to_string())
}

// ─── Export command ───────────────────────────────────────────────────────────

#[tauri::command]
async fn export_notebook(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    id: String,
    format: String,
) -> Result<export::ExportResult, String> {
    use tauri_plugin_dialog::DialogExt;

    let (notebook, notebook_cells) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let nb = notebooks::get_notebook(&conn, &id)
            .map_err(|e| e.to_string())?
            .ok_or("Notebook not found")?;
        let c = cells::list_cells(&conn, &id).map_err(|e| e.to_string())?;
        (nb, c)
    };

    let content = match format.as_str() {
        "html" => export::notebook_to_html(&notebook, &notebook_cells),
        _ => export::notebook_to_markdown(&notebook, &notebook_cells),
    };

    let extension = if format == "html" { "html" } else { "md" };
    let safe_title: String = notebook
        .title
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let default_name = format!("{}.{}", safe_title, extension);

    let file_path = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let raw = path.to_string();
            let path_str = raw.strip_prefix("file://").unwrap_or(&raw).to_string();
            match std::fs::write(&path_str, content) {
                Ok(_) => Ok(export::ExportResult {
                    success: true,
                    file_path: Some(path_str),
                    error: None,
                }),
                Err(e) => Ok(export::ExportResult {
                    success: false,
                    file_path: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        None => Ok(export::ExportResult {
            success: false,
            file_path: None,
            error: None, // user cancelled
        }),
    }
}

#[tauri::command]
async fn auto_backup(
    notebook_id: String,
    title: String,
    markdown: String,
    backup_folder: String,
) -> Result<export::ExportResult, String> {
    let safe_title = title
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>();
    let file_name = format!("{}-{}.md", safe_title, &notebook_id[..8]);
    let file_path = std::path::PathBuf::from(&backup_folder).join(file_name);

    match std::fs::write(&file_path, markdown) {
        Ok(_) => Ok(export::ExportResult {
            success: true,
            file_path: Some(file_path.to_string_lossy().to_string()),
            error: None,
        }),
        Err(e) => Ok(export::ExportResult {
            success: false,
            file_path: None,
            error: Some(e.to_string()),
        }),
    }
}

// ─── Import from Markdown command ─────────────────────────────────────────────

#[tauri::command]
async fn import_notebook_from_markdown(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
) -> Result<Option<notebooks::Notebook>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_pick_file();

    let src_path = match file {
        Some(p) => {
            let s = p.to_string();
            let s = s.strip_prefix("file://").unwrap_or(&s).to_string();
            std::path::PathBuf::from(s)
        }
        None => return Ok(None), // user cancelled
    };

    let content = std::fs::read_to_string(&src_path)
        .map_err(|e| format!("Failed to read file: {e}"))?;

    let imported = export::parse_markdown_import(&content);

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let notebook = notebooks::create_notebook(&conn, &imported.title, &imported.tags, None)
        .map_err(|e| e.to_string())?;

    for (i, cell) in imported.cells.iter().enumerate() {
        let created = cells::create_cell(&conn, &notebook.id, &cell.cell_type, &cell.language, i as i32)
            .map_err(|e| e.to_string())?;
        cells::update_cell(&conn, &created.id, &cell.content, &cell.language, i as i32)
            .map_err(|e| e.to_string())?;
    }

    Ok(Some(notebook))
}

// ─── Entry point ──────────────────────────────────────────────────────────────

// ─── Backup folder commands ───────────────────────────────────────────────────

#[tauri::command]
async fn backup_database(state: State<'_, DbState>) -> Result<export::ExportResult, String> {
    // Resolve backup folder from settings AND flush WAL inside the lock.
    let (backup_folder, db_path) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let folder = settings::get_setting(&conn, "backup_folder").map_err(|e| e.to_string())?;
        // Checkpoint + truncate WAL so the .db file is self-contained before we copy it.
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
        (folder, db::get_db_path())
    };

    let backup_dir = match backup_folder {
        Some(ref p) => std::path::PathBuf::from(p),
        None => {
            return Ok(export::ExportResult {
                success: false,
                file_path: None,
                error: Some("No backup folder configured. Set one in Settings first.".to_string()),
            });
        }
    };

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
    let file_name = format!("runbook_backup_{timestamp}.db");
    let dest = backup_dir.join(&file_name);

    match std::fs::copy(&db_path, &dest) {
        Ok(_) => Ok(export::ExportResult {
            success: true,
            file_path: Some(dest.to_string_lossy().to_string()),
            error: None,
        }),
        Err(e) => Ok(export::ExportResult {
            success: false,
            file_path: None,
            error: Some(format!("Failed to copy database: {e}")),
        }),
    }
}

#[tauri::command]
async fn restore_database(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
) -> Result<export::ExportResult, String> {
    use tauri_plugin_dialog::DialogExt;

    let file = app
        .dialog()
        .file()
        .add_filter("SQLite Database", &["db"])
        .blocking_pick_file();

    let src_path = match file {
        Some(p) => {
            // FilePath can be a file:// URI or a plain path — PathBuf::from handles both.
            let s = p.to_string();
            let s = s.strip_prefix("file://").unwrap_or(&s);
            std::path::PathBuf::from(s)
        }
        None => {
            return Ok(export::ExportResult {
                success: false,
                file_path: None,
                error: None, // user cancelled
            });
        }
    };

    let db_path = db::get_db_path();

    // Hold the lock for the entire operation so no other command runs
    // against the database while we are swapping files.
    let mut conn_guard = state.0.lock().map_err(|e| e.to_string())?;

    // 1. Flush all pending WAL pages to the main DB file so the old data is
    //    fully persisted before we discard the connection.
    let _ = conn_guard.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");

    // 2. Copy the backup over the live file.
    if let Err(e) = std::fs::copy(&src_path, &db_path) {
        return Ok(export::ExportResult {
            success: false,
            file_path: None,
            error: Some(format!("Failed to copy backup: {e}")),
        });
    }

    // 3. Remove stale WAL / SHM files so they are not replayed on top of
    //    the freshly restored data. Derive filenames from the actual db path
    //    so this stays correct if the database file is ever renamed.
    let dir = db_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let db_stem = db_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    let _ = std::fs::remove_file(dir.join(format!("{db_stem}-wal")));
    let _ = std::fs::remove_file(dir.join(format!("{db_stem}-shm")));

    // 4. Reopen the connection pointing at the restored file.
    match db::open_db(&db_path) {
        Ok(new_conn) => {
            *conn_guard = new_conn;
            Ok(export::ExportResult {
                success: true,
                file_path: Some(src_path.to_string_lossy().to_string()),
                error: None,
            })
        }
        Err(e) => Ok(export::ExportResult {
            success: false,
            file_path: None,
            error: Some(format!("Backup copied but failed to reopen DB: {e}")),
        }),
    }
}

#[tauri::command]
async fn select_backup_folder(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog().file().blocking_pick_folder();

    if let Some(ref path) = folder {
        let path_str = path.to_string();
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        settings::set_setting(&conn, "backup_folder", &path_str)
            .map_err(|e| e.to_string())?;
        return Ok(Some(path_str));
    }
    Ok(None)
}

#[tauri::command]
fn get_backup_folder(state: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    settings::get_setting(&conn, "backup_folder").map_err(|e| e.to_string())
}

fn main() {
    let conn = db::init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            // notebooks
            list_notebooks,
            get_notebook,
            create_notebook,
            update_notebook,
            delete_notebook,
            duplicate_notebook,
            search_notebooks,
            search_content,
            // cells
            list_cells,
            create_cell,
            update_cell,
            delete_cell,
            reorder_cells,
            // folders
            list_folders,
            create_folder,
            update_folder,
            delete_folder,
            // settings
            get_setting,
            set_setting,
            // execution
            execute_code,
            // export
            export_notebook,
            auto_backup,
            // backup folder
            select_backup_folder,
            get_backup_folder,
            backup_database,
            restore_database,
            // import
            import_notebook_from_markdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
