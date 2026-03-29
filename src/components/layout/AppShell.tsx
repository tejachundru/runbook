"use client";
import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/layout/app-header";
import SearchModal from "@/components/search/SearchModal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <AppHeader onSearchOpen={openSearch} />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <SearchModal open={searchOpen} onClose={closeSearch} />
    </>
  );
}
