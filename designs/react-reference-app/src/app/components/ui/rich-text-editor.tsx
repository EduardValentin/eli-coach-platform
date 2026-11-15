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
import { Toggle } from "./toggle";
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
  controls?: "shown" | "hidden";
  actions?: React.ReactNode;
  notes?: React.ReactNode;
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
  const { value, theme, tools } = props;
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
  }, [editor, toolsKey]);

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

const ENTRY_FRAME_CLASS = "min-w-0 rounded-field border border-control-border-soft bg-surface-base outline-none";
const ENTRY_BOX_CLASS = "box-content block px-3 py-2 [grid-area:1/1]";
const LINES_CLASS = { one: "min-h-8", many: "min-h-12" } as const;
const CONTROLS_BAR_CLASS =
  "fixed bottom-4 z-30 grid gap-2 rounded-field border border-border bg-surface-base p-2 shadow-card";
const ROVING_KEYS = new Set(["ArrowRight", "ArrowLeft", "Home", "End"]);

function runTool(editor: LexicalEditor, tool: RichTextTool) {
  if (tool === "heading") editor.update($toggleHeadingLine);
  if (tool === "bold" || tool === "italic") editor.dispatchCommand(FORMAT_TEXT_COMMAND, tool);
  if (tool === "list") toggleList(editor);
  editor.focus();
}

function rovingTarget(key: string, index: number, count: number): number {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return (index + (key === "ArrowRight" ? 1 : -1) + count) % count;
}

type ToolbarProps = { editor: LexicalEditor; label: string; tools: readonly RichTextTool[]; state: ToolbarState };

function Toolbar({ editor, label, tools, state }: ToolbarProps) {
  const enabled = tools.filter((tool) => tool !== "heading" || state.headingAvailable);
  const [current, setCurrent] = React.useState<RichTextTool | undefined>(enabled[0]);
  const stop = current && enabled.includes(current) ? current : enabled[0];

  function onKeyDown(event: React.KeyboardEvent) {
    if (!ROVING_KEYS.has(event.key) || !stop) return;
    event.preventDefault();
    const next = enabled[rovingTarget(event.key, enabled.indexOf(stop), enabled.length)];
    setCurrent(next);
    event.currentTarget.querySelector<HTMLElement>(`[data-tool="${next}"]`)?.focus();
  }

  return (
    <div role="toolbar" aria-label={`Formatting for ${label}`} onKeyDown={onKeyDown} className="flex flex-wrap gap-4">
      {tools.map((tool) => (
        <Toggle
          key={tool}
          data-tool={tool}
          size="sm"
          aria-label={TOOL_SPECS[tool].label}
          aria-keyshortcuts={TOOL_SPECS[tool].shortcut}
          title={TOOL_SPECS[tool].label}
          tabIndex={tool === stop ? undefined : -1}
          pressed={state[tool]}
          disabled={!enabled.includes(tool)}
          onFocus={() => setCurrent(tool)}
          onMouseDown={(event) => event.preventDefault()}
          onPressedChange={() => runTool(editor, tool)}
        >
          {TOOL_SPECS[tool].icon}
        </Toggle>
      ))}
    </div>
  );
}

const BAR_CLEARANCE = 8;

function keepAbove(frame: HTMLElement, bar: HTMLElement) {
  const barTop = bar.getBoundingClientRect().top;
  const { top, bottom, height } = frame.getBoundingClientRect();
  if (bottom <= barTop - BAR_CLEARANCE) return;
  const clearance = window.innerHeight - barTop + BAR_CLEARANCE;
  frame.style.scrollMarginBottom = `${clearance}px`;
  frame.scrollIntoView({ block: height < barTop - BAR_CLEARANCE && top >= 0 ? "end" : "start" });
}

type ColumnBox = { left: number; width: number };

function useColumnOf(element: React.RefObject<HTMLElement | null>, active: boolean): ColumnBox | undefined {
  const [box, setBox] = React.useState<ColumnBox>();

  React.useLayoutEffect(() => {
    const target = element.current?.closest<HTMLElement>("[data-editor-column]") ?? element.current;
    if (!active || !target) return;
    const measure = () => {
      const { left, width } = target.getBoundingClientRect();
      setBox({ left, width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [element, active]);

  return active ? box : undefined;
}

const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>((props, ref) => {
  const { label, labelledBy, placeholder, describedBy, theme, tools, lines = "many", controls = "shown", actions, notes, className, onEscape } = props;
  const { editor, toolbar, empty } = useRichTextEditor(props);
  const content = React.useRef<HTMLDivElement>(null);
  const shown = controls === "shown" && (tools.length > 0 || Boolean(actions));
  const column = useColumnOf(content, shown);
  const bar = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (column && content.current && bar.current) keepAbove(content.current, bar.current);
  }, [column]);

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

  return (
    <div className={cn("grid", className)} onKeyDown={onKeyDown}>
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
        className={cn(ENTRY_FRAME_CLASS, ENTRY_BOX_CLASS, LINES_CLASS[lines], theme.root)}
      />
      {empty && placeholder && (
        <p aria-hidden="true" className={cn("pointer-events-none border border-transparent", ENTRY_BOX_CLASS, theme.root, "text-muted-foreground")}>
          {placeholder}
        </p>
      )}
      {shown && (
        <div ref={bar} style={column} className={CONTROLS_BAR_CLASS}>
          {notes && <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{notes}</div>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {tools.length > 0 && <Toolbar editor={editor} label={label} tools={tools} state={toolbar} />}
            {actions && <div className="ml-auto flex flex-wrap items-center gap-4">{actions}</div>}
          </div>
        </div>
      )}
    </div>
  );
});
RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };
