"use client";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { Cell } from "@/lib/tauri";
import { getLang } from "@/lib/languages";
import * as api from "@/lib/tauri";
import { emitDataChanged, emitSaveStatus } from "@/lib/events";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useNotebook(notebookId: string, initialCells: Cell[]) {
  const [cells, setCells] = useState<Cell[]>(initialCells);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks pending delete timers so they can be cancelled on unmount
  const pendingDeleteTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = pendingDeleteTimers.current;
    return () => { for (const t of timers) clearTimeout(t); };
  }, []);

  function markSaving() {
    setSaveStatus("saving");
    emitSaveStatus("saving");
    if (saveResetTimer.current) clearTimeout(saveResetTimer.current);
  }
  function markSaved() {
    setSaveStatus("saved");
    emitSaveStatus("saved");
    saveResetTimer.current = setTimeout(() => { setSaveStatus("idle"); emitSaveStatus("idle"); }, 2000);
  }
  function markError() {
    setSaveStatus("error");
    emitSaveStatus("error");
  }

  async function updateCell(cellId: string, content: string) {
    markSaving();
    try {
      const cell = cells.find((c) => c.id === cellId);
      if (!cell) return;
      await api.updateCell(cellId, content, cell.language, cell.order);
      markSaved();
    } catch {
      markError();
    }
  }

  async function updateCellLanguage(cellId: string, language: string) {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, language } : c)),
    );
    const cell = cells.find((c) => c.id === cellId);
    if (!cell) return;
    await api.updateCell(cellId, cell.content, language, cell.order).catch(console.error);
  }

  async function addCell(type: "code" | "markdown", language = "typescript") {
    const order = cells.length;
    const newCell = await api.createCell(notebookId, type, language, order);
    // Set default code content after creation
    if (type === "code") {
      const defaultCode = getLang(language).defaultCode;
      await api.updateCell(newCell.id, defaultCode, language, order).catch(console.error);
      newCell.content = defaultCode;
    }
    setCells((prev) => [...prev, newCell]);
    emitDataChanged();
  }

  async function insertCellAfter(
    afterCellId: string,
    type: "code" | "markdown",
    language = "typescript",
  ) {
    const index = cells.findIndex((c) => c.id === afterCellId);
    const order = index + 1;
    const newCell = await api.createCell(notebookId, type, language, order);
    if (type === "code") {
      const defaultCode = getLang(language).defaultCode;
      await api.updateCell(newCell.id, defaultCode, language, order).catch(console.error);
      newCell.content = defaultCode;
    }
    setCells((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, newCell);
      reorderCellsSilent(next);
      return next;
    });
    emitDataChanged();
  }

  async function insertCellBefore(
    beforeCellId: string,
    type: "code" | "markdown",
    language = "typescript",
  ) {
    const index = cells.findIndex((c) => c.id === beforeCellId);
    const order = Math.max(0, index);
    const newCell = await api.createCell(notebookId, type, language, order);
    if (type === "code") {
      const defaultCode = getLang(language).defaultCode;
      await api.updateCell(newCell.id, defaultCode, language, order).catch(console.error);
      newCell.content = defaultCode;
    }
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === beforeCellId);
      const next = [...prev];
      next.splice(Math.max(0, idx), 0, newCell);
      reorderCellsSilent(next);
      return next;
    });
    emitDataChanged();
  }

  function deleteCell(cellId: string) {
    const snapshot = cells;
    const deletedCell = snapshot.find((c) => c.id === cellId);
    const deletedIndex = snapshot.findIndex((c) => c.id === cellId);
    if (!deletedCell) return;

    setCells((prev) => prev.filter((c) => c.id !== cellId));

    let undone = false;
    let deleteTimer: ReturnType<typeof setTimeout>; // assigned below

    const toastId = toast("Block deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(deleteTimer);
          setCells((prev) => {
            const next = [...prev];
            next.splice(deletedIndex, 0, deletedCell);
            return next;
          });
          toast.dismiss(toastId);
        },
      },
    });

     deleteTimer = setTimeout(async () => {
      pendingDeleteTimers.current.delete(deleteTimer);
      if (!undone) {
        await api.deleteCell(cellId).catch(console.error);
        emitDataChanged();
      }
    }, 5500);
    pendingDeleteTimers.current.add(deleteTimer);
  }

  async function reorderCells(reordered: Cell[]) {
    setCells(reordered);
    await reorderCellsSilent(reordered);
  }

  async function reorderCellsSilent(ordered: Cell[]) {
    const orderedIds = ordered.map((c) => c.id);
    await api.reorderCells(notebookId, orderedIds).catch(console.error);
  }

  return {
    cells,
    saveStatus,
    updateCell,
    updateCellLanguage,
    addCell,
    insertCellAfter,
    insertCellBefore,
    deleteCell,
    reorderCells,
  };
}
