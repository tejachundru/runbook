"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, FolderOpen, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import DeleteFolderDialog from "@/components/notebook/DeleteFolderDialog";
import { toast } from "sonner";
import { NotebookItem } from "./NotebookItem";
import type { FolderTreeNode } from "@/lib/folders";
import type { NotebookLike } from "./types";
import * as api from "@/lib/tauri";
import { emitDataChanged } from "@/lib/events";

function countNestedNotebooks(folder: FolderTreeNode): number {
  return folder.children.reduce(
    (sum, child) => sum + countNestedNotebooks(child),
    folder.notebooks.length,
  );
}

interface FolderNodeProps {
  folder: FolderTreeNode;
  depth?: number;
  onDelete: (id: string) => void;
  onNotebookDelete: (id: string) => void;
  onNotebookDuplicate?: (id: string) => void;
  onNotebookTagClick?: (tag: string) => void;
  activeFolderId?: string | null;
  onFolderFilterClick?: (id: string) => void;
}

export function FolderNode({
  folder,
  depth = 0,
  onDelete,
  onNotebookDelete,
  onNotebookDuplicate,
  onNotebookTagClick,
  activeFolderId,
  onFolderFilterClick,
}: FolderNodeProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const notebookCount = countNestedNotebooks(folder);
  const hasChildren = folder.children.length > 0 || folder.notebooks.length > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteFolder(folder.id);
      onDelete(folder.id);
      emitDataChanged();
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className={depth > 0 ? "ml-4 pl-4 border-l border-border/60" : ""}>
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {/* Header — only the left button triggers folder filter */}
        <div
          className={`flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40 ${
            activeFolderId === folder.id ? "ring-1 ring-inset ring-primary/50" : ""
          }`}
        >
          <button
            type="button"
            className={`flex items-center gap-3 min-w-0 flex-1 text-left ${
              onFolderFilterClick ? "cursor-pointer" : "cursor-default"
            }`}
            onClick={() => onFolderFilterClick?.(folder.id)}
            aria-label={`Filter by folder: ${folder.name}`}
          >
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                activeFolderId === folder.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background border-border/60 text-muted-foreground"
              }`}
            >
              {hasChildren ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm text-foreground truncate">{folder.name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {notebookCount} {notebookCount === 1 ? "note" : "notes"}
                {folder.children.length > 0 && ` · ${folder.children.length} folders`}
              </p>
            </div>
          </button>

          {/* Action buttons — stopPropagation prevents triggering folder filter */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-xs"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/notebooks/new?folderId=${folder.id}`}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        {folder.notebooks.length > 0 || folder.children.length > 0 ? (
          <div className="p-2 space-y-1 bg-card/50">
            {folder.notebooks.map((nb: NotebookLike) => (
              <NotebookItem
                key={nb.id}
                notebook={nb}
                onDelete={onNotebookDelete}
                onDuplicate={onNotebookDuplicate}
                onTagClick={onNotebookTagClick}
              />
            ))}
            {folder.children.map((child) => (
              <div key={child.id} className="mt-2">
                <FolderNode
                  folder={child}
                  depth={depth + 1}
                  onDelete={onDelete}
                  onNotebookDelete={onNotebookDelete}
                  onNotebookDuplicate={onNotebookDuplicate}
                  onNotebookTagClick={onNotebookTagClick}
                  activeFolderId={activeFolderId}
                  onFolderFilterClick={onFolderFilterClick}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground/50">Empty folder</p>
            <Button size="sm" variant="link" className="mt-1 h-auto text-xs" asChild>
              <Link href={`/notebooks/new?folderId=${folder.id}`}>Create first note</Link>
            </Button>
          </div>
        )}
      </div>

      <DeleteFolderDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        folderName={folder.name}
        notebookCount={folder.notebooks.length}
        childFolderCount={folder.children.length}
        isDeleting={isDeleting}
      />
    </div>
  );
}
