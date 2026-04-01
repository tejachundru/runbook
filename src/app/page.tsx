"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Folder,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import CreateFolderDialog from "@/components/notebook/CreateFolderDialog";
import { buildFolderTree, flattenFolderOptions } from "@/lib/folders";
import { toast } from "sonner";
import { usePagination } from "@/hooks/usePagination";
import { SearchBar } from "@/components/home/SearchBar";
import { PaginationControls } from "@/components/home/PaginationControls";
import { NotebookItem } from "@/components/home/NotebookItem";
import { FolderNode } from "@/components/home/FolderNode";
import { EmptyState } from "@/components/home/EmptyState";
import type { Notebook, Folder as FolderType, PageData } from "@/components/home/types";
import * as api from "@/lib/tauri";
import { emitDataChanged } from "@/lib/events";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-sm tabular-nums">
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground ml-1 text-xs">{label}</span>
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-border/50">
          <div className="space-y-2">
            <div className="h-7 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-36 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-muted rounded animate-pulse" />
            <div className="h-9 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-9 w-64 bg-muted rounded animate-pulse mb-8" />
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-20 bg-muted rounded-xl animate-pulse" />
            <div className="h-14 bg-muted rounded-xl animate-pulse" />
            <div className="h-14 bg-muted rounded-xl animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-36 bg-muted rounded-xl animate-pulse" />
            <div className="h-28 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<PageData>({ notebooks: [], folders: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchResults, setSearchResults] = useState<Notebook[] | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notebooks, folders] = await Promise.all([
          api.listNotebooks(),
          api.listFolders(),
        ]);
        setData({
          notebooks: notebooks.map((nb) => ({
            ...nb,
            createdAt: new Date(nb.createdAt),
            updatedAt: new Date(nb.updatedAt),
          })) as unknown as Notebook[],
          folders: folders.map((f) => ({
            ...f,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt),
          })) as unknown as FolderType[],
        });
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("nb_viewMode");
    if (saved === "grid" || saved === "list") setViewMode(saved);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchNotebooks(searchQuery);
        setSearchResults(
          results.map((nb) => ({
            ...nb,
            createdAt: new Date(nb.createdAt),
            updatedAt: new Date(nb.updatedAt),
          })) as unknown as Notebook[],
        );
      } catch {
        // fall back to local filter
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) router.push("/notebooks/new");
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  const handleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("nb_viewMode", mode);
  };

  const handleFolderFilterClick = useCallback((id: string) => {
    setActiveFolderId((prev) => (prev === id ? null : id));
  }, []);

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      const copy = await api.duplicateNotebook(id);
      setData((prev) => ({
        ...prev,
        notebooks: [
          { ...copy, createdAt: new Date(copy.createdAt), updatedAt: new Date(copy.updatedAt) } as unknown as Notebook,
          ...prev.notebooks,
        ],
      }));
      emitDataChanged();
      toast.success("Notebook duplicated");
    } catch {
      toast.error("Failed to duplicate notebook");
    }
  }, []);

  const handleNotebookDelete = useCallback((id: string) => {
    setData((prev) => ({ ...prev, notebooks: prev.notebooks.filter((n) => n.id !== id) }));
  }, []);

  const handleFolderDelete = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      folders: prev.folders.filter((f) => f.id !== id),
      notebooks: prev.notebooks.map((nb) => nb.folderId === id ? { ...nb, folderId: null } : nb),
    }));
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(tag);
    setActiveFolderId(null);
  }, []);

  const filteredNotebooks = useMemo(() => {
    const base = searchResults ?? data.notebooks;
    if (!searchQuery.trim() || searchResults)
      return activeFolderId ? base.filter((nb) => nb.folderId === activeFolderId) : base;
    const q = searchQuery.toLowerCase();
    const local = data.notebooks.filter(
      (nb) => nb.title.toLowerCase().includes(q) || nb.tags?.toLowerCase().includes(q),
    );
    return activeFolderId ? local.filter((nb) => nb.folderId === activeFolderId) : local;
  }, [data.notebooks, searchQuery, searchResults, activeFolderId]);

  const filteredTree = useMemo(
    () => buildFolderTree(data.folders, filteredNotebooks),
    [data.folders, filteredNotebooks],
  );

  const folderOptions = useMemo(() => flattenFolderOptions(data.folders), [data.folders]);

  const showSearchResults = searchQuery.trim() !== "";
  const showPaginatedList = showSearchResults || filteredNotebooks.length > 5;

  const allNotesPagination = usePagination(filteredNotebooks, 10);
  const unfiledPagination = usePagination(filteredTree.rootNotebooks, 10);

  const isEmpty = data.notebooks.length === 0 && data.folders.length === 0;
  const hasResults = !showSearchResults || filteredNotebooks.length > 0;

  const activeFolderName = useMemo(
    () => (activeFolderId ? (folderOptions.find((f) => f.id === activeFolderId)?.label ?? null) : null),
    [activeFolderId, folderOptions],
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="flex flex-col gap-6 mb-10 pb-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <div className="flex items-center gap-4 mt-1 text-sm">
                <Stat value={data.notebooks.length} label="notes" />
                <span className="text-muted-foreground/40">·</span>
                <Stat value={data.folders.length} label="folders" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreateFolderDialog folders={folderOptions} />
              <Button asChild>
                <Link href="/notebooks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New note
                </Link>
              </Button>
            </div>
          </div>

          {!isEmpty && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-md">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    loading={searchLoading}
                    placeholder="Search notes and tags... (n to create)"
                  />
                </div>
                <div className="flex items-center gap-1 border border-border/60 rounded-lg p-1">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleViewMode("list")}
                    title="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleViewMode("grid")}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {activeFolderName && (
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>Filtered: {activeFolderName}</span>
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(null)}
                      className="ml-0.5 hover:opacity-70 transition-opacity"
                      aria-label="Clear folder filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {isEmpty ? (
          <EmptyState folders={folderOptions} />
        ) : hasResults ? (
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              {!showPaginatedList && filteredNotebooks.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent</h2>
                  <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-2"}>
                    {filteredNotebooks.map((nb, i) => (
                      <NotebookItem
                        key={nb.id}
                        notebook={nb}
                        isFeatured={viewMode === "list" && i === 0}
                        viewMode={viewMode}
                        onDelete={handleNotebookDelete}
                        onDuplicate={handleDuplicate}
                        onTagClick={handleTagClick}
                      />
                    ))}
                  </div>
                </section>
              )}

              {showPaginatedList && (
                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {showSearchResults ? "Search Results" : "All Notes"}
                  </h2>
                  {viewMode === "grid" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {allNotesPagination.items.map((nb) => (
                          <NotebookItem
                            key={nb.id}
                            notebook={nb}
                            viewMode="grid"
                            onDelete={handleNotebookDelete}
                            onDuplicate={handleDuplicate}
                            onTagClick={handleTagClick}
                          />
                        ))}
                      </div>
                      {allNotesPagination.totalPages > 1 && (
                        <PaginationControls
                          currentPage={allNotesPagination.currentPage}
                          totalPages={allNotesPagination.totalPages}
                          totalCount={allNotesPagination.totalCount}
                          onPageChange={allNotesPagination.goToPage}
                        />
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                      <div className="space-y-2 p-2 bg-card/50">
                        {allNotesPagination.items.map((nb, i) => (
                          <NotebookItem
                            key={nb.id}
                            notebook={nb}
                            isFeatured={i === 0 && !showSearchResults}
                            onDelete={handleNotebookDelete}
                            onDuplicate={handleDuplicate}
                            onTagClick={handleTagClick}
                          />
                        ))}
                      </div>
                      <PaginationControls
                        currentPage={allNotesPagination.currentPage}
                        totalPages={allNotesPagination.totalPages}
                        totalCount={allNotesPagination.totalCount}
                        onPageChange={allNotesPagination.goToPage}
                      />
                    </div>
                  )}
                </section>
              )}

              {!showPaginatedList && filteredTree.rootNotebooks.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Unfiled</h2>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {unfiledPagination.items.map((nb) => (
                        <NotebookItem
                          key={nb.id}
                          notebook={nb}
                          viewMode="grid"
                          onDelete={handleNotebookDelete}
                          onDuplicate={handleDuplicate}
                          onTagClick={handleTagClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                      <div className="space-y-2 p-2 bg-card/50">
                        {unfiledPagination.items.map((nb) => (
                          <NotebookItem
                            key={nb.id}
                            notebook={nb}
                            onDelete={handleNotebookDelete}
                            onDuplicate={handleDuplicate}
                            onTagClick={handleTagClick}
                          />
                        ))}
                      </div>
                      <PaginationControls
                        currentPage={unfiledPagination.currentPage}
                        totalPages={unfiledPagination.totalPages}
                        totalCount={unfiledPagination.totalCount}
                        onPageChange={unfiledPagination.goToPage}
                      />
                    </div>
                  )}
                </section>
              )}
            </div>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Folders</h2>
                <CreateFolderDialog folders={folderOptions} />
              </div>
              {filteredTree.roots.length > 0 ? (
                <div className="space-y-3">
                  {filteredTree.roots.map((folder) => (
                    <FolderNode
                      key={folder.id}
                      folder={folder}
                      onDelete={handleFolderDelete}
                      onNotebookDelete={handleNotebookDelete}
                      onNotebookDuplicate={handleDuplicate}
                      onNotebookTagClick={handleTagClick}
                      activeFolderId={activeFolderId}
                      onFolderFilterClick={handleFolderFilterClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-muted/20">
                  <Folder className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No folders yet</p>
                  <CreateFolderDialog folders={folderOptions} />
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No results found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No notes match your search for &ldquo;{searchQuery}&rdquo;
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href={`/notebooks/new?title=${encodeURIComponent(searchQuery)}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create &ldquo;{searchQuery.slice(0, 30)}{searchQuery.length > 30 ? "…" : ""}&rdquo;
                </Link>
              </Button>
              <Button variant="link" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
