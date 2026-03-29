"use client";
import { Code2, FileText, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LANGUAGES, getLang } from "@/lib/languages";

const LAST_LANG_KEY = "nb_lastLang";

interface Props {
  onAdd: (type: "code" | "markdown", language?: string) => Promise<void>;
}

export default function AddCellBar({ onAdd }: Props) {
  const [lastLang, setLastLang] = useState("typescript");

  useEffect(() => {
    const saved = localStorage.getItem(LAST_LANG_KEY);
    if (saved) setLastLang(saved);
  }, []);

  function addCode(langId: string) {
    localStorage.setItem(LAST_LANG_KEY, langId);
    setLastLang(langId);
    onAdd("code", langId);
  }

  const lastLangLabel = getLang(lastLang).label;

  return (
    <div className="group flex items-center gap-1 py-3">
      <div className="h-px flex-1 bg-border/20 transition-colors group-hover:bg-border/50" />

      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAdd("markdown")}
              className="h-7 gap-1.5 px-2.5 text-[12px] text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-opacity"
            >
              <FileText className="h-3.5 w-3.5" />
              Text
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add text block</TooltipContent>
        </Tooltip>

        {/* Quick Code — uses last language */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addCode(lastLang)}
              className="h-7 gap-1.5 px-2.5 text-[12px] text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-opacity"
            >
              <Code2 className="h-3.5 w-3.5" />
              {lastLangLabel}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add {lastLangLabel} block</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full border border-border/50 text-muted-foreground/40 hover:border-primary/40 hover:bg-primary/8 hover:text-primary transition-all"
              aria-label="Add block"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => onAdd("markdown")} className="gap-2">
              <FileText className="h-3.5 w-3.5" />
              Text block
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.id}
                onClick={() => addCode(lang.id)}
                className="gap-2"
              >
                <Code2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="font-mono text-[12px]">{lang.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px flex-1 bg-border/20 transition-colors group-hover:bg-border/50" />
    </div>
  );
}

