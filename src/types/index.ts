export type {
  Notebook,
  NotebookSummary,
  Cell,
  Folder,
  ExecuteResult,
  ExportResult,
} from "@/lib/tauri";

export interface CellOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface NotebookWithCells {
  id: string;
  title: string;
  tags: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  cells: import("@/lib/tauri").Cell[];
}
