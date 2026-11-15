import { $createListItemNode, $createListNode, $isListNode, ListItemNode, ListNode } from '@lexical/list';
import { $convertFromMarkdownString, BOLD_STAR, ITALIC_STAR, type ElementTransformer } from '@lexical/markdown';
import { $createHeadingNode, $isHeadingNode, HeadingNode } from '@lexical/rich-text';
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode, $isLineBreakNode, $isTextNode, type ElementNode, type TextNode } from 'lexical';
import type { RichTextFormat } from '../ui/rich-text-editor';

const TITLE_LINE = /^\*\*([^*]+)\*\*$/;
const LIST_LINE = /^—\s+/;
const LIST_MARKER = '— ';
const BOLD_MARKER = '**';
const ITALIC_MARKER = '*';
const EDGE_SPACES = /^(\s*)([\s\S]*?)(\s*)$/;

const TITLE: ElementTransformer = {
  dependencies: [HeadingNode],
  export: () => null,
  regExp: TITLE_LINE,
  replace: (paragraph, children, match) => {
    const [text] = children;
    if ($isTextNode(text)) text.setTextContent(match[1]);
    const heading = $createHeadingNode('h3');
    heading.append(...children);
    paragraph.replace(heading);
  },
  type: 'element',
};

const LIST_ITEM: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: () => null,
  regExp: LIST_LINE,
  replace: (paragraph, children) => {
    const item = $createListItemNode();
    item.append(...children);
    const previous = paragraph.getPreviousSibling();
    if ($isListNode(previous)) {
      previous.append(item);
      paragraph.remove();
      return;
    }
    const list = $createListNode('bullet');
    list.append(item);
    paragraph.replace(list);
  },
  type: 'element',
};

const TRANSFORMERS = [TITLE, LIST_ITEM, BOLD_STAR, ITALIC_STAR];

function $titleOnlyOnFirstLine() {
  $getRoot()
    .getChildren()
    .slice(1)
    .filter($isHeadingNode)
    .forEach(heading => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(heading.getTextContent()).toggleFormat('bold'));
      heading.replace(paragraph);
    });
}

function markerOf(text: TextNode): string {
  if (text.hasFormat('bold')) return BOLD_MARKER;
  return text.hasFormat('italic') ? ITALIC_MARKER : '';
}

function marked(text: TextNode): string {
  const content = text.getTextContent();
  const marker = markerOf(text);
  if (!marker || content.trim() === '') return content;
  const [, before, core, after] = EDGE_SPACES.exec(content) ?? ['', '', content, ''];
  return `${before}${marker}${core}${marker}${after}`;
}

function inlineMarkup(element: ElementNode): string {
  return element
    .getChildren()
    .map(child => {
      if ($isLineBreakNode(child)) return '\n';
      return $isTextNode(child) ? marked(child) : child.getTextContent();
    })
    .join('');
}

function blockMarkup(block: ReturnType<ElementNode['getChildren']>[number]): string {
  if ($isHeadingNode(block)) return block.getTextContent().trim() === '' ? '' : `${BOLD_MARKER}${block.getTextContent()}${BOLD_MARKER}`;
  if ($isListNode(block)) {
    return block
      .getChildren()
      .filter($isElementNode)
      .map(item => `${LIST_MARKER}${inlineMarkup(item)}`)
      .join('\n');
  }
  return $isElementNode(block) ? inlineMarkup(block) : block.getTextContent();
}

export const PROGRAM_TEXT_FORMAT: RichTextFormat = {
  read: text => {
    $convertFromMarkdownString(text, TRANSFORMERS, undefined, true);
    $titleOnlyOnFirstLine();
  },
  write: () => $getRoot().getChildren().map(blockMarkup).join('\n'),
};
