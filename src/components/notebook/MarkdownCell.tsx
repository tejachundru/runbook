"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  Link2,
  Code2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DeleteCellDialog from "./DeleteCellDialog";
import { cn } from "@/lib/utils";
import type { Cell } from "@/types";

interface Props {
  cell: Cell;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  collapsed?: boolean;
}

type FormatResult =
  | { value: string; newStart: number; newEnd: number; newCursorPos?: never }
  | { value: string; newCursorPos: number; newStart?: never; newEnd?: never };

function wrapText(
  textarea: HTMLTextAreaElement,
  before: string,
  after = "",
  placeholder = "",
): FormatResult {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || placeholder;
  const value =
    textarea.value.slice(0, start) +
    before +
    selected +
    after +
    textarea.value.slice(end);
  return { value, newStart: start + before.length, newEnd: start + before.length + selected.length };
}

function toggleLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
): FormatResult {
  const pos = textarea.selectionStart;
  const text = textarea.value;
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  const nlIdx = text.indexOf("\n", pos);
  const lineEnd = nlIdx === -1 ? text.length : nlIdx;
  const line = text.slice(lineStart, lineEnd);

  if (line.startsWith(prefix)) {
    return {
      value: text.slice(0, lineStart) + line.slice(prefix.length) + text.slice(lineEnd),
      newCursorPos: Math.max(lineStart, pos - prefix.length),
    };
  }
  return {
    value: text.slice(0, lineStart) + prefix + line + text.slice(lineEnd),
    newCursorPos: pos + prefix.length,
  };
}

const TOOLBAR_GROUPS: Array<Array<{
  key: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  fn: (ta: HTMLTextAreaElement) => FormatResult;
}>> = [
  [
    {
      key: "h1",
      label: "Heading 1",
      shortcut: "#",
      icon: <span className="font-mono text-[10px] font-bold leading-none">H1</span>,
      fn: (ta) => toggleLinePrefix(ta, "# "),
    },
    {
      key: "h2",
      label: "Heading 2",
      shortcut: "##",
      icon: <span className="font-mono text-[10px] font-bold leading-none">H2</span>,
      fn: (ta) => toggleLinePrefix(ta, "## "),
    },
    {
      key: "h3",
      label: "Heading 3",
      shortcut: "###",
      icon: <span className="font-mono text-[10px] font-bold leading-none">H3</span>,
      fn: (ta) => toggleLinePrefix(ta, "### "),
    },
  ],
  [
    {
      key: "bold",
      label: "Bold",
      shortcut: "⌘B",
      icon: <Bold className="h-3.5 w-3.5" />,
      fn: (ta) => wrapText(ta, "**", "**", "bold text"),
    },
    {
      key: "italic",
      label: "Italic",
      shortcut: "⌘I",
      icon: <Italic className="h-3.5 w-3.5" />,
      fn: (ta) => wrapText(ta, "_", "_", "italic text"),
    },
    {
      key: "strike",
      label: "Strikethrough",
      shortcut: "⌘⇧S",
      icon: <Strikethrough className="h-3.5 w-3.5" />,
      fn: (ta) => wrapText(ta, "~~", "~~", "text"),
    },
    {
      key: "code",
      label: "Inline code",
      shortcut: "⌘`",
      icon: <Code className="h-3.5 w-3.5" />,
      fn: (ta) => wrapText(ta, "`", "`", "code"),
    },
  ],
  [
    {
      key: "blockquote",
      label: "Blockquote",
      shortcut: ">",
      icon: <Quote className="h-3.5 w-3.5" />,
      fn: (ta) => toggleLinePrefix(ta, "> "),
    },
    {
      key: "ul",
      label: "Bullet list",
      shortcut: "-",
      icon: <List className="h-3.5 w-3.5" />,
      fn: (ta) => toggleLinePrefix(ta, "- "),
    },
    {
      key: "ol",
      label: "Numbered list",
      shortcut: "1.",
      icon: <ListOrdered className="h-3.5 w-3.5" />,
      fn: (ta) => toggleLinePrefix(ta, "1. "),
    },
  ],
  [
    {
      key: "codeblock",
      label: "Code block",
      shortcut: "```",
      icon: <Code2 className="h-3.5 w-3.5" />,
      fn: (ta) => {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = ta.value.slice(start, end) || "// code here";
        const before = "```\n";
        const after = "\n```";
        const value =
          ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
        return { value, newStart: start + before.length, newEnd: start + before.length + selected.length };
      },
    },
    {
      key: "link",
      label: "Link",
      shortcut: "⌘K",
      icon: <Link2 className="h-3.5 w-3.5" />,
      fn: (ta) => wrapText(ta, "[", "](url)", "link text"),
    },
  ],
];

export default function MarkdownCell({ cell, onUpdate, onDelete, collapsed }: Props) {
  const [content, setContent] = useState(cell.content);
  // Auto-enter edit mode for newly created (empty) blocks
  const [editing, setEditing] = useState(!cell.content.trim());
  const [showDelete, setShowDelete] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useAutoSave(content, (v) => onUpdate(cell.id, v));

  // Keep textarea height in sync with content
  useEffect(() => {
    if (!editing || !textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, 120)}px`;
  }, [content, editing]);

  const applyFormat = useCallback(
    (fn: (ta: HTMLTextAreaElement) => FormatResult) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const result = fn(ta);
      setContent(result.value);
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        if (result.newCursorPos !== undefined) {
          textareaRef.current.setSelectionRange(result.newCursorPos, result.newCursorPos);
        } else if (result.newStart !== undefined) {
          textareaRef.current.setSelectionRange(result.newStart, result.newEnd!);
        }
      });
    },
    [],
  );

  // Exit edit mode when focus leaves the container
  const handleContainerBlur = useCallback(
    (e: React.FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (containerRef.current?.contains(related)) return;
      if (content.trim()) setEditing(false);
    },
    [content],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape" && content.trim()) {
        setEditing(false);
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      const boldItem = TOOLBAR_GROUPS[1].find((i) => i.key === "bold")!;
      const italicItem = TOOLBAR_GROUPS[1].find((i) => i.key === "italic")!;
      const codeItem = TOOLBAR_GROUPS[1].find((i) => i.key === "code")!;
      const strikeItem = TOOLBAR_GROUPS[1].find((i) => i.key === "strike")!;
      const linkItem = TOOLBAR_GROUPS[3].find((i) => i.key === "link")!;

      if (e.key === "b") { e.preventDefault(); applyFormat(boldItem.fn); }
      else if (e.key === "i") { e.preventDefault(); applyFormat(italicItem.fn); }
      else if (e.key === "`") { e.preventDefault(); applyFormat(codeItem.fn); }
      else if (e.key === "s" && e.shiftKey) { e.preventDefault(); applyFormat(strikeItem.fn); }
      else if (e.key === "k") { e.preventDefault(); applyFormat(linkItem.fn); }
    },
    [content, applyFormat],
  );

  const isEmpty = !content.trim();

  /* ─── Collapsed summary ─── */
  if (collapsed) {
    return (
      <div
        className="cursor-pointer px-7 py-2.5 text-sm text-muted-foreground/60 hover:bg-accent/30 transition-colors md:px-10"
        onClick={() => setEditing(true)}
        title="Click to expand and edit"
      >
        <span className="truncate">{content.split("\n")[0].slice(0, 120) || "Empty text block"}</span>
      </div>
    );
  }

  /* ─── Edit mode ─── */
  if (editing) {
    return (
      <div
        ref={containerRef}
        className="relative"
        onBlur={handleContainerBlur}
      >
        {/* Formatting toolbar */}
        <div className="flex flex-wrap items-center gap-x-0.5 gap-y-0.5 border-b border-border/30 bg-muted/20 px-3 py-1.5">
          {TOOLBAR_GROUPS.map((group, gi) => (
            <div key={gi} className="flex items-center">
              {gi > 0 && <div className="mx-1 h-4 w-px bg-border/50" />}
              {group.map((item) => (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                      onMouseDown={(e) => {
                        // Keep textarea focused while clicking toolbar
                        e.preventDefault();
                        applyFormat(item.fn);
                      }}
                      tabIndex={-1}
                    >
                      {item.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="flex items-center gap-2 text-xs">
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <kbd className="rounded border border-border/80 bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {item.shortcut}
                      </kbd>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}

          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowDelete(true);
                  }}
                  tabIndex={-1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Delete block
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Markdown source textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          // biome-ignore lint/a11y/noAutofocus: focus is intentional when entering edit mode
          autoFocus
          placeholder="Write in Markdown…  # Heading   **bold**   _italic_   ```code```"
          className="w-full resize-none bg-transparent px-7 py-5 font-mono text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/30 md:px-10"
          style={{ minHeight: "120px" }}
        />

        {/* Footer: esc hint */}
        <div className="flex items-center justify-end border-t border-border/20 px-4 py-1.5">
          <span className="text-[10.5px] text-muted-foreground/30">
            <kbd className="font-mono">Esc</kbd> to preview
          </span>
        </div>

        <DeleteCellDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          onConfirm={() => onDelete(cell.id)}
          cellType="markdown"
        />
      </div>
    );
  }

  /* ─── View / rendered mode ─── */
  return (
    <div
      className={cn(
        "group relative cursor-text px-7 py-5 transition-colors hover:bg-primary/[0.025] md:px-10",
        "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-primary/0 before:transition-all hover:before:bg-primary/25",
        isEmpty && "flex min-h-[72px] items-center",
      )}
      onClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
      aria-label="Click to edit"
    >
      {/* Hover action bar */}
      <div className="absolute right-3 top-2.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded text-muted-foreground/40 hover:bg-accent hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              tabIndex={-1}
              aria-label="Edit block"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Edit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
              tabIndex={-1}
              aria-label="Delete block"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Delete</TooltipContent>
        </Tooltip>
      </div>

      {isEmpty ? (
        <p className="select-none text-sm italic text-muted-foreground/30">
          Click to start writing…
        </p>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-em:text-foreground/90 prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.84em] prose-code:font-mono prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-muted/60 prose-pre:px-5 prose-pre:py-4 prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-hr:border-border/50 prose-li:text-foreground/90 prose-ul:marker:text-muted-foreground prose-ol:marker:text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}

      <DeleteCellDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => onDelete(cell.id)}
        cellType="markdown"
      />
    </div>
  );
}

