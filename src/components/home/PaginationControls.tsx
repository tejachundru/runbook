"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function PaginationControlsInner({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pageNums = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 bg-muted/30 border-t border-border/40 rounded-b-lg">
      <p className="text-xs text-muted-foreground tabular-nums">
        {totalCount} {totalCount === 1 ? "item" : "items"}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {pageNums.map((pageNum) => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0 text-xs"
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export const PaginationControls = memo(PaginationControlsInner);
