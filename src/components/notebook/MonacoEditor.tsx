"use client";
import { useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

/**
 * A lifecycle-safe Monaco editor wrapper.
 *
 * The stock `@monaco-editor/react` <Editor> creates and disposes a Monaco
 * editor instance on every React mount/unmount cycle.  Under React Strict Mode
 * (the Next.js default) and when cells are reordered via drag-and-drop, this
 * leads to the global `InstantiationService` being disposed while other
 * editors still reference it.
 *
 * This component manages the Monaco IStandaloneCodeEditor instance manually
 * via a persistent DOM ref so that React re-renders never touch it.
 */

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height: number;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
}

export default function MonacoEditor({
  language,
  value,
  onChange,
  height,
  onMount,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const onMountRef = useRef(onMount);
  const valueRef = useRef(value);
  const { resolvedTheme } = useTheme();

  // Keep refs fresh
  onChangeRef.current = onChange;
  onMountRef.current = onMount;
  valueRef.current = value;

  // Create the editor once, destroy only when the component truly unmounts
  useEffect(() => {
    let disposed = false;
    let editorInstance: editor.IStandaloneCodeEditor | null = null;

    loader.init().then((monaco) => {
      if (disposed || !containerRef.current) return;

      const instance = monaco.editor.create(containerRef.current, {
        value: valueRef.current,
        language,
        theme: document.documentElement.classList.contains("dark") ? "vs-dark" : "vs",
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "var(--font-mono), monospace",
        lineNumbers: "on",
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 18, bottom: 18 },
        renderLineHighlight: "gutter",
      });

      editorInstance = instance;
      editorRef.current = instance;

      // Forward model changes to React state
      instance.onDidChangeModelContent(() => {
        onChangeRef.current(instance.getValue());
      });

      if (onMountRef.current) {
        onMountRef.current(instance);
      }
    });

    return () => {
      disposed = true;
      // Only dispose if the editor was actually created
      if (editorInstance) {
        editorInstance.dispose();
        editorInstance = null;
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally empty — create once, destroy once

  // Sync external value changes (e.g. undo from parent)
  useEffect(() => {
    const ed = editorRef.current;
    if (ed && ed.getValue() !== value) {
      ed.setValue(value);
    }
  }, [value]);

  // Sync language changes
  useEffect(() => {
    const ed = editorRef.current;
    if (ed) {
      const model = ed.getModel();
      if (model) {
        loader.init().then((monaco) => {
          monaco.editor.setModelLanguage(model, language);
        });
      }
    }
  }, [language]);

  // Sync theme changes when user toggles light/dark mode
  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.editor.setTheme(resolvedTheme === "dark" ? "vs-dark" : "vs");
    });
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
    />
  );
}
