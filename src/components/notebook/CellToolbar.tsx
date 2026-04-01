"use client";
import { Play, Square, Trash2, ChevronDown, Braces } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Language } from "@/lib/languages";
import { LANGUAGES } from "@/lib/languages";
import DeleteCellDialog from "./DeleteCellDialog";

interface Props {
  language: Language;
  running: boolean;
  executionNumber?: number;
  onRun: () => void;
  onDelete: () => void;
  onLanguageChange?: (langId: string) => void;
  onInsertSnippet?: (code: string) => void;
}

export default function CellToolbar({
  language,
  running,
  executionNumber,
  onRun,
  onDelete,
  onLanguageChange,
  onInsertSnippet,
}: Props) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground">
        {/* Left: execution counter + language badge/selector */}
        <div className="flex items-center gap-2">
          {executionNumber !== undefined && (
            <span className="min-w-[26px] font-mono text-[10px] tabular-nums text-muted-foreground/35">
              [{executionNumber}]
            </span>
          )}
          {onLanguageChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 font-mono text-[11px] text-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none"
                >
                  {language.label}
                  <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.id}
                    onClick={() => onLanguageChange(lang.id)}
                    className={`gap-2 font-mono text-[12px] ${
                      lang.id === language.id ? "bg-primary/8 text-primary" : ""
                    }`}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge variant="secondary" className="font-mono text-[11px]">
              {language.label}
            </Badge>
          )}
        </div>

        {/* Right: snippets + stdin toggle + run + delete */}
        <div className="flex items-center gap-1.5">
          {onInsertSnippet && language.snippets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md text-muted-foreground/60 hover:text-foreground"
                    >
                      <Braces className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Insert snippet</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {language.snippets.map((s) => (
                  <DropdownMenuItem
                    key={s.name}
                    onClick={() => onInsertSnippet(s.code)}
                    className="text-[12px]"
                  >
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRun}
                disabled={running}
                className="h-7 gap-1.5 px-2.5 text-xs"
              >
                {running ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {running ? "Running…" : "Run"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run (⇧↵ or ⌘↵)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="h-7 w-7 rounded-lg border border-destructive/20 bg-destructive/6 text-destructive/80 hover:bg-destructive/12 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete block</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <DeleteCellDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          onDelete();
          setShowDeleteDialog(false);
        }}
        cellType="code"
      />
    </>
  );
}
