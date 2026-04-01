"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, Settings, Monitor, CloudMoon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { onSaveStatus, type SaveStatus } from "@/lib/events";
import {
  useAccent,
  ACCENT_OPTIONS,
} from "@/components/providers/theme-provider";

const MODE_OPTIONS = [
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
  { value: "dim",    label: "Dim",    icon: CloudMoon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AppHeader({ onSearchOpen }: { onSearchOpen?: () => void }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { accent, setAccent } = useAccent();
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

  const ActiveModeIcon =
    MODE_OPTIONS.find((m) => m.value === theme)?.icon ??
    (resolvedTheme === "dark" ? Moon : Sun);

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
              className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
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

        {/* ── Theme & accent picker ── */}
        {mounted ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
                  >
                    <ActiveModeIcon className="h-3.5 w-3.5" />
                    <span className="sr-only">Appearance</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Appearance
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                Mode
              </DropdownMenuLabel>
              {MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setTheme(value)}
                  className="gap-2 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {theme === value && (
                    <Check className="ml-auto h-3 w-3 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                Accent
              </DropdownMenuLabel>
              {ACCENT_OPTIONS.map(({ value, label, color }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setAccent(value)}
                  className="gap-2 text-xs"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-border/60 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                  {accent === value && (
                    <Check className="ml-auto h-3 w-3 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
              className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
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
