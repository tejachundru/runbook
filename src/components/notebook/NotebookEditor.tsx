"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNotebook } from "@/hooks/useNotebook";
import CellList from "./CellList";
import AddCellBar from "./AddCellBar";
import NotebookCanvasNav from "./NotebookCanvasNav";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Pencil,
  Tag,
  FolderOpen,
  Eraser,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Code2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LANGUAGES } from "@/lib/languages";
import type { Notebook, Cell } from "@/types";
import * as api from "@/lib/tauri";
import { emitDataChanged } from "@/lib/events";
import { toast } from "sonner";

interface FolderOption {
  id: string;
  name: string;
  parentId: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveIndicator({ saveStatus }: { saveStatus: SaveStatus }) {
  if (saveStatus === "saving")
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  if (saveStatus === "saved")
    return (
      <span className="flex items-center gap-1 text-[11px] text-primary/60">
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  if (saveStatus === "error")
    return (
      <span className="flex items-center gap-1 text-[11px] text-destructive/80">
        <AlertCircle className="h-3 w-3" />
        Save failed
      </span>
    );
  return null;
}

interface Props {
  notebook: Notebook;
  initialCells: Cell[];
  folderPath?: Array<{ id: string; name: string }>;
}

export default function NotebookEditor({ notebook, initialCells, folderPath = [] }: Props) {
  const {
    cells,
    saveStatus,
    updateCell,
    updateCellLanguage,
    addCell,
    insertCellAfter,
    insertCellBefore,
    deleteCell,
    reorderCells,
  } = useNotebook(notebook.id, initialCells);

  const [activeCellId, setActiveCellId] = useState<string | null>(
    initialCells[0]?.id ?? null,
  );

  // ── Inline title ──
  const [title, setTitle] = useState(notebook.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Tags editing ──
  const [tags, setTags] = useState(notebook.tags ?? "");
  const [editingTags, setEditingTags] = useState(false);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  // ── Folder move ──
  const [folderId, setFolderId] = useState<string | null>(notebook.folderId);
  const [folders, setFolders] = useState<FolderOption[]>([]);

  // ── Collapse / exec / clear ──
  const [collapsedCells, setCollapsedCells] = useState<Set<string>>(new Set());
  const [execNumbers, setExecNumbers] = useState<Record<string, number>>({});
  const [execTimeoutMs, setExecTimeoutMs] = useState(30_000);
  const execCounter = useRef(0);
  const [clearSignal, setClearSignal] = useState(0);

  // ── Command mode: double-d delete ──
  const lastKey = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  // Fetch folders for the folder selector
  useEffect(() => {
    api.listFolders()
      .then((data) => setFolders(data.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId }))))
      .catch(() => {});
  }, []);

  // Read execution timeout setting
  useEffect(() => {
    api.getSetting("exec_timeout")
      .then((val) => { if (val) setExecTimeoutMs(Number(val)); })
      .catch(() => {});
  }, []);

  const saveTitle = useCallback(
    async (value: string) => {
      const trimmed = value.trim() || notebook.title;
      setTitle(trimmed);
      setEditingTitle(false);
      if (trimmed !== notebook.title) {
        await api.updateNotebook(notebook.id, trimmed, tags, folderId);
        emitDataChanged();
      }
    },
    [notebook.id, notebook.title, tags, folderId],
  );

  const saveTags = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      setTags(trimmed);
      setEditingTags(false);
      await api.updateNotebook(notebook.id, title, trimmed, folderId);
      emitDataChanged();
    },
    [notebook.id, title, folderId],
  );

  const saveFolder = useCallback(
    async (newFolderId: string | null) => {
      setFolderId(newFolderId);
      await api.updateNotebook(notebook.id, title, tags, newFolderId);
      emitDataChanged();
    },
    [notebook.id, title, tags],
  );

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select();
  }, [editingTitle]);

  useEffect(() => {
    if (editingTags) tagsInputRef.current?.focus();
  }, [editingTags]);

  useEffect(() => {
    if (!cells.length) {
      setActiveCellId(null);
      return;
    }
    setActiveCellId((current) => {
      if (current && cells.some((cell) => cell.id === current)) return current;
      return cells[0]?.id ?? null;
    });
  }, [cells]);

  // IntersectionObserver for active cell tracking
  useEffect(() => {
    if (!cells.length) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cell-id]"));
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target instanceof HTMLElement) {
          setActiveCellId(visible[0].target.dataset.cellId ?? null);
        }
      },
      { rootMargin: "-22% 0px -48% 0px", threshold: [0.2, 0.45, 0.7] },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [cells]);

  // Command mode keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const tag = active?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        active?.getAttribute("contenteditable") === "true" ||
        active?.closest(".monaco-editor")
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const currentIndex = cells.findIndex((c) => c.id === activeCellId);

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex < cells.length - 1) {
          jumpToCell(cells[currentIndex + 1].id);
        }
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex > 0) {
          jumpToCell(cells[currentIndex - 1].id);
        }
      } else if (e.key === "b" && activeCellId) {
        e.preventDefault();
        insertCellAfter(activeCellId, "code");
      } else if (e.key === "a" && activeCellId) {
        e.preventDefault();
        if (currentIndex > 0) {
          insertCellAfter(cells[currentIndex - 1].id, "code");
        } else {
          insertCellBefore(activeCellId, "code");
        }
      } else if (e.key === "d") {
        const now = Date.now();
        if (lastKey.current === "d" && now - lastKeyTime.current < 500 && activeCellId) {
          e.preventDefault();
          deleteCell(activeCellId);
          lastKey.current = "";
        } else {
          lastKey.current = "d";
          lastKeyTime.current = now;
        }
      } else if (e.key === "c") {
        // Toggle collapse on active cell
        if (activeCellId) toggleCellCollapse(activeCellId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cells, activeCellId, insertCellAfter, insertCellBefore, deleteCell]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCell = useMemo(
    () => cells.find((cell) => cell.id === activeCellId) ?? cells[0],
    [activeCellId, cells],
  );

  function jumpToCell(cellId: string) {
    setActiveCellId(cellId);
    const target = document.querySelector<HTMLElement>(`[data-cell-id="${cellId}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function toggleCellCollapse(cellId: string) {
    setCollapsedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) next.delete(cellId);
      else next.add(cellId);
      return next;
    });
  }

  function handleCellRunStart(cellId: string) {
    const num = ++execCounter.current;
    setExecNumbers((prev) => ({ ...prev, [cellId]: num }));
  }

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Save status indicator
  const currentFolderName =
    folderId ? (folders.find((f) => f.id === folderId)?.name ?? folderPath[folderPath.length - 1]?.name ?? "Folder") : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-3 md:px-8 lg:px-10">
        {/* ─── Header ─── */}
        <header className="mb-6 border-b border-border/40 pb-5">
          {/* Back + breadcrumb + save status row */}
          <div className="mb-3 flex items-center gap-2">
            <Link href="/" aria-label="Back to dashboard">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>

            {folderPath.length > 0 && (
              <nav aria-label="Folder breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px]">
                {folderPath.map((folder, index) => (
                  <span key={folder.id} className="inline-flex items-center gap-1">
                    {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
                    <span className="rounded px-1.5 py-0.5 font-medium text-muted-foreground/70 transition-colors hover:text-foreground">
                      {folder.name}
                    </span>
                  </span>
                ))}
              </nav>
            )}

            {/* Save status */}
            <div className="ml-2">
              <SaveIndicator saveStatus={saveStatus} />
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-1.5">
              {/* Clear all outputs */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClearSignal((n) => n + 1)}
                    className="h-7 gap-1.5 px-2.5 text-[12px] text-muted-foreground/60 hover:text-foreground"
                  >
                    <Eraser className="h-3 w-3" />
                    Clear outputs
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear all cell outputs</TooltipContent>
              </Tooltip>

              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-[12px] text-muted-foreground/60 hover:text-foreground"
                  >
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() =>
                    api.exportNotebook(notebook.id, "md")
                      .then((r) => { if (r.error) toast.error(r.error); else toast.success("Exported as Markdown"); })
                      .catch((e) => toast.error(String(e)))
                  }>
                    Export as Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() =>
                    api.exportNotebook(notebook.id, "html")
                      .then((r) => { if (r.error) toast.error(r.error); else toast.success("Exported as HTML"); })
                      .catch((e) => toast.error(String(e)))
                  }>
                    Export as HTML (.html)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Inline-editable title */}
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              defaultValue={title}
              onBlur={(e) => saveTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setTitle(title); setEditingTitle(false); }
              }}
              className="w-full bg-transparent text-[28px] font-semibold tracking-[-0.02em] text-foreground outline-none caret-primary md:text-[34px]"
              aria-label="Notebook title"
            />
          ) : (
            <h1
              className="group/title inline-flex cursor-text items-center gap-2 text-[28px] font-semibold tracking-[-0.02em] text-foreground md:text-[34px]"
              onClick={() => setEditingTitle(true)}
              title="Click to rename"
            >
              {title}
              <Pencil className="h-4 w-4 text-muted-foreground/0 transition-colors group-hover/title:text-muted-foreground/30" />
            </h1>
          )}

          {/* Tags + folder row */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Tags */}
            <div className="flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-muted-foreground/50" />
              {editingTags ? (
                <input
                  ref={tagsInputRef}
                  type="text"
                  defaultValue={tags}
                  placeholder="tag1, tag2, tag3"
                  onBlur={(e) => saveTags(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") { setEditingTags(false); }
                  }}
                  className="rounded border border-border/50 bg-background px-2 py-0.5 text-[12px] text-foreground outline-none focus:border-primary/50"
                  style={{ width: "200px" }}
                />
              ) : tagList.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setEditingTags(true)}
                  className="flex flex-wrap items-center gap-1"
                  title="Click to edit tags"
                >
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground/70 hover:border-border hover:text-foreground transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                  <Pencil className="h-2.5 w-2.5 text-muted-foreground/20 hover:text-muted-foreground" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTags(true)}
                  className="text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  title="Add tags"
                >
                  Add tags…
                </button>
              )}
            </div>

            {/* Folder selector */}
            {folders.length > 0 && (
              <div className="flex items-center gap-1.5">
                <FolderOpen className="h-3 w-3 text-muted-foreground/50" />
                <Select
                  value={folderId ?? "__none__"}
                  onValueChange={(v) => saveFolder(v === "__none__" ? null : v)}
                >
                  <SelectTrigger className="h-6 w-auto min-w-[120px] border-border/30 bg-transparent text-[12px] text-muted-foreground/60 hover:text-foreground focus:ring-0">
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No folder</SelectItem>
                    <DropdownMenuSeparator />
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Block count */}
          <p className="mt-1.5 text-[12px] text-muted-foreground/60 tabular-nums">
            {cells.length === 0 ? "Empty" : `${cells.length} ${cells.length === 1 ? "block" : "blocks"}`}
            {collapsedCells.size > 0 && (
              <span className="ml-2 text-muted-foreground/50">
                · {collapsedCells.size} collapsed
              </span>
            )}
          </p>
        </header>

        {/* ─── Cells ─── */}
        <div className="lg:px-4 xl:px-8">
          <div className="mx-auto max-w-[900px] py-2 md:py-4 lg:py-6">
            <NotebookCanvasNav
              activeCellId={activeCellId}
              cells={cells}
              mode="mobile"
              onJumpToCell={jumpToCell}
            />

            {cells.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 py-20 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-card text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Start building your notebook</h3>
                <p className="mt-1 text-sm text-muted-foreground/60">Add a text block or write some code to get started.</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCell("markdown")}
                    className="gap-2"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Text block
                  </Button>
                  {LANGUAGES.map((lang) => (
                    <Button
                      key={lang.id}
                      variant="outline"
                      size="sm"
                      onClick={() => addCell("code", lang.id)}
                      className="gap-2 font-mono text-[12px]"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      {lang.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                <CellList
                  activeCellId={activeCellId}
                  cells={cells}
                  collapsedCells={collapsedCells}
                  execNumbers={execNumbers}
                  execTimeoutMs={execTimeoutMs}
                  clearSignal={clearSignal}
                  onUpdate={updateCell}
                  onDelete={deleteCell}
                  onReorder={reorderCells}
                  onFocusCell={setActiveCellId}
                  onInsertAfter={insertCellAfter}
                  onToggleCollapse={toggleCellCollapse}
                  onLanguageChange={updateCellLanguage}
                  onCellRunStart={handleCellRunStart}
                />
                <AddCellBar onAdd={addCell} />
              </div>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts hint (fixed bottom-right) */}
        <div className="fixed bottom-4 right-4 hidden rounded-lg border border-border/30 bg-background/80 px-3 py-2 text-[10px] text-muted-foreground/50 backdrop-blur-sm xl:block">
          <span className="font-mono">j/k</span> navigate · <span className="font-mono">a/b</span> insert · <span className="font-mono">dd</span> delete · <span className="font-mono">c</span> collapse
        </div>
      </div>
    </div>
  );
}

