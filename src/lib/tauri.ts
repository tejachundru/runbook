/**
 * Typed wrappers around Tauri's invoke() for all backend commands.
 * Import from here instead of calling invoke() directly in components.
 */
import { invoke as _tauriInvoke } from "@tauri-apps/api/core";

// Guard: @tauri-apps/api exports invoke as a real function in all environments,
// but it only works when window.__TAURI_INTERNALS__ is present (inside the Tauri
// desktop webview). Check at call time so plain browser / SSR gets a clean rejection.
const invoke: typeof _tauriInvoke = (cmd, args?, options?) => {
  if (
    typeof window === "undefined" ||
    !(window as any).__TAURI_INTERNALS__
  ) {
    return Promise.reject(
      new Error("Tauri runtime is not available in this environment"),
    ) as any;
  }
  return _tauriInvoke(cmd, args, options);
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notebook {
  id: string;
  title: string;
  folderId: string | null;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookSummary extends Notebook {
  cellCount: number;
}

export interface Cell {
  id: string;
  notebookId: string;
  type: "code" | "markdown";
  language: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExportResult {
  success: boolean;
  file_path: string | null;
  error: string | null;
}

// ─── Notebooks ────────────────────────────────────────────────────────────────

export const listNotebooks = () =>
  invoke<NotebookSummary[]>("list_notebooks");

export const getNotebook = (id: string) =>
  invoke<Notebook | null>("get_notebook", { id });

export const createNotebook = (
  title: string,
  tags: string,
  folderId: string | null,
) => invoke<Notebook>("create_notebook", { title, tags, folderId });

export const updateNotebook = (
  id: string,
  title: string,
  tags: string,
  folderId: string | null,
) => invoke<Notebook>("update_notebook", { id, title, tags, folderId });

export const deleteNotebook = (id: string) =>
  invoke<void>("delete_notebook", { id });

export const duplicateNotebook = (id: string) =>
  invoke<Notebook>("duplicate_notebook", { id });

export const searchNotebooks = (query: string) =>
  invoke<NotebookSummary[]>("search_notebooks", { query });

// ─── Cells ────────────────────────────────────────────────────────────────────

export const listCells = (notebookId: string) =>
  invoke<Cell[]>("list_cells", { notebookId });

export const createCell = (
  notebookId: string,
  cellType: string,
  language: string,
  order: number,
) => invoke<Cell>("create_cell", { notebookId, cellType, language, order });

export const updateCell = (
  id: string,
  content: string,
  language: string,
  order: number,
) => invoke<Cell>("update_cell", { id, content, language, order });

export const deleteCell = (id: string) =>
  invoke<void>("delete_cell", { id });

export const reorderCells = (notebookId: string, orderedIds: string[]) =>
  invoke<void>("reorder_cells", { notebookId, orderedIds });

// ─── Folders ─────────────────────────────────────────────────────────────────

export const listFolders = () =>
  invoke<Folder[]>("list_folders");

export const createFolder = (name: string, parentId: string | null) =>
  invoke<Folder>("create_folder", { name, parentId });

export const updateFolder = (id: string, name: string) =>
  invoke<Folder>("update_folder", { id, name });

export const deleteFolder = (id: string) =>
  invoke<void>("delete_folder", { id });

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getSetting = (key: string) =>
  invoke<string | null>("get_setting", { key });

export const setSetting = (key: string, value: string) =>
  invoke<void>("set_setting", { key, value });

// ─── Execution ────────────────────────────────────────────────────────────────

export const executeCode = (
  language: string,
  code: string,
  timeoutMs: number,
) => invoke<ExecuteResult>("execute_code", { language, code, timeoutMs });

// ─── Export ───────────────────────────────────────────────────────────────────

export const exportNotebook = (id: string, format: "md" | "html") =>
  invoke<ExportResult>("export_notebook", { id, format });

export const autoBackup = (
  notebookId: string,
  title: string,
  markdown: string,
  backupFolder: string,
) =>
  invoke<ExportResult>("auto_backup", {
    notebookId,
    title,
    markdown,
    backupFolder,
  });

// ─── Backup folder ────────────────────────────────────────────────────────────

export const selectBackupFolder = () =>
  invoke<string | null>("select_backup_folder");

export const getBackupFolder = () =>
  invoke<string | null>("get_backup_folder");

export const backupDatabase = () =>
  invoke<ExportResult>("backup_database");

export const restoreDatabase = () =>
  invoke<ExportResult>("restore_database");

// ─── Full-text search ─────────────────────────────────────────────────────────

export interface CellSearchResult {
  cellId: string;
  notebookId: string;
  notebookTitle: string;
  snippet: string;
}

export const searchContent = (query: string) =>
  invoke<CellSearchResult[]>("search_content", { query });

// ─── Import from Markdown ─────────────────────────────────────────────────────

export const importNotebookFromMarkdown = () =>
  invoke<Notebook | null>("import_notebook_from_markdown");
