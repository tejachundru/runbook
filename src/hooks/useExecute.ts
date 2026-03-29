import { useState } from "react";
import type { CellOutput } from "@/types";
import { executeCode } from "@/lib/tauri";

export interface HistoryEntry {
  output: CellOutput;
  runAt: number;
}

const HISTORY_LIMIT = 5;

function readHistory(cellId: string): HistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(`__nb_hist_${cellId}`);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(cellId: string, history: HistoryEntry[]) {
  try {
    sessionStorage.setItem(`__nb_hist_${cellId}`, JSON.stringify(history));
  } catch {
    // sessionStorage not available
  }
}

export function useExecute(initialOutput: CellOutput | null = null, cellId?: string) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<CellOutput | null>(initialOutput);
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    cellId ? readHistory(cellId) : [],
  );

  async function run(languageId: string, code: string, _stdin?: string, timeoutMs = 30_000) {
    if (loading) return;
    setLoading(true);
    setOutput(null);
    const start = Date.now();

    try {
      const result = await executeCode(languageId, code, timeoutMs);
      const newOutput: CellOutput = {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: Date.now() - start,
      };
      setOutput(newOutput);
      setHistory((prev) => {
        const next = [{ output: newOutput, runAt: Date.now() }, ...prev].slice(0, HISTORY_LIMIT);
        if (cellId) writeHistory(cellId, next);
        return next;
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const errOutput: CellOutput = {
        stdout: "",
        stderr: message,
        exitCode: 1,
        durationMs: Date.now() - start,
      };
      setOutput(errOutput);
      setHistory((prev) => {
        const next = [{ output: errOutput, runAt: Date.now() }, ...prev].slice(0, HISTORY_LIMIT);
        if (cellId) writeHistory(cellId, next);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  function clearOutput() {
    setOutput(null);
  }

  return { loading, output, history, run, clearOutput };
}
