import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, FileText, Terminal, AlertCircle, RotateCcw } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Notebook Window */}
        <div className="rounded-lg border border-border bg-card shadow-xl overflow-hidden">

          {/* Window Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Terminal className="w-3.5 h-3.5" />
                <span>404.ipynb</span>
              </div>
            </div>
            <button type="button" className="p-1.5 hover:bg-accent rounded-md transition-colors">
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Cell Content */}
          <div className="p-6 space-y-6">

            {/* Input Cell */}
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-primary font-mono">In [404]:</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="rounded-md border border-border bg-code-surface overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-card border-b border-border">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">python</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-sm bg-border" />
                    <div className="w-2 h-2 rounded-sm bg-border" />
                  </div>
                </div>
                <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto">
                  <code>
                    <span className="text-purple-600 dark:text-pink-400">import</span> <span className="text-sky-600 dark:text-sky-300">navigator</span>
                    {"\n\n"}
                    <span className="text-muted-foreground italic"># Attempting to locate the requested page</span>
                    {"\n"}<span className="text-sky-700 dark:text-sky-300">result</span> <span className="text-purple-600 dark:text-pink-400">=</span> <span className="text-sky-700 dark:text-sky-300">navigator</span>.<span className="text-emerald-600 dark:text-emerald-400">find_page</span>(<span className="text-amber-600 dark:text-amber-400">&quot;/...&quot;</span>)
                    {"\n"}<span className="text-sky-700 dark:text-sky-300">print</span>(<span className="text-sky-700 dark:text-sky-300">result</span>)
                  </code>
                </pre>
              </div>
            </div>

            {/* Output Cell - Error */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-destructive font-mono">Out [404]:</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="rounded-md border border-destructive/30 bg-destructive/5 overflow-hidden">
                <div className="p-4 font-mono text-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-destructive">
                        <span className="font-bold">PageNotFoundError</span>
                        <span className="text-destructive/60 text-xs ml-2">Traceback (most recent call last)</span>
                      </p>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-2 pl-2 border-l-2 border-destructive/40">
                        <p>File <span className="text-foreground/80">&quot;navigator.py&quot;</span>, line <span className="text-amber-600 dark:text-amber-400">404</span>, in <span className="text-emerald-600 dark:text-emerald-400">find_page</span></p>
                        <p className="text-destructive/80">
                          raise PageNotFoundError(
                          <span className="text-amber-700 dark:text-amber-400">&quot;The page you&apos;re looking for doesn&apos;t exist.&quot;</span>
                          )
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/"
                className="flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Home className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary">Back to Home</p>
                  <p className="text-xs text-muted-foreground">Return to dashboard</p>
                </div>
              </Link>

              <Link
                href="/notebooks/new"
                className="flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:border-emerald-500 hover:bg-emerald-500/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">New Notebook</p>
                  <p className="text-xs text-muted-foreground">Start fresh session</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-t border-border text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                <span className="hidden sm:inline">Kernel Error</span>
                <span className="sm:hidden">Error</span>
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">python3</span>
            </div>
            <div className="flex items-center gap-3">
              <span>LN 404</span>
              <span>UTF-8</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          HTTP 404 · Page not found in namespace
        </p>
      </div>
    </div>
  );
}