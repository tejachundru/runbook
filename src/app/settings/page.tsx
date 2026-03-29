"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Database, FolderOpen, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as api from "@/lib/tauri";
import { useRouter } from "next/navigation";
import { emitDataChanged } from "@/lib/events";

export default function SettingsPage() {
  const router = useRouter();
  // ── Execution timeout ──
  const [timeoutMs, setTimeoutMs] = useState("30000");
  const [savingTimeout, setSavingTimeout] = useState(false);

  // ── Backup folder ──
  const [backupFolder, setBackupFolder] = useState<string | null>(null);
  const [loadingBackup, setLoadingBackup] = useState(false);

  // ── Database backup ──
  const [backingUpDb, setBackingUpDb] = useState(false);

  // ── Database restore ──
  const [restoringDb, setRestoringDb] = useState(false);

  // ── Import from Markdown ──
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.getSetting("exec_timeout"),
      api.getBackupFolder(),
    ])
      .then(([to, folder]) => {
        if (!active) return;
        if (to) setTimeoutMs(to);
        setBackupFolder(folder);
      })
      .catch(console.error);

    return () => { active = false; };
  }, []);

  const saveTimeout = useCallback(async () => {
    const parsed = Number.parseInt(timeoutMs, 10);
    if (Number.isNaN(parsed) || parsed < 1000) {
      toast.error("Timeout must be at least 1000 ms");
      return;
    }
    setSavingTimeout(true);
    try {
      await api.setSetting("exec_timeout", String(parsed));
      toast.success("Timeout saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save timeout");
    } finally {
      setSavingTimeout(false);
    }
  }, [timeoutMs]);

  const pickBackupFolder = useCallback(async () => {
    setLoadingBackup(true);
    try {
      const folder = await api.selectBackupFolder();
      if (folder) {
        setBackupFolder(folder);
        toast.success("Backup folder updated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to select folder");
    } finally {
      setLoadingBackup(false);
    }
  }, []);

  const runDatabaseBackup = useCallback(async () => {
    setBackingUpDb(true);
    try {
      const result = await api.backupDatabase();
      if (result.success && result.file_path) {
        toast.success(`Database backed up to ${result.file_path}`);
      } else {
        toast.error(result.error ?? "Backup failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBackingUpDb(false);
    }
  }, []);

  const runDatabaseRestore = useCallback(async () => {
    setRestoringDb(true);
    try {
      const result = await api.restoreDatabase();
      if (result.success && result.file_path) {
        toast.success(`Database restored. Reloading…`);
        // Give the toast a moment to show before the reload clears the page
        window.setTimeout(() => window.location.reload(), 800);
      } else if (result.error) {
        toast.error(result.error);
        setRestoringDb(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
      setRestoringDb(false);
    }
  }, []);

  const runImportMarkdown = useCallback(async () => {
    setImporting(true);
    try {
      const notebook = await api.importNotebookFromMarkdown();
      if (notebook) {
        emitDataChanged();
        toast.success(`Imported “${notebook.title}”`);
        router.push(`/notebooks?id=${notebook.id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-8 md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure runtime and storage options</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Execution timeout ── */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Execution Timeout</h2>
                <p className="text-xs text-muted-foreground">
                  Maximum time (ms) a cell is allowed to run before it is killed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1000}
                step={1000}
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTimeout()}
                className="h-9 w-40 rounded-lg font-mono text-sm"
              />
              <span className="text-sm text-muted-foreground">ms</span>
              <Button
                size="sm"
                onClick={saveTimeout}
                disabled={savingTimeout}
                className="ml-auto h-9 px-4"
              >
                {savingTimeout ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                ) : (
                  "Save"
                )}
              </Button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground/60">
              Recommended: 30000 ms (30 s). Increase for long-running computations.
            </p>
          </section>

          {/* ── Backup folder ── */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Backup Folder</h2>
                <p className="text-xs text-muted-foreground">
                  Directory where exported markdown files are saved by default
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground">
                {backupFolder ?? (
                  <span className="italic text-muted-foreground/50">Not set</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={pickBackupFolder}
                disabled={loadingBackup}
                className="h-9 shrink-0 px-4"
              >
                {loadingBackup ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Opening…</>
                ) : (
                  "Choose…"
                )}
              </Button>
            </div>
          </section>

          {/* ── Database backup ── */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Database Backup &amp; Restore</h2>
                <p className="text-xs text-muted-foreground">
                  Copy the SQLite database to your backup folder, or restore from a previous backup
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-muted-foreground">
                {backupFolder ? (
                  <>Saves to <span className="font-mono text-xs">{backupFolder}</span></>
                ) : (
                  <span className="italic text-muted-foreground/60">Set a backup folder above first</span>
                )}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={runDatabaseRestore}
                disabled={restoringDb}
                className="h-9 shrink-0 px-4"
              >
                {restoringDb ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Restoring…</>
                ) : (
                  "Restore…"
                )}
              </Button>
              <Button
                size="sm"
                onClick={runDatabaseBackup}
                disabled={backingUpDb || !backupFolder}
                className="h-9 shrink-0 px-4"
              >
                {backingUpDb ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Backing up…</>
                ) : (
                  "Back up now"
                )}
              </Button>
            </div>
          </section>
          {/* ── Import from Markdown ── */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                <FileDown className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Import from Markdown</h2>
                <p className="text-xs text-muted-foreground">
                  Create a new notebook by importing a <span className="font-mono">.md</span> file. Fenced code blocks become code cells; prose becomes markdown cells.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runImportMarkdown}
              disabled={importing}
              className="h-9 px-4"
            >
              {importing ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Importing…</>
              ) : (
                "Import .md file…"
              )}
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
