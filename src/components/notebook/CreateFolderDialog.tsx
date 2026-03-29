"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FolderOption } from "@/lib/folders";
import * as api from "@/lib/tauri";
import { emitDataChanged } from "@/lib/events";

interface Props {
  folders: FolderOption[];
  trigger?: React.ReactNode;
}

export default function CreateFolderDialog({ folders, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await api.createFolder(name.trim(), parentId || null);
      setName("");
      setParentId("");
      setOpen(false);
      emitDataChanged();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" className="gap-2">
            <FolderPlus className="h-4 w-4" /> New folder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-xl border p-6">
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
          <DialogDescription>
            Folders help you group related notebooks. Nest them for deeper organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="folder-name" className="mb-2 block text-sm font-medium text-foreground">
              Folder name
            </label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. ML Experiments"
              className="h-10 rounded-lg px-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="parent-folder" className="mb-2 block text-sm font-medium text-foreground">
              Place inside
            </label>
            <Select value={parentId} onValueChange={(val: string) => setParentId(val === "root" ? "" : val)}>
              <SelectTrigger id="parent-folder" className="h-10 w-full rounded-lg text-sm bg-transparent">
                <SelectValue placeholder="Top level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">None (top level)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}