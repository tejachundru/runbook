"use client";


import { Button } from "@/components/ui/button";
import { getLang } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { Cell } from "@/types";

interface Props {
  activeCellId: string | null;
  cells: Cell[];
  mode: "desktop" | "mobile";
  onJumpToCell: (cellId: string) => void;
}

function getCellLabel(cell: Cell) {
  if (cell.type === "markdown") {
    const heading = cell.content
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    return heading?.replace(/^#+\s*/, "") || "Untitled note";
  }

  const firstLine = cell.content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLine || `${getLang(cell.language).label} cell`;
}

export default function NotebookCanvasNav({
  activeCellId,
  cells,
  mode,
  onJumpToCell,
}: Props) {
  if (mode === "mobile") {
    return (
      <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
        <div className="flex min-w-max gap-2">
          {cells.map((cell, index) => {
            const isActive = cell.id === activeCellId;
            return (
              <Button
                key={cell.id}
                type="button"
                variant="ghost"
                onClick={() => onJumpToCell(cell.id)}
                className={cn(
                  "h-auto min-w-0 shrink-0 rounded-full border px-3 py-2 text-left transition-colors",
                  isActive
                    ? "border-border bg-accent text-accent-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    {cell.type === "code" ? getLang(cell.language).label : "Markdown"}
                  </span>
                </div>
                <div className="mt-1 max-w-44 truncate text-sm font-medium normal-case tracking-normal">
                  {getCellLabel(cell)}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}