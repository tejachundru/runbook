"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText } from "lucide-react";
import * as api from "@/lib/tauri";
import type { CellSearchResult } from "@/lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

function groupByNotebook(results: CellSearchResult[]) {
  const map = new Map<string, { title: string; id: string; items: CellSearchResult[] }>();
  for (const r of results) {
    if (!map.has(r.notebookId)) {
      map.set(r.notebookId, { title: r.notebookTitle, id: r.notebookId, items: [] });
    }
    map.get(r.notebookId)!.items.push(r);
  }
  return [...map.values()];
}

export default function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CellSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchContent(q.trim());
        setResults(res);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  function navigateTo(notebookId: string) {
    router.push(`/notebooks?id=${notebookId}`);
    onClose();
  }

  // Flat list for keyboard navigation
  const flat = results.map((r) => r.notebookId);
  const uniqueIds = [...new Set(flat)];

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[activeIndex]) {
      navigateTo(results[activeIndex].notebookId);
    }
  }

  if (!open) return null;

  const groups = groupByNotebook(results);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search cell content…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
          />
          <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/50 font-mono">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {loading && (
            <div className="px-4 py-3 text-[12px] text-muted-foreground/50">Searching…</div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="px-4 py-3 text-[12px] text-muted-foreground/50">No results found.</div>
          )}
          {!loading && groups.map((group) => (
            <div key={group.id} className="mb-1">
              <div className="flex items-center gap-2 px-4 py-1.5">
                <FileText className="h-3 w-3 text-primary/50 shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide truncate">
                  {group.title}
                </span>
              </div>
              {group.items.map((item, i) => {
                const globalIndex = results.indexOf(item);
                return (
                  <button
                    key={item.cellId}
                    type="button"
                    onClick={() => navigateTo(item.notebookId)}
                    className={`w-full text-left px-6 py-2 text-[12.5px] font-mono leading-relaxed transition-colors ${
                      globalIndex === activeIndex
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground/70 hover:bg-accent/50 hover:text-foreground"
                    }`}
                    // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard nav
                    dangerouslySetInnerHTML={{ __html: sanitizeSnippet(item.snippet) }}
                  />
                );
              })}
            </div>
          ))}
          {!query && (
            <div className="px-4 py-3 text-[12px] text-muted-foreground/60">
              Type to search across all cell content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Allow only <mark> tags from the FTS snippet — strip everything else. */
function sanitizeSnippet(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
