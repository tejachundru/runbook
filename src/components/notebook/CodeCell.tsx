"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useExecute } from "@/hooks/useExecute";
import { getLang } from "@/lib/languages";
import CellToolbar from "./CellToolbar";
import OutputPanel from "./OutputPanel";
import MonacoEditor from "./MonacoEditor";
import type { Cell } from "@/types";
import type { CellOutput } from "@/types";
import type * as Monaco from "monaco-editor";

interface Props {
  cell: Cell;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onLanguageChange?: (cellId: string, langId: string) => void;
  collapsed?: boolean;
  clearSignal?: number;
  executionNumber?: number;
  onRunStart?: () => void;
  execTimeoutMs?: number;
}

function readPersistedOutput(cellId: string): CellOutput | null {
  try {
    const raw = sessionStorage.getItem(`__nb_out_${cellId}`);
    return raw ? (JSON.parse(raw) as CellOutput) : null;
  } catch {
    return null;
  }
}

function writePersistedOutput(cellId: string, out: CellOutput | null) {
  try {
    if (out) sessionStorage.setItem(`__nb_out_${cellId}`, JSON.stringify(out));
    else sessionStorage.removeItem(`__nb_out_${cellId}`);
  } catch {
    // sessionStorage not available
  }
}

export default React.memo(function CodeCell({
  cell,
  onUpdate,
  onDelete,
  onLanguageChange,
  collapsed,
  clearSignal,
  executionNumber,
  onRunStart,
  execTimeoutMs = 30_000,
}: Props) {
  const [code, setCode] = useState(cell.content);
  const [stdin, setStdin] = useState("");
  const [stdinExpanded, setStdinExpanded] = useState(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const { run, loading, output, clearOutput, history } = useExecute(
    readPersistedOutput(cell.id),
    cell.id,
  );
  const lang = getLang(cell.language);
  useAutoSave(code, (v) => onUpdate(cell.id, v));

  // Keep refs so the Monaco keybinding always sees latest values
  const codeRef = useRef(code);
  const stdinRef = useRef(stdin);
  codeRef.current = code;
  stdinRef.current = stdin;

  const handleRun = useCallback(() => {
    onRunStart?.();
    run(cell.language, codeRef.current, stdinRef.current, execTimeoutMs);
  }, [onRunStart, run, cell.language, execTimeoutMs]);

  // Keep a stable ref to handleRun so the Monaco keybinding always calls the latest version
  const handleRunRef = useRef(handleRun);
  handleRunRef.current = handleRun;

  // Persist output to sessionStorage
  useEffect(() => {
    writePersistedOutput(cell.id, output);
  }, [output, cell.id]);

  // Respond to "clear all outputs" signal from parent
  useEffect(() => {
    if ((clearSignal ?? 0) > 0) clearOutput();
  }, [clearSignal, clearOutput]);

  const handleEditorMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      // Shift+Enter to run (1024 = KeyMod.Shift, 3 = KeyCode.Enter)
      editor.addCommand(1024 | 3, () => handleRunRef.current());
      // Cmd/Ctrl+Enter to run (2048 = KeyMod.CtrlCmd, 3 = KeyCode.Enter)
      editor.addCommand(2048 | 3, () => handleRunRef.current());
    },
    [], // stable — always calls current handleRun via ref
  );

  const handleInsertSnippet = useCallback(
    (snippetCode: string) => {
      setCode(snippetCode);
      onUpdate(cell.id, snippetCode);
      // Also push the new value into the monaco editor if mounted
      if (editorRef.current) {
        editorRef.current.setValue(snippetCode);
      }
    },
    [cell.id, onUpdate],
  );

  const lastStatus = output
    ? output.exitCode === 0
      ? "success"
      : "error"
    : "idle";

  const statusBorder =
    lastStatus === "success"
      ? "border-l-4 border-l-primary/50"
      : lastStatus === "error"
        ? "border-l-4 border-l-destructive/50"
        : "";

  return (
    <div className="group rounded-xl bg-background">
      <CellToolbar
        language={lang}
        running={loading}
        executionNumber={executionNumber}
        onRun={handleRun}
        onDelete={() => onDelete(cell.id)}
        onLanguageChange={
          onLanguageChange
            ? (langId) => onLanguageChange(cell.id, langId)
            : undefined
        }
        onInsertSnippet={handleInsertSnippet}
      />

      {!collapsed && (
        <>
          <div
            className={`overflow-hidden rounded-b-xl border-t border-border bg-card ${statusBorder}`}
          >
            <MonacoEditor
              language={lang.monacoLang}
              value={code}
              onChange={setCode}
              onMount={handleEditorMount}
              height={Math.max(120, code.split("\n").length * 22 + 36)}
            />
          </div>

          {/* Stdin input — always visible, expands on focus */}
          <div className="border-t border-border/40 bg-muted/10">
            <button
              type="button"
              onClick={() => setStdinExpanded((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <span>stdin</span>
              {stdin && <span className="font-normal normal-case text-muted-foreground/50 truncate max-w-[200px]">· {stdin.split("\n")[0]}</span>}
              <span className="ml-auto">{stdinExpanded ? "▲" : "▼"}</span>
            </button>
            {stdinExpanded && (
              <div className="px-4 pb-3">
                <textarea
                  autoFocus
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Provide input for this run…"
                  className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-[12.5px] text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-border"
                  style={{ minHeight: "64px" }}
                />
              </div>
            )}
          </div>

          {output && <OutputPanel output={output} onClear={clearOutput} history={history} />}
        </>
      )}

      {/* Collapsed summary row */}
      {collapsed && output && (
        <div className="border-t border-border/30 px-5 py-1.5 font-mono text-[11px] text-muted-foreground/70">
          exit {output.exitCode} · {output.durationMs}ms
          {output.stdout && (
            <span className="ml-2 truncate text-foreground/50">
              {output.stdout.slice(0, 80)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
