"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { getNotebook, listCells, listFolders } from "@/lib/tauri";
import type { Notebook, Cell, Folder } from "@/lib/tauri";
import NotebookEditor from "@/components/notebook/NotebookEditor";
import { getFolderPath } from "@/lib/folders";

function NotebookLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      router.replace("/");
      return;
    }

    // Reset state so the previous notebook doesn't flash while loading
    setLoading(true);
    setNotebook(null);

    let active = true;

    Promise.all([
      getNotebook(id),
      listCells(id),
      listFolders(),
    ])
      .then(([nb, cls, flds]) => {
        if (!active) return;
        if (!nb) {
          router.replace("/");
          return;
        }
        setNotebook(nb);
        setCells(cls);
        setFolders(flds);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (!notebook) return null;

  const folderPath = getFolderPath(folders, notebook.folderId);

  return (
    <NotebookEditor
      key={notebook.id}
      notebook={notebook}
      initialCells={cells}
      folderPath={folderPath}
    />
  );
}

export default function NotebooksPage() {
  return (
    <Suspense>
      <NotebookLoader />
    </Suspense>
  );
}
