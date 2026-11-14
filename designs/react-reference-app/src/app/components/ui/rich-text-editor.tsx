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
import { fieldSurfaceClass } from "./input";
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
  value: string;
  format: RichTextFormat;
  theme: RichTextTheme;
  tools: readonly RichTextTool[];
  placeholder?: string;
  describedBy?: string;
  className?: string;
  onChange: (text: string) => void;
  onFocus?: () => void;
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

type ToolButtonProps = {
  label: string;
  shortcut: string;
  pressed: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
};

function ToolButton({ label, shortcut, pressed, disabled, onPress, children }: ToolButtonProps) {
  return (
    <Toggle
      size="sm"
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={label}
      pressed={pressed}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onPressedChange={onPress}
    >
      {children}
    </Toggle>
  );
}

type ToolbarProps = { editor: LexicalEditor; label: string; tools: readonly RichTextTool[]; state: ToolbarState };

function Toolbar({ editor, label, tools, state }: ToolbarProps) {
  function run(action: () => void) {
    action();
    editor.focus();
  }

  return (
    <div
      role="group"
      aria-label={`Formatting for ${label}`}
      className="invisible absolute bottom-full left-0 z-10 mb-1 flex gap-0.5 rounded-field border border-border bg-surface-base p-0.5 shadow-card group-focus-within/editor:visible"
    >
      {tools.includes("heading") && (
        <ToolButton
          label="Heading"
          shortcut="Control+Alt+1 Meta+Alt+1"
          pressed={state.heading}
          disabled={!state.headingAvailable}
          onPress={() => run(() => editor.update($toggleHeadingLine))}
        >
          <Heading />
        </ToolButton>
      )}
      {tools.includes("bold") && (
        <ToolButton
          label="Bold"
          shortcut="Control+B Meta+B"
          pressed={state.bold}
          onPress={() => run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"))}
        >
          <Bold />
        </ToolButton>
      )}
      {tools.includes("italic") && (
        <ToolButton
          label="Italic"
          shortcut="Control+I Meta+I"
          pressed={state.italic}
          onPress={() => run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"))}
        >
          <Italic />
        </ToolButton>
      )}
      {tools.includes("list") && (
        <ToolButton
          label="Bulleted list"
          shortcut="Control+Shift+8 Meta+Shift+8"
          pressed={state.list}
          onPress={() => run(() => toggleList(editor))}
        >
          <List />
        </ToolButton>
      )}
    </div>
  );
}

const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>((props, ref) => {
  const { label, placeholder, describedBy, theme, tools, className, onFocus } = props;
  const { editor, toolbar, empty } = useRichTextEditor(props);
  const content = React.useRef<HTMLDivElement>(null);

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

  return (
    <div className={cn("group/editor relative", className)}>
      <div data-field-frame="" className={cn(fieldSurfaceClass, "relative block px-3 py-2")}>
        <div
          ref={content}
          contentEditable
          suppressContentEditableWarning
          tabIndex={0}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-describedby={describedBy}
          aria-placeholder={placeholder}
          data-field-entry=""
          onFocus={onFocus}
          className={cn("min-h-12 outline-none", theme.root)}
        />
        {empty && placeholder && (
          <p aria-hidden="true" className={cn("pointer-events-none absolute inset-x-3 top-2", theme.root, "text-muted-foreground")}>
            {placeholder}
          </p>
        )}
      </div>
      {tools.length > 0 && <Toolbar editor={editor} label={label} tools={tools} state={toolbar} />}
    </div>
  );
});
RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };
