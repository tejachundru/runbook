"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { onSaveStatus, type SaveStatus } from "@/lib/events";

export function AppHeader({ onSearchOpen }: { onSearchOpen?: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setMounted(true);
    return onSaveStatus(setSaveStatus);
  }, []);

  const saveLabel =
    saveStatus === "saving" ? "Saving…" :
    saveStatus === "saved" ? "Saved" :
    saveStatus === "error" ? "Save error" : null;

  const saveDotClass =
    saveStatus === "saving" ? "bg-amber-400 animate-pulse" :
    saveStatus === "saved" ? "bg-primary" :
    saveStatus === "error" ? "bg-destructive" : "";

  return (
    <header className="flex h-10 shrink-0 items-center border-b border-border/50 bg-background/80 backdrop-blur-sm px-3 z-40">
      {/* Left: save status indicator */}
      <div className="flex-1 flex items-center gap-2">
        {saveLabel && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
            <span className={`h-1.5 w-1.5 rounded-full ${saveDotClass}`} />
            {saveLabel}
          </span>
        )}
      </div>

      {/* Right: persistent actions */}
      <div className="flex items-center gap-0.5">
        {/* Search */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/50"
              onClick={onSearchOpen}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="sr-only">Search</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Search
            <kbd className="ml-1.5 rounded border border-border/80 bg-muted px-1 py-0.5 text-[10px] font-mono">
              ⌘K
            </kbd>
          </TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        {mounted ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/50"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="h-7 w-7" />
        )}

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/settings">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/50"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="sr-only">Settings</span>
            </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
