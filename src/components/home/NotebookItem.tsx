"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Code2,
  Copy,
  FileText,
  Hash,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import DeleteNotebookDialog from "@/components/notebook/DeleteNotebookDialog";
import { toast } from "sonner";
import type { NotebookLike } from "./types";
import * as api from "@/lib/tauri";
import { emitDataChanged } from "@/lib/events";

function getTimeAgo(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface NotebookItemProps {
  notebook: NotebookLike;
  isFeatured?: boolean;
  viewMode?: "grid" | "list";
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

function NotebookItemInner({
  notebook,
  isFeatured = false,
  viewMode = "list",
  onDelete,
  onDuplicate,
  onTagClick,
}: NotebookItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const tags = notebook.tags?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const timeAgo = getTimeAgo(notebook.updatedAt);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteNotebook(notebook.id);
      onDelete(notebook.id);
      emitDataChanged();
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="Note actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/notebooks?id=${notebook.id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Open
          </Link>
        </DropdownMenuItem>
        {onDuplicate && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDuplicate(notebook.id);
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDeleteOpen(true);
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const tagPills =
    tags.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1">
        {tags.slice(0, viewMode === "grid" ? 3 : 2).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTagClick?.(tag);
            }}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground border border-border/50 hover:bg-accent hover:text-foreground transition-colors"
          >
            <Hash className="h-2.5 w-2.5" />
            {tag}
          </button>
        ))}
      </div>
    ) : null;

  if (viewMode === "grid") {
    return (
      <>
        <Link
          href={`/notebooks?id=${notebook.id}`}
          className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 hover:border-border hover:bg-accent/20 transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/50 text-muted-foreground group-hover:text-foreground transition-colors">
              <FileText className="h-4 w-4" />
            </div>
            {menu}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-snug">
              {notebook.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <Code2 className="h-3 w-3" />
                {notebook.cellCount} cells
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
            </div>
          </div>
          {tagPills}
        </Link>
        <DeleteNotebookDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
          notebookTitle={notebook.title}
          isDeleting={isDeleting}
        />
      </>
    );
  }

  return (
    <>
      <Link
        href={`/notebooks?id=${notebook.id}`}
        className={`group flex items-center gap-3 rounded-lg border transition-all ${
          isFeatured
            ? "bg-accent/50 border-accent/50 p-4 hover:bg-accent/70"
            : "bg-card border-transparent p-3 hover:bg-accent/40 hover:border-border/60"
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg border ${
            isFeatured
              ? "size-10 bg-primary/10 border-primary/20 text-primary"
              : "size-8 bg-muted border-border/50 text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <FileText className={isFeatured ? "h-5 w-5" : "h-4 w-4"} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className={`font-medium truncate text-foreground ${isFeatured ? "text-base" : "text-sm"}`}>
            {notebook.title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Code2 className="h-3 w-3" />
              {notebook.cellCount} cells
            </span>
            {timeAgo && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">{tagPills}</div>
        )}

        {menu}
      </Link>

      <DeleteNotebookDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        notebookTitle={notebook.title}
        isDeleting={isDeleting}
      />
    </>
  );
}

export const NotebookItem = memo(NotebookItemInner);
