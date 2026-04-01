"use client";
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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

// ---------------------------------------------------------------------------
// Slash-command autocomplete
// ---------------------------------------------------------------------------

function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
): { top: number; left: number } {
  const rect = textarea.getBoundingClientRect();
  const computed = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(computed.lineHeight) || 22;
  const paddingTop = parseFloat(computed.paddingTop) || 0;
  const paddingLeft = parseFloat(computed.paddingLeft) || 0;
  const textBefore = textarea.value.substring(0, textarea.selectionStart);
  const lines = textBefore.split("\n");
  const currentLine = lines.length - 1;
  const rawTop =
    rect.top + paddingTop + currentLine * lineHeight - textarea.scrollTop + lineHeight + 4;
  // Clamp so the dropdown doesn't go off-screen at the bottom
  const dropdownHeight = 300;
  const top =
    rawTop + dropdownHeight > window.innerHeight
      ? rect.top + paddingTop + currentLine * lineHeight - textarea.scrollTop - dropdownHeight
      : rawTop;
  return { top, left: rect.left + paddingLeft };
}

const SLASH_COMMANDS: Array<{
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  fn: (ta: HTMLTextAreaElement) => FormatResult;
}> = [
  {
    key: "h1",
    label: "Heading 1",
    description: "Large section heading",
    icon: <span className="font-mono text-[10px] font-bold">H1</span>,
    fn: (ta) => toggleLinePrefix(ta, "# "),
  },
  {
    key: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <span className="font-mono text-[10px] font-bold">H2</span>,
    fn: (ta) => toggleLinePrefix(ta, "## "),
  },
  {
    key: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <span className="font-mono text-[10px] font-bold">H3</span>,
    fn: (ta) => toggleLinePrefix(ta, "### "),
  },
  {
    key: "bold",
    label: "Bold",
    description: "Make text bold",
    icon: <Bold className="h-3 w-3" />,
    fn: (ta) => wrapText(ta, "**", "**", "bold text"),
  },
  {
    key: "italic",
    label: "Italic",
    description: "Make text italic",
    icon: <Italic className="h-3 w-3" />,
    fn: (ta) => wrapText(ta, "_", "_", "italic text"),
  },
  {
    key: "strike",
    label: "Strikethrough",
    description: "Strike through text",
    icon: <Strikethrough className="h-3 w-3" />,
    fn: (ta) => wrapText(ta, "~~", "~~", "text"),
  },
  {
    key: "code",
    label: "Inline Code",
    description: "Single-line code snippet",
    icon: <Code className="h-3 w-3" />,
    fn: (ta) => wrapText(ta, "`", "`", "code"),
  },
  {
    key: "codeblock",
    label: "Code Block",
    description: "Multi-line code block",
    icon: <Code2 className="h-3 w-3" />,
    fn: (ta) => {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = ta.value.slice(start, end) || "// code here";
      const before = "```\n";
      const after = "\n```";
      const value =
        ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
      return {
        value,
        newStart: start + before.length,
        newEnd: start + before.length + selected.length,
      };
    },
  },
  {
    key: "quote",
    label: "Blockquote",
    description: "Quote a section of text",
    icon: <Quote className="h-3 w-3" />,
    fn: (ta) => toggleLinePrefix(ta, "> "),
  },
  {
    key: "ul",
    label: "Bullet List",
    description: "Unordered list",
    icon: <List className="h-3 w-3" />,
    fn: (ta) => toggleLinePrefix(ta, "- "),
  },
  {
    key: "ol",
    label: "Numbered List",
    description: "Ordered list",
    icon: <ListOrdered className="h-3 w-3" />,
    fn: (ta) => toggleLinePrefix(ta, "1. "),
  },
  {
    key: "link",
    label: "Link",
    description: "Insert a hyperlink",
    icon: <Link2 className="h-3 w-3" />,
    fn: (ta) => wrapText(ta, "[", "](url)", "link text"),
  },
];

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

export default React.memo(function MarkdownCell({ cell, onUpdate, onDelete, collapsed }: Props) {
  const [content, setContent] = useState(cell.content);
  // Auto-enter edit mode for newly created (empty) blocks
  const [editing, setEditing] = useState(!cell.content.trim());
  const [showDelete, setShowDelete] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Slash-command autocomplete state
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [caretPos, setCaretPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const filteredCommands = useMemo(() => {
    if (slashQuery === null) return [];
    if (slashQuery === "") return SLASH_COMMANDS;
    const q = slashQuery.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) => cmd.key.startsWith(q) || cmd.label.toLowerCase().includes(q),
    );
  }, [slashQuery]);

  useAutoSave(content, (v) => onUpdate(cell.id, v));

  // Keep textarea height in sync with content
  useEffect(() => {
    if (!editing || !textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, 120)}px`;
  }, [content, editing]);

  const applySuggestion = useCallback(
    (cmd: (typeof SLASH_COMMANDS)[0]) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const textBefore = ta.value.substring(0, cursorPos);
      // Find the slash that triggered the menu
      const slashStart = textBefore.search(/\/[a-z0-9]*$/i);
      if (slashStart === -1) { setSlashQuery(null); return; }
      // Remove /query from the textarea DOM value so cmd.fn sees a clean state
      const valueWithoutSlash =
        ta.value.substring(0, slashStart) + ta.value.substring(cursorPos);
      ta.value = valueWithoutSlash;
      ta.setSelectionRange(slashStart, slashStart);
      const result = cmd.fn(ta);
      setContent(result.value);
      setSlashQuery(null);
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

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      const cursorPos = e.target.selectionStart;
      setContent(newContent);
      // Detect /command trigger: slash at start of string or after newline/space
      const textBefore = newContent.substring(0, cursorPos);
      const match = textBefore.match(/(?:^|[\n ])(\/[a-z0-9]*)$/i);
      if (match) {
        const query = match[1].substring(1); // strip leading /
        setSlashQuery(query);
        setSuggestionIndex(0);
        if (textareaRef.current) {
          setCaretPos(getCaretCoordinates(textareaRef.current));
        }
      } else {
        setSlashQuery(null);
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Autocomplete navigation takes priority
      if (slashQuery !== null && filteredCommands.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSuggestionIndex((i) => (i + 1) % filteredCommands.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSuggestionIndex(
            (i) => (i - 1 + filteredCommands.length) % filteredCommands.length,
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          applySuggestion(filteredCommands[suggestionIndex]);
          return;
        }
      }
      if (e.key === "Escape") {
        if (slashQuery !== null) {
          e.preventDefault();
          setSlashQuery(null);
          return;
        }
        if (content.trim()) {
          setEditing(false);
          return;
        }
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
    [content, applyFormat, slashQuery, filteredCommands, suggestionIndex, applySuggestion],
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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          // biome-ignore lint/a11y/noAutofocus: focus is intentional when entering edit mode
          autoFocus
          placeholder="Write in Markdown…  # Heading   **bold**   _italic_   ```code```"
          className="w-full resize-none bg-transparent px-7 py-5 font-mono text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/30 md:px-10"
          style={{ minHeight: "120px" }}
        />

        {/* Footer: esc hint + slash-command hint */}
        <div className="flex items-center justify-between border-t border-border/20 px-4 py-1.5">
          <span className="text-[10.5px] text-muted-foreground/50">
            Type <kbd className="font-mono">/</kbd> for commands
          </span>
          <span className="text-[10.5px] text-muted-foreground/50">
            <kbd className="font-mono">Esc</kbd> to preview
          </span>
        </div>

        {/* Slash-command autocomplete dropdown */}
        {slashQuery !== null &&
          filteredCommands.length > 0 &&
          typeof window !== "undefined" &&
          createPortal(
            <div
              className="fixed z-50 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
              style={{ top: caretPos.top, left: caretPos.left }}
            >
              <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">
                Commands
              </p>
              <div className="max-h-60 overflow-y-auto p-1">
                {filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.key}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                      idx === suggestionIndex && "bg-accent",
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep textarea focused
                      applySuggestion(cmd);
                    }}
                    onMouseEnter={() => setSuggestionIndex(idx)}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                      {cmd.icon}
                    </span>
                    <div className="text-left">
                      <div className="font-medium leading-none">{cmd.label}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground/60">
                        {cmd.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>,
            document.body,
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
              className="h-6 w-6 rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground"
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
              className="h-6 w-6 rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
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
        <p className="select-none text-sm italic text-muted-foreground/50">
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
});

