"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { buildFolderTree, flattenFolderOptions } from "@/lib/folders";
import { AppSidebar } from "./app-sidebar";
import * as api from "@/lib/tauri";
import type { NotebookSummary, Folder } from "@/lib/tauri";
import { onDataChanged } from "@/lib/events";

export function SidebarWrapper() {
  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const refresh = useCallback(() => {
    Promise.all([api.listNotebooks(), api.listFolders()])
      .then(([nbs, flds]) => {
        setNotebooks(nbs);
        setFolders(flds);
      })
      .catch(console.error);
  }, []);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // Re-fetch whenever any page mutates notebooks or folders
  useEffect(() => onDataChanged(refresh), [refresh]);

  const tree = useMemo(() => buildFolderTree(folders, notebooks), [folders, notebooks]);
  const folderOptions = useMemo(() => flattenFolderOptions(folders), [folders]);
  const recentNotebooks = useMemo(() => notebooks.slice(0, 5), [notebooks]);

  return (
    <AppSidebar
      folders={tree.roots}
      rootNotebooks={tree.rootNotebooks as NotebookSummary[]}
      recentNotebooks={recentNotebooks}
      folderOptions={folderOptions}
    />
  );
}

