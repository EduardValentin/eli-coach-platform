import * as React from "react";
import { createEmptyHistoryState, registerHistory } from "@lexical/history";
import {
  $isListNode,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
  registerList,
} from "@lexical/list";
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
  registerRichText,
} from "@lexical/rich-text";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  createEditor,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ESCAPE_COMMAND,
  TextNode,
  type EditorThemeClasses,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
} from "lexical";
import { Bold, Heading, Italic, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import { cn } from "./utils";

export type RichTextFormat = {
  read: (text: string) => void;
  write: () => string;
};

export type RichTextTheme = {
  root: string;
  heading: string;
  list: string;
  bold: string;
  italic: string;
};

export type RichTextTool = "heading" | "bold" | "italic" | "list";

export type RichTextEditorHandle = { focus: () => void };

type RichTextEditorProps = {
  label: string;
  labelledBy?: string;
  value: string;
  format: RichTextFormat;
  theme: RichTextTheme;
  tools: readonly RichTextTool[];
  lines?: "one" | "many";
  frame?: "field" | "outline";
  controls?: "shown" | "hidden";
  actions?: React.ReactNode;
  leadSeparator?: string;
  placeholder?: string;
  describedBy?: string;
  className?: string;
  onChange: (text: string) => void;
  onEscape?: () => void;
};

type ToolbarState = {
  bold: boolean;
  italic: boolean;
  list: boolean;
  heading: boolean;
  headingAvailable: boolean;
};

const TEXT_FORMATS: readonly TextFormatType[] = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "code",
  "subscript",
  "superscript",
  "highlight",
  "lowercase",
  "uppercase",
  "capitalize",
];
const EXCLUSIVE_FORMAT: Partial<Record<TextFormatType, TextFormatType>> = {
  bold: "italic",
  italic: "bold",
};
const NO_FORMATS: ToolbarState = {
  bold: false,
  italic: false,
  list: false,
  heading: false,
  headingAvailable: true,
};

function lexicalTheme(theme: RichTextTheme): EditorThemeClasses {
  return {
    heading: { h3: theme.heading },
    list: { ul: theme.list },
    text: { bold: theme.bold, italic: theme.italic },
  };
}

function allowedFormats(tools: readonly RichTextTool[]): TextFormatType[] {
  return TEXT_FORMATS.filter((format) => (tools as readonly string[]).includes(format));
}

function registerAll(...cleanups: (() => void)[]): () => void {
  return () => cleanups.forEach((cleanup) => cleanup());
}

function $topLevelOf(node: LexicalNode): LexicalNode {
  let current = node;
  let parent = current.getParent();
  while (parent && !$isRootNode(parent)) {
    current = parent;
    parent = current.getParent();
  }
  return current;
}

function $readToolbar(): ToolbarState {
  const first = $getRoot().getFirstChild();
  const selection = $getSelection();
  const heading = $isHeadingNode(first);
  const headingAvailable = heading || (first !== null && $isElementNode(first) && !$isListNode(first));
  if (!$isRangeSelection(selection)) return { ...NO_FORMATS, heading, headingAvailable };
  return {
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    list: $isListNode($topLevelOf(selection.anchor.getNode())),
    heading,
    headingAvailable,
  };
}

function $isEmpty(): boolean {
  const root = $getRoot();
  return root.getTextContentSize() === 0 && root.getChildrenSize() <= 1 && !$isListNode(root.getFirstChild());
}

function $toggleHeadingLine() {
  const first = $getRoot().getFirstChild();
  if (!first || !$isElementNode(first) || $isListNode(first)) return;
  const replacement = $isHeadingNode(first) ? $createParagraphNode() : $createHeadingNode("h3");
  replacement.append(...first.getChildren());
  first.replace(replacement);
}

function $paragraphFrom(element: ElementNode, emphasis: TextFormatType | null): ElementNode {
  const paragraph = $createParagraphNode();
  paragraph.append(...element.getChildren());
  if (emphasis) paragraph.getChildren().filter($isTextNode).forEach((text) => text.hasFormat(emphasis) || text.toggleFormat(emphasis));
  return paragraph;
}

function registerAllowedContent(editor: LexicalEditor, tools: readonly RichTextTool[]): () => void {
  const formats = allowedFormats(tools);
  const headingEmphasis = formats.includes("bold") ? "bold" : null;
  return registerAll(
    editor.registerNodeTransform(TextNode, (text) => {
      TEXT_FORMATS.filter((format) => !formats.includes(format) && text.hasFormat(format)).forEach((format) => text.toggleFormat(format));
    }),
    editor.registerNodeTransform(HeadingNode, (heading) => {
      const firstLine = $isRootNode(heading.getParent()) && heading.getIndexWithinParent() === 0;
      if (tools.includes("heading") && firstLine) return;
      heading.replace($paragraphFrom(heading, headingEmphasis));
    }),
    editor.registerNodeTransform(ListNode, (list) => {
      if (tools.includes("list")) return;
      list
        .getChildren()
        .filter($isElementNode)
        .forEach((item) => list.insertBefore($paragraphFrom(item, null)));
      list.remove();
    }),
  );
}

const HIDDEN_STYLE = "display: none";

function escapedPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function registerLeadSeparator(editor: LexicalEditor, separator: string): () => void {
  const pattern = new RegExp(`^\\s*${escapedPattern(separator)}\\s*`);
  return editor.registerNodeTransform(TextNode, (text) => {
    const lead = text.getPreviousSibling();
    const followsLead = text.getIndexWithinParent() === 1 && $isTextNode(lead) && lead.hasFormat("bold") && !text.hasFormat("bold");
    const match = followsLead ? pattern.exec(text.getTextContent()) : null;
    const hidden = text.getStyle() === HIDDEN_STYLE;
    if (!match) {
      if (hidden) text.setStyle("");
      return;
    }
    if (match[0].length < text.getTextContentSize()) {
      const [separatorText, rest] = text.splitText(match[0].length);
      separatorText.setStyle(HIDDEN_STYLE);
      rest.setStyle("");
      return;
    }
    if (!hidden) text.setStyle(HIDDEN_STYLE);
  });
}

function formatWithin(formats: readonly TextFormatType[]) {
  return (format: TextFormatType): boolean => {
    if (!formats.includes(format)) return true;
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return false;
    selection.formatText(format);
    const other = EXCLUSIVE_FORMAT[format];
    if (other && selection.hasFormat(format) && selection.hasFormat(other)) selection.formatText(other);
    return true;
  };
}

function isListShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "Digit8";
}

function isHeadingShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.altKey && event.code === "Digit1";
}

function toggleList(editor: LexicalEditor) {
  const inList = editor.getEditorState().read($readToolbar).list;
  editor.dispatchCommand(inList ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined);
}

function registerShortcuts(editor: LexicalEditor, tools: readonly RichTextTool[]): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      if (tools.includes("list") && isListShortcut(event)) {
        event.preventDefault();
        toggleList(editor);
        return true;
      }
      if (tools.includes("heading") && isHeadingShortcut(event)) {
        event.preventDefault();
        editor.update($toggleHeadingLine);
        return true;
      }
      return false;
    },
    COMMAND_PRIORITY_HIGH,
  );
}

function useRichTextEditor(props: RichTextEditorProps) {
  const { value, theme, tools, leadSeparator } = props;
  const latest = React.useRef(props);
  latest.current = props;
  const written = React.useRef<string | null>(null);
  const [editor] = React.useState<LexicalEditor>(() =>
    createEditor({
      namespace: "rich-text",
      nodes: [HeadingNode, ListNode, ListItemNode],
      theme: lexicalTheme(theme),
      onError: (error) => {
        throw error;
      },
    }),
  );
  const [toolbar, setToolbar] = React.useState<ToolbarState>(NO_FORMATS);
  const [empty, setEmpty] = React.useState(true);
  const toolsKey = tools.join(" ");

  React.useLayoutEffect(() => {
    const enabled = toolsKey.split(" ").filter(Boolean) as RichTextTool[];
    return registerAll(
      registerRichText(editor),
      registerList(editor),
      registerHistory(editor, createEmptyHistoryState(), 300),
      registerAllowedContent(editor, enabled),
      registerShortcuts(editor, enabled),
      leadSeparator ? registerLeadSeparator(editor, leadSeparator) : () => {},
      editor.registerCommand(FORMAT_TEXT_COMMAND, formatWithin(allowedFormats(enabled)), COMMAND_PRIORITY_HIGH),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          const { onEscape } = latest.current;
          if (!onEscape) return false;
          event.preventDefault();
          event.stopPropagation();
          onEscape();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
        editorState.read(() => {
          setToolbar($readToolbar());
          setEmpty($isEmpty());
        });
        if (written.current === null || (dirtyElements.size === 0 && dirtyLeaves.size === 0)) return;
        const text = editorState.read(latest.current.format.write);
        if (text === written.current) return;
        written.current = text;
        latest.current.onChange(text);
      }),
    );
  }, [editor, toolsKey, leadSeparator]);

  React.useLayoutEffect(() => {
    if (value === written.current) return;
    const opening = written.current === null;
    editor.update(() => latest.current.format.read(value), { discrete: true });
    written.current = opening ? editor.getEditorState().read(latest.current.format.write) : value;
    if (written.current !== value) latest.current.onChange(written.current);
  }, [editor, value]);

  return { editor, toolbar, empty };
}

type ToolSpec = { label: string; shortcut: string; icon: React.ReactNode };

const TOOL_SPECS: Record<RichTextTool, ToolSpec> = {
  heading: { label: "Heading", shortcut: "Control+Alt+1 Meta+Alt+1", icon: <Heading /> },
  bold: { label: "Bold", shortcut: "Control+B Meta+B", icon: <Bold /> },
  italic: { label: "Italic", shortcut: "Control+I Meta+I", icon: <Italic /> },
  list: { label: "Bulleted list", shortcut: "Control+Shift+8 Meta+Shift+8", icon: <List /> },
};

const FRAME_CLASS = {
  field: "box-content min-w-0 rounded-field border border-control-border-soft bg-surface-base px-3 py-2",
  outline:
    "min-w-0 rounded-field outline-1 outline-offset-8 outline-control-border-soft [--focus-ring-halo:0_0_#0000] [--focus-ring-offset:8px]",
} as const;
const LINES_CLASS = { one: "min-h-8", many: "min-h-12" } as const;
const CONTROLS_ROW_CLASS =
  "sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-end gap-x-8 gap-y-2 rounded-field border border-border bg-surface-base px-1 py-1";
function runTool(editor: LexicalEditor, tool: RichTextTool) {
  if (tool === "heading") editor.update($toggleHeadingLine);
  if (tool === "bold" || tool === "italic") editor.dispatchCommand(FORMAT_TEXT_COMMAND, tool);
  if (tool === "list") toggleList(editor);
  editor.focus();
}

type ToolbarProps = { editor: LexicalEditor; label: string; tools: readonly RichTextTool[]; state: ToolbarState };

function Toolbar({ editor, label, tools, state }: ToolbarProps) {
  const pressed = tools.filter((tool) => state[tool]);

  function runToggledTool(next: string[]) {
    const toggled = tools.find((tool) => next.includes(tool) !== state[tool]);
    if (toggled) runTool(editor, toggled);
  }

  return (
    <ToggleGroup
      type="multiple"
      role="toolbar"
      orientation="horizontal"
      aria-label={`Formatting for ${label}`}
      size="sm"
      spacing="separate"
      value={pressed}
      onValueChange={runToggledTool}
      className="min-w-0"
    >
      {tools.map((tool) => (
        <ToggleGroupItem
          key={tool}
          value={tool}
          aria-label={TOOL_SPECS[tool].label}
          aria-keyshortcuts={TOOL_SPECS[tool].shortcut}
          title={TOOL_SPECS[tool].label}
          disabled={tool === "heading" && !state.headingAvailable}
          onMouseDown={(event) => event.preventDefault()}
        >
          {TOOL_SPECS[tool].icon}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

const CARET_CLEARANCE = 8;

function scrollParentOf(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return null;
}

function keyboardInset(): number {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

function keepCaretAbove(content: HTMLElement, row: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !content.contains(selection.anchorNode)) return;
  const caret = selection.getRangeAt(0).getBoundingClientRect();
  const limit = row.getBoundingClientRect().top - CARET_CLEARANCE;
  if (caret.height === 0 || caret.bottom <= limit) return;
  scrollParentOf(content)?.scrollBy({ top: caret.bottom - limit });
}

function useControlsClearance(content: React.RefObject<HTMLElement | null>, row: React.RefObject<HTMLElement | null>, shown: boolean) {
  React.useLayoutEffect(() => {
    const entry = content.current;
    const controls = row.current;
    if (!shown || !entry || !controls) return;
    const clear = () => {
      entry.style.scrollMarginBottom = `${controls.offsetHeight + CARET_CLEARANCE}px`;
    };
    const liftAboveKeyboard = () => {
      controls.style.bottom = `${keyboardInset()}px`;
    };
    const revealCaret = () => keepCaretAbove(entry, controls);
    clear();
    liftAboveKeyboard();
    const observer = new ResizeObserver(clear);
    observer.observe(controls);
    window.visualViewport?.addEventListener("resize", liftAboveKeyboard);
    window.visualViewport?.addEventListener("scroll", liftAboveKeyboard);
    document.addEventListener("selectionchange", revealCaret);
    entry.addEventListener("input", revealCaret);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", liftAboveKeyboard);
      window.visualViewport?.removeEventListener("scroll", liftAboveKeyboard);
      document.removeEventListener("selectionchange", revealCaret);
      entry.removeEventListener("input", revealCaret);
      entry.style.scrollMarginBottom = "";
    };
  }, [content, row, shown]);
}

const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>((props, ref) => {
  const { label, labelledBy, placeholder, describedBy, theme, tools, lines = "many", frame = "field", controls = "shown", actions, className, onEscape } = props;
  const { editor, toolbar, empty } = useRichTextEditor(props);
  const content = React.useRef<HTMLDivElement>(null);
  const shown = controls === "shown" && (tools.length > 0 || Boolean(actions));
  const row = React.useRef<HTMLDivElement>(null);
  useControlsClearance(content, row, shown);

  React.useLayoutEffect(() => {
    editor.setRootElement(content.current);
    return () => editor.setRootElement(null);
  }, [editor]);

  React.useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor.focus(undefined, { defaultSelection: "rootEnd" });
        content.current?.focus({ preventScroll: true });
      },
    }),
    [editor],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Escape" || !onEscape) return;
    event.preventDefault();
    event.stopPropagation();
    onEscape();
  }

  const entryClass = cn("block [grid-area:1/1]", FRAME_CLASS[frame], { [LINES_CLASS[lines]]: frame === "field" });

  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)]", className)} onKeyDown={onKeyDown}>
      <div
        ref={content}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-placeholder={placeholder}
        className={cn(entryClass, theme.root)}
      />
      {empty && placeholder && (
        <p aria-hidden="true" className={cn(entryClass, theme.root, "pointer-events-none border-transparent bg-transparent text-placeholder-soft outline-transparent")}>
          {placeholder}
        </p>
      )}
      {shown && (
        <div ref={row} className={CONTROLS_ROW_CLASS}>
          {tools.length > 0 && <Toolbar editor={editor} label={label} tools={tools} state={toolbar} />}
          {actions && <div className="flex min-w-0 flex-wrap items-center justify-end gap-4">{actions}</div>}
        </div>
      )}
    </div>
  );
});
RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };
