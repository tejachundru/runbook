"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderRoot, Plus } from "lucide-react";
import CreateFolderDialog from "@/components/notebook/CreateFolderDialog";
import type { FolderOption } from "@/lib/folders";

export function EmptyState({ folders }: { folders: FolderOption[] }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-border/60 rounded-2xl bg-muted/20">
      <div className="flex size-12 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground mb-4">
        <FolderRoot className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Start your workspace</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Create folders to organize projects or jump right in with a new note.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <CreateFolderDialog folders={folders} />
        <Button asChild>
          <Link href="/notebooks/new">
            <Plus className="h-4 w-4 mr-2" />
            New note
          </Link>
        </Button>
      </div>
    </div>
  );
}
