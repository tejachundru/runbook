import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, FileText, Terminal, AlertCircle, RotateCcw } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] text-gray-900 dark:text-gray-300 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-2xl">
        
        {/* Notebook Window */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161b22] shadow-xl overflow-hidden">
          
          {/* Window Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-[#0d1117]">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500" />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                <Terminal className="w-3.5 h-3.5" />
                <span>404.ipynb</span>
              </div>
            </div>
            <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors">
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {/* Cell Content */}
          <div className="p-6 space-y-6">
            
            {/* Input Cell */}
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">In [404]:</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>
              
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1117] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">python</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-sm bg-gray-300 dark:bg-gray-700" />
                    <div className="w-2 h-2 rounded-sm bg-gray-300 dark:bg-gray-700" />
                  </div>
                </div>
                <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto">
                  <code>
                    <span className="text-purple-600 dark:text-pink-400">import</span> <span className="text-sky-600 dark:text-sky-300">navigator</span>
                    {"\n\n"}
                    <span className="text-gray-400 italic"># Attempting to locate the requested page</span>
                    {"\n"}<span className="text-sky-700 dark:text-sky-300">result</span> <span className="text-purple-600 dark:text-pink-400">=</span> <span className="text-sky-700 dark:text-sky-300">navigator</span>.<span className="text-emerald-600 dark:text-emerald-400">find_page</span>(<span className="text-amber-600 dark:text-amber-400">&quot;/...&quot;</span>)
                    {"\n"}<span className="text-sky-700 dark:text-sky-300">print</span>(<span className="text-sky-700 dark:text-sky-300">result</span>)
                  </code>
                </pre>
              </div>
            </div>

            {/* Output Cell - Error */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 font-mono">Out [404]:</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>

              <div className="rounded-md border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 overflow-hidden">
                <div className="p-4 font-mono text-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-red-700 dark:text-red-400">
                        <span className="font-bold">PageNotFoundError</span>
                        <span className="text-red-600/70 dark:text-red-400/60 text-xs ml-2">Traceback (most recent call last)</span>
                      </p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 mt-2 pl-2 border-l-2 border-red-300 dark:border-red-800">
                        <p>File <span className="text-gray-800 dark:text-gray-300">&quot;navigator.py&quot;</span>, line <span className="text-amber-600 dark:text-amber-400">404</span>, in <span className="text-emerald-600 dark:text-emerald-400">find_page</span></p>
                        <p className="text-red-600 dark:text-red-300/90">
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
                className="flex items-center gap-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1117] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Back to Home</p>
                  <p className="text-xs text-gray-500">Return to dashboard</p>
                </div>
              </Link>

              <Link 
                href="/notebooks/new"
                className="flex items-center gap-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1117] hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">New Notebook</p>
                  <p className="text-xs text-gray-500">Start fresh session</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-[#0d1117] border-t border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-500 dark:text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
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
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          HTTP 404 · Page not found in namespace
        </p>
      </div>
    </div>
  );
}