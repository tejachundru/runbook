"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, X, Clock, History, Copy } from "lucide-react";
import { toast } from "sonner";
import type { CellOutput } from "@/types";
import type { HistoryEntry } from "@/hooks/useExecute";

const IMAGE_RE = /(data:image\/[^;]+;base64,[A-Za-z0-9+/]+=*)/;

function renderContent(text: string) {
  const parts = text?.split(IMAGE_RE) || [];
  return parts.map((part, i) =>
    IMAGE_RE.test(part) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={i} src={part} alt="Output image" className="my-2 max-w-full rounded-lg" />
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

interface Props {
  output: CellOutput;
  onClear: () => void;
  history?: HistoryEntry[];
}

function formatRunAt(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (history.length === 0) return null;

  return (
    <div className="divide-y divide-border/50">
      {history.map((entry, i) => {
        const isErr = entry.output.exitCode !== 0;
        const Icon = isErr ? XCircle : CheckCircle2;
        const isOpen = expanded === i;
        const preview = (entry.output.stdout || entry.output.stderr).slice(0, 80);

        return (
          <div key={entry.runAt}>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <Icon
                className={`h-3 w-3 shrink-0 ${isErr ? "text-destructive" : "text-primary"}`}
              />
              <span className="font-mono text-[11px] text-muted-foreground/75 shrink-0 tabular-nums">
                {formatRunAt(entry.runAt)}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground/65 shrink-0 tabular-nums">
                {entry.output.durationMs}ms
              </span>
              {preview && !isOpen && (
                <span className="font-mono text-[11px] text-foreground/70 truncate flex-1">
                  {preview}
                </span>
              )}
            </button>
            {isOpen && (
              <pre
                className={`whitespace-pre-wrap px-5 pb-3 pt-1 font-mono text-[12px] leading-relaxed ${
                  isErr ? "text-destructive" : "text-foreground"
                }`}
              >
                {renderContent(entry.output.stdout || entry.output.stderr)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OutputPanel({ output, onClear, history = [] }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"stdout" | "stderr">("stdout");
  const isError = output.exitCode !== 0;

  function copyOutput() {
    const text = output.stdout && output.stderr
      ? (activeTab === "stdout" ? output.stdout : output.stderr)
      : (output.stdout || output.stderr);
    navigator.clipboard.writeText(text).then(() => toast.success("Copied"));
  }
  const hasStdout = !!output.stdout;
  const hasStderr = !!output.stderr;
  const bothStreams = hasStdout && hasStderr;

  const StatusIcon = isError ? XCircle : CheckCircle2;
  // Only show history entries that are not the current output
  const pastHistory = history.slice(1);

  const meta = (
    <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
      <span className={`flex items-center gap-1 font-mono ${isError ? "text-destructive" : "text-primary"}`}>
        <StatusIcon className="h-3 w-3" />
        exit {output.exitCode}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-2.5 w-2.5" />
        {output.durationMs}ms
      </span>
      {pastHistory.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory((v) => !v)}
              className={`h-6 w-6 rounded-md hover:bg-accent hover:text-foreground ${
                showHistory ? "bg-accent text-foreground" : "text-muted-foreground/70"
              }`}
            >
              <History className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showHistory ? "Hide history" : `${pastHistory.length} past run${pastHistory.length > 1 ? "s" : ""}`}</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyOutput}
            className="h-6 w-6 rounded-md text-muted-foreground/70 hover:bg-accent hover:text-foreground"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy output</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-6 w-6 rounded-md text-muted-foreground/70 hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Dismiss output</TooltipContent>
      </Tooltip>
    </div>
  );

  const wrapperClass = `border-t font-mono text-[12.5px] ${
    isError
      ? "border-destructive/30 bg-destructive/[0.08]"
      : "border-primary/20 bg-primary/[0.06]"
  }`;

  /* ── Single stream: no tabs needed ── */
  if (!bothStreams) {
    const content = hasStdout ? output.stdout : output.stderr;
    const contentClass = hasStderr ? "text-destructive" : "text-foreground";
    return (
      <div className={wrapperClass}>
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {hasStdout ? "Output" : "Error"}
          </span>
          {meta}
        </div>
        <pre className={`whitespace-pre-wrap px-5 pb-5 pt-2 leading-relaxed ${contentClass}`}>
          {renderContent(content)}
        </pre>
        {showHistory && pastHistory.length > 0 && (
          <div className="border-t border-border/50">
            <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              History
            </div>
            <HistoryPanel history={pastHistory} />
          </div>
        )}
      </div>
    );
  }

  /* ── Both streams: show tabs ── */
  return (
    <div className={wrapperClass}>
      <Tabs defaultValue="stdout" className="w-full" onValueChange={(v) => setActiveTab(v as "stdout" | "stderr")}>
        <div className="flex items-center justify-between px-5 pt-3">
          <TabsList className="h-7 rounded-md border border-border bg-background/80 p-0.5">
            <TabsTrigger value="stdout" className="h-6 rounded px-2.5 text-[11px]">stdout</TabsTrigger>
            <TabsTrigger value="stderr" className="h-6 rounded px-2.5 text-[11px] text-destructive">stderr</TabsTrigger>
          </TabsList>
          {meta}
        </div>
        <TabsContent value="stdout" className="mt-0">
          <pre className="whitespace-pre-wrap px-5 pb-5 pt-3 leading-relaxed text-foreground">
            {renderContent(output.stdout)}
          </pre>
        </TabsContent>
        <TabsContent value="stderr" className="mt-0">
          <pre className="whitespace-pre-wrap px-5 pb-5 pt-3 leading-relaxed text-destructive">
            {renderContent(output.stderr)}
          </pre>
        </TabsContent>
      </Tabs>
      {showHistory && pastHistory.length > 0 && (
        <div className="border-t border-border/30">
          <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            History
          </div>
          <HistoryPanel history={pastHistory} />
        </div>
      )}
    </div>
  );
}

