"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Home,
  Moon,
  Plus,
  Settings,
  Sun,
  CloudMoon,
  Code2,
  MoreHorizontal,
  Edit3,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Copy,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CreateFolderDialog from "@/components/notebook/CreateFolderDialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import * as api from "@/lib/tauri";
import { emitDataChanged } from "@/lib/events";
import type { FolderOption, FolderTreeNode } from "@/lib/folders";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarNotebook {
  id: string;
  title: string;
  updatedAt: string;
  cellCount: number;
  tags?: string | null;
}

interface SidebarProps {
  folders: FolderTreeNode[];
  rootNotebooks: SidebarNotebook[];
  recentNotebooks: SidebarNotebook[];
  folderOptions: FolderOption[];
}

// ─── Notebook row ─────────────────────────────────────────────────────────────

const NoteRow = React.memo(function NoteRow({
  notebook,
  depth = 0,
  activeNotebookId,
}: {
  notebook: SidebarNotebook;
  depth?: number;
  activeNotebookId: string | null;
}) {
  const router = useRouter();
  const isActive = activeNotebookId === notebook.id;
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(notebook.title);

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === notebook.title) { setRenaming(false); return; }
    try {
      await api.updateNotebook(notebook.id, trimmed, notebook.tags ?? "", null);
      emitDataChanged();
    } catch {
      toast.error("Failed to rename notebook");
    }
    setRenaming(false);
  }

  async function handleDuplicate() {
    try {
      const copy = await api.duplicateNotebook(notebook.id);
      emitDataChanged();
      router.push(`/notebooks?id=${copy.id}`);
    } catch {
      toast.error("Failed to duplicate notebook");
    }
  }

  async function handleDelete() {
    try {
      await api.deleteNotebook(notebook.id);
      emitDataChanged();
      if (isActive) router.push("/");
    } catch {
      toast.error("Failed to delete notebook");
    }
  }

  if (renaming) {
    return (
      <div style={{ paddingLeft: `${12 + depth * 12}px` }} className="flex items-center gap-1 pr-2 py-1">
        <FileText className="h-3.5 w-3.5 shrink-0 text-primary/40" />
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") { setRenaming(false); setRenameValue(notebook.title); }
          }}
          className="flex-1 rounded bg-background border border-primary/30 px-1.5 py-0.5 text-[12.5px] font-medium outline-none"
        />
      </div>
    );
  }

  return (
    <Link
      href={`/notebooks?id=${notebook.id}`}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
      className={cn(
        "group flex items-center gap-2 rounded-md py-1 pr-2 text-sm transition-colors duration-100",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <FileText
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isActive ? "text-primary" : "text-primary/40",
        )}
      />
      <span className="flex-1 truncate text-[12.5px] font-medium leading-none">
        {notebook.title}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="invisible ml-auto h-5 w-5 rounded p-0.5 hover:bg-sidebar-accent group-hover:visible data-[state=open]:visible"
          >
            <MoreHorizontal className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); setRenaming(true); setRenameValue(notebook.title); }}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDuplicate(); }}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.preventDefault(); handleDelete(); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Link>
  );
});

// ─── Folder row ───────────────────────────────────────────────────────────────

function FolderRow({
  folder,
  depth = 0,
  activeNotebookId,
}: {
  folder: FolderTreeNode;
  depth?: number;
  activeNotebookId: string | null;
}) {
  const [open, setOpen] = useState(depth === 0);

  return (
    <div>
      {/* Folder header */}
      <button
        type="button"
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        className="group flex w-full cursor-pointer items-center gap-2 rounded-md py-1 pr-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/60" />
        )}
        <span className="flex-1 truncate text-[12.5px] font-semibold">
          {folder.name}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          {/* Quick add button */}
          <Button
            variant="ghost"
            className="invisible h-5 w-5 rounded p-0.5 hover:bg-sidebar-accent group-hover:visible"
            asChild
          >
            <Link
              href={`/notebooks/new?folderId=${folder.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="h-3 w-3 opacity-60" />
            </Link>
          </Button>

          {/* Chevron */}
          {open ? (
            <ChevronDown className="h-3 w-3 opacity-40" />
          ) : (
            <ChevronRight className="h-3 w-3 opacity-40" />
          )}
        </div>
      </button>

      {/* Children */}
      {open && (
        <div>
          {folder.notebooks.map((nb) => (
            <NoteRow
              key={nb.id}
              notebook={nb as unknown as SidebarNotebook}
              depth={depth + 1}
              activeNotebookId={activeNotebookId}
            />
          ))}
          {folder.children.map((child) => (
            <FolderRow key={child.id} folder={child} depth={depth + 1} activeNotebookId={activeNotebookId} />
          ))}
          {folder.notebooks.length === 0 && folder.children.length === 0 && (
            <p
              style={{ paddingLeft: `${12 + (depth + 1) * 12}px` }}
              className="py-1 text-[11px] italic text-sidebar-foreground/50"
            >
              No notes here
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SidebarSection({
  label,
  action,
  children,
  defaultOpen = true,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-3 py-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground transition-colors hover:text-sidebar-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
        >
          {open ? (
            <ChevronDown className="h-2.5 w-2.5" />
          ) : (
            <ChevronRight className="h-2.5 w-2.5" />
          )}
          {label}
        </button>
        {action}
      </div>
      {open && children}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function AppSidebar({
  folders,
  rootNotebooks,
  recentNotebooks,
  folderOptions,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Compute active notebook id once, pass down to NoteRows
  const activeNotebookId = pathname === "/notebooks" ? (searchParams?.get("id") ?? null) : null;

  const cycleTheme = () => {
    const order = ["light", "dark", "dim"] as const;
    const idx = order.indexOf(theme as (typeof order)[number]);
    setTheme(order[(idx + 1) % order.length]);
  };

  const ThemeIcon = theme === "dim" ? CloudMoon : resolvedTheme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dim" ? "Light mode" : resolvedTheme === "dark" ? "Dim mode" : "Dark mode";

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center gap-4 border-r border-sidebar-border bg-sidebar py-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(false)}
          className="rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          asChild
        >
          <Link href="/">
            <Home className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          asChild
        >
          <Link href="/notebooks/new">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "rounded-md hover:bg-sidebar-accent",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
          )}
          asChild
        >
          <Link href="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        {mounted && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={cycleTheme}
            aria-label="Toggle theme"
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
        )}
      </aside>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Top bar */}
      <div className="flex h-12 items-center justify-between border-b border-sidebar-border/60 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary/18">
            <Code2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight">
            CodeNotes
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={() => setCollapsed(true)}
          className="h-6 w-6 rounded-md p-1 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="border-b border-sidebar-border/40 px-2 py-2 space-y-0.5">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
            pathname === "/"
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          )}
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <Link
          href="/notebooks/new"
          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-primary/70 hover:bg-primary/8 hover:text-primary transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          New note
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </nav>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 scrollbar-thin scrollbar-thumb-sidebar-border/60">
        {/* Recent */}
        {recentNotebooks.length > 0 && (
          <SidebarSection label="Recent" defaultOpen={true}>
            <div className="px-2 space-y-0.5">
              {recentNotebooks.slice(0, 5).map((nb) => (
                <NoteRow key={nb.id} notebook={nb} activeNotebookId={activeNotebookId} />
              ))}
            </div>
          </SidebarSection>
        )}

        {/* Folders */}
        <SidebarSection
          label="Folders"
          defaultOpen={true}
          action={
            <CreateFolderDialog
              folders={folderOptions}
              trigger={
                <Button
                  variant="ghost"
                  className="h-5 w-5 rounded p-0.5 text-sidebar-foreground/30 hover:bg-sidebar-accent"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              }
            />
          }
        >
          <div className="px-2 space-y-0.5">
            {folders.length > 0 ? (
              folders.map((folder) => (
                <FolderRow key={folder.id} folder={folder} activeNotebookId={activeNotebookId} />
              ))
            ) : (
              <p className="px-3 py-1 text-[11px] text-sidebar-foreground/30">
                No folders yet — create one to organize notes
              </p>
            )}
          </div>
        </SidebarSection>

        {/* Unfiled */}
        {rootNotebooks.length > 0 && (
          <SidebarSection label="Unfiled" defaultOpen={false}>
            <div className="px-2 space-y-0.5">
              {rootNotebooks.map((nb) => (
                <NoteRow key={nb.id} notebook={nb} activeNotebookId={activeNotebookId} />
              ))}
            </div>
          </SidebarSection>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border/40 px-3 py-2.5 flex items-center justify-between">
        <span className="text-[11px] text-sidebar-foreground/50">
          {recentNotebooks.length > 0
            ? `${recentNotebooks.length} recent`
            : "No notes yet"}
        </span>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-6 w-6 rounded p-0 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
                onClick={cycleTheme}
                aria-label="Toggle theme"
              >
                {mounted ? (
                  <ThemeIcon className="h-3.5 w-3.5" />
                ) : (
                  <div className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {mounted ? themeLabel : "Toggle theme"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
