"use client";
import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import CodeCell from "./CodeCell";
import MarkdownCell from "./MarkdownCell";
import InsertCellDivider from "./InsertCellDivider";
import type { Cell } from "@/types";

function StaticCell({
  activeCellId,
  cell,
  collapsed,
  clearSignal,
  executionNumber,
  execTimeoutMs,
  onUpdate,
  onDelete,
  onFocus,
  onToggleCollapse,
  onLanguageChange,
  onRunStart,
}: {
  activeCellId: string | null;
  cell: Cell;
  collapsed?: boolean;
  clearSignal?: number;
  executionNumber?: number;
  execTimeoutMs?: number;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
  onToggleCollapse?: () => void;
  onLanguageChange?: (cellId: string, langId: string) => void;
  onRunStart?: () => void;
}) {
  const isActive = activeCellId === cell.id;
  const isCode = cell.type === "code";

  return (
    <section
      data-cell-id={cell.id}
      className={cn(
        "group relative scroll-mt-28 rounded-xl transition-all duration-200",
        isCode && isActive && "ring-1 ring-border shadow-sm",
        !isCode && isActive && "bg-primary/[0.03] rounded-xl",
      )}
      onPointerDown={() => onFocus(cell.id)}
    >
      {/* Collapse toggle — left of cell, visible on hover */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          className={cn(
            "absolute -left-8 top-2.5 hidden h-6 w-6 items-center justify-center rounded-md border border-border/40 bg-background text-muted-foreground/30 shadow-sm transition-all hover:border-border hover:text-foreground md:flex",
            "opacity-0 group-hover:opacity-100",
            collapsed && "opacity-100 text-primary/60 border-primary/30",
          )}
          title={collapsed ? "Expand cell" : "Collapse cell"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          isCode && "border border-border bg-background",
          isCode && isActive && "border-primary/30",
        )}
      >
        {isCode ? (
          <CodeCell
            cell={cell}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onLanguageChange={onLanguageChange}
            collapsed={collapsed}
            clearSignal={clearSignal}
            executionNumber={executionNumber}
            execTimeoutMs={execTimeoutMs}
            onRunStart={onRunStart}
          />
        ) : (
          <MarkdownCell cell={cell} onUpdate={onUpdate} onDelete={onDelete} collapsed={collapsed} />
        )}
      </div>
    </section>
  );
}

function SortableCell({
  activeCellId,
  cell,
  dragging,
  collapsed,
  clearSignal,
  executionNumber,
  execTimeoutMs,
  onUpdate,
  onDelete,
  onFocus,
  onToggleCollapse,
  onLanguageChange,
  onRunStart,
}: {
  activeCellId: string | null;
  cell: Cell;
  dragging: boolean;
  collapsed?: boolean;
  clearSignal?: number;
  executionNumber?: number;
  execTimeoutMs?: number;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
  onToggleCollapse?: () => void;
  onLanguageChange?: (cellId: string, langId: string) => void;
  onRunStart?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cell.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Keep in DOM but visually hidden during drag so Monaco isn't disposed
    ...(isDragging && { opacity: 0, pointerEvents: "none" as const }),
  };

  const isActive = activeCellId === cell.id;
  const isCode = cell.type === "code";

  return (
    <section
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-cell-id={cell.id}
      className={cn(
        "group relative scroll-mt-28 rounded-xl transition-all duration-200",
        isCode && isActive && "ring-1 ring-border shadow-sm",
        !isCode && isActive && "bg-primary/[0.03] rounded-xl",
        (dragging || isDragging) && "z-20",
      )}
      onPointerDown={() => onFocus(cell.id)}
    >
      {/* Drag handle */}
      <div className="absolute -left-12 top-5 hidden md:block">
        <div
          {...listeners}
          className={cn(
            "flex h-8 w-8 cursor-grab items-center justify-center rounded-xl border border-border/50 bg-background text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-accent/55 hover:text-foreground group-hover:opacity-100",
            isActive &&
              "border-primary/24 bg-primary/10 text-primary opacity-100",
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          className={cn(
            "absolute -left-5 top-2.5 hidden h-5 w-5 items-center justify-center rounded-md text-muted-foreground/25 transition-all hover:text-muted-foreground md:flex",
            "opacity-0 group-hover:opacity-100",
            collapsed && "opacity-100 text-primary/50",
          )}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          isCode && "border border-border bg-background",
          isCode && isActive && "border-primary/30",
        )}
      >
        {isCode ? (
          <CodeCell
            cell={cell}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onLanguageChange={onLanguageChange}
            collapsed={collapsed}
            clearSignal={clearSignal}
            executionNumber={executionNumber}
            execTimeoutMs={execTimeoutMs}
            onRunStart={onRunStart}
          />
        ) : (
          <MarkdownCell cell={cell} onUpdate={onUpdate} onDelete={onDelete} collapsed={collapsed} />
        )}
      </div>
    </section>
  );
}

function DragPreview({ cell }: { cell: Cell }) {
  return (
    <div className="w-[min(760px,calc(100vw-3rem))] rounded-xl border border-border bg-background px-5 py-4 shadow-xl">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <GripVertical className="h-3.5 w-3.5" />
        Reordering {cell.type === "code" ? cell.language : "markdown"} block
      </div>
      <p className="mt-2 truncate text-sm font-medium text-foreground">
        {cell.content.split("\n").find((line) => line.trim().length > 0) ||
          "Empty block"}
      </p>
    </div>
  );
}

interface Props {
  activeCellId: string | null;
  cells: Cell[];
  collapsedCells?: Set<string>;
  execNumbers?: Record<string, number>;
  execTimeoutMs?: number;
  clearSignal?: number;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onReorder: (cells: Cell[]) => Promise<void>;
  onFocusCell: (id: string) => void;
  onInsertAfter: (
    afterCellId: string,
    type: "code" | "markdown",
    language?: string,
  ) => void;
  onToggleCollapse?: (cellId: string) => void;
  onLanguageChange?: (cellId: string, langId: string) => void;
  onCellRunStart?: (cellId: string) => void;
}

export default function CellList({
  activeCellId,
  cells,
  collapsedCells,
  execNumbers,
  execTimeoutMs,
  clearSignal,
  onUpdate,
  onDelete,
  onReorder,
  onFocusCell,
  onInsertAfter,
  onToggleCollapse,
  onLanguageChange,
  onCellRunStart,
}: Props) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeDragCell = cells.find((cell) => cell.id === activeDragId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    if (over && active.id !== over.id) {
      const oldIndex = cells.findIndex((c) => c.id === active.id);
      const newIndex = cells.findIndex((c) => c.id === over.id);
      onReorder(arrayMove(cells, oldIndex, newIndex));
    }
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-5 md:gap-6 md:pl-12">
        {cells.map((cell) => (
          <StaticCell
            key={cell.id}
            activeCellId={activeCellId}
            cell={cell}
            collapsed={collapsedCells?.has(cell.id)}
            clearSignal={clearSignal}
            executionNumber={execNumbers?.[cell.id]}
            execTimeoutMs={execTimeoutMs}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onFocus={onFocusCell}
            onToggleCollapse={onToggleCollapse ? () => onToggleCollapse(cell.id) : undefined}
            onLanguageChange={onLanguageChange}
            onRunStart={onCellRunStart ? () => onCellRunStart(cell.id) : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={cells.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col md:pl-12">
          {cells.map((cell, index) => (
            <div key={cell.id}>
              {index > 0 && (
                <InsertCellDivider
                  onInsert={(type, language) =>
                    onInsertAfter(cells[index - 1].id, type, language)
                  }
                />
              )}
              <SortableCell
                activeCellId={activeCellId}
                cell={cell}
                dragging={activeDragId === cell.id}
                collapsed={collapsedCells?.has(cell.id)}
                clearSignal={clearSignal}
                executionNumber={execNumbers?.[cell.id]}
                execTimeoutMs={execTimeoutMs}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onFocus={onFocusCell}
                onToggleCollapse={onToggleCollapse ? () => onToggleCollapse(cell.id) : undefined}
                onLanguageChange={onLanguageChange}
                onRunStart={onCellRunStart ? () => onCellRunStart(cell.id) : undefined}
              />
            </div>
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeDragCell ? <DragPreview cell={activeDragCell} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
