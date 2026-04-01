"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderTree, NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Folder } from "@/lib/tauri";
import { flattenFolderOptions } from "@/lib/folders";
import * as api from "@/lib/tauri";
import { emitDataChanged } from "@/lib/events";

export function NewNotebookForm() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setFolderId(searchParams.get("folderId") ?? "");
    const presetTitle = searchParams.get("title");
    if (presetTitle) setTitle(presetTitle);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    api.listFolders().then((data) => {
      if (active) setFolders(data);
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  const folderOptions = useMemo(() => flattenFolderOptions(folders), [folders]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Notebook title cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const notebook = await api.createNotebook(title.trim(), tags, folderId || null);
      emitDataChanged();
      toast.success("Notebook created!");
      router.push(`/notebooks?id=${notebook.id}`);
    } catch (err) {
      console.error("Create notebook error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create notebook");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.9fr)] lg:items-start">
          <section className="space-y-8 lg:pt-8">
            <Link href="/">
              <Button variant="ghost" className="gap-2 rounded-full px-4 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                New note
              </p>
              <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight">
                Start a notebook with a clearer place, purpose, and presence.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                Give the note a name, decide where it belongs, and keep tags lightweight.
              </p>
            </div>

            <div className="space-y-4 rounded-3xl border border-border bg-card p-6 md:max-w-xl">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground">
                  <NotebookText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-medium">Name it for what it contains</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Good titles make the workspace readable without opening every notebook.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-medium">Use folders for durable structure</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep scratch notes at the top level. Group repeated or project-based work into folders.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-xl lg:translate-y-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border-b border-border pb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Setup
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Set the title and home for this note now.
                </p>
              </div>

              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-medium text-foreground">
                  Title
                </label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly analysis notes"
                  className="h-11 rounded-2xl px-4 text-sm"
                />
              </div>

              <div>
                <label htmlFor="folder" className="mb-2 block text-sm font-medium text-foreground">
                  Location
                </label>
                <select
                  id="folder"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-input bg-transparent px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                >
                  <option value="">Top level workspace</option>
                  {folderOptions.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="mb-2 block text-sm font-medium text-foreground">
                  Tags
                </label>
                <Input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Optional, comma-separated"
                  className="h-11 rounded-2xl px-4 text-sm"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Use tags for quick labels, not as a substitute for folders.
                </p>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  You can refine the content immediately after creating it.
                </p>
                <Button
                  type="submit"
                  disabled={loading || !title.trim()}
                  size="lg"
                  className="h-11 rounded-lg px-6"
                >
                  {loading ? "Creating..." : "Create notebook"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
