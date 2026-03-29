"use client";
import { Plus, Code2, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LANGUAGES, getLang } from "@/lib/languages";

const LAST_LANG_KEY = "nb_lastLang";

interface Props {
  onInsert: (type: "code" | "markdown", language?: string) => void;
}

export default function InsertCellDivider({ onInsert }: Props) {
  const [lastLang, setLastLang] = useState("typescript");

  useEffect(() => {
    const saved = localStorage.getItem(LAST_LANG_KEY);
    if (saved) setLastLang(saved);
  }, []);

  function insertCode(langId: string) {
    localStorage.setItem(LAST_LANG_KEY, langId);
    setLastLang(langId);
    onInsert("code", langId);
  }

  const lastLangLabel = getLang(lastLang).label;

  return (
    <div className="group/insert flex items-center gap-1 py-2.5">
      <div className="h-px flex-1 bg-border/0 transition-colors group-hover/insert:bg-border/40" />

      <div className="flex items-center gap-0.5">
        {/* Quick Text — hover only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInsert("markdown")}
              className="h-7 gap-1.5 px-2.5 text-[12px] text-muted-foreground/50 hover:bg-accent hover:text-foreground opacity-0 group-hover/insert:opacity-100 transition-opacity"
            >
              <FileText className="h-3.5 w-3.5" />
              Text
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert text block</TooltipContent>
        </Tooltip>

        {/* Quick Code — uses last language */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertCode(lastLang)}
              className="h-7 gap-1.5 px-2.5 text-[12px] text-muted-foreground/50 hover:bg-accent hover:text-foreground opacity-0 group-hover/insert:opacity-100 transition-opacity"
            >
              <Code2 className="h-3.5 w-3.5" />
              {lastLangLabel}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert {lastLangLabel} block</TooltipContent>
        </Tooltip>

        {/* Always-visible + — opens the full dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full border border-border/0 bg-background text-muted-foreground/0 transition-all group-hover/insert:border-primary/30 group-hover/insert:text-primary"
              aria-label="Insert block here"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => onInsert("markdown")} className="gap-2">
              <FileText className="h-3.5 w-3.5" />
              Text block
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.id}
                onClick={() => insertCode(lang.id)}
                className="gap-2"
              >
                <Code2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="font-mono text-[12px]">{lang.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px flex-1 bg-border/0 transition-colors group-hover/insert:bg-border/40" />
    </div>
  );
}
