import { useId } from 'react';
import { guideText, isGuideTextKey, templateText, type TemplateKey } from '../../domain/programTemplates';
import { WIDGET_SUBHEADING_CLASS } from '../typography';
import { cn } from '../ui/utils';
import type { ProgramView } from './programView';

export function programTemplate(view: ProgramView, key: TemplateKey): string {
  const { language } = view.program;
  return isGuideTextKey(key) ? guideText(view.version.content.guideTexts, key, language) : templateText(key, language).text;
}

const HEADING_LINE = /^\*\*([^*]+)\*\*$/;
const LEAD_LINE = /^\*\*([^*]+)\*\*\s+(.+)$/;
const LIST_ITEM = /^—\s+/;
const ORDERED_ITEM = /^\d+\.\s+/;
const EMPHASIS = /(\*\*[^*]+\*\*|\*[^*]+\*)/;

export type TemplateParagraph = { lead?: string; body: string };
export type ParsedTemplate = { title: string; paragraphs: TemplateParagraph[] };

function paragraphOf(line: string): TemplateParagraph {
  const lead = LEAD_LINE.exec(line);
  return lead ? { lead: lead[1], body: lead[2] } : { body: line };
}

export function parseTemplate(text: string): ParsedTemplate {
  const lines = nonEmptyLines(text).map(line => line.trim());
  const heading = HEADING_LINE.exec(lines[0] ?? '');
  const body = heading ? lines.slice(1) : lines;
  return { title: heading?.[1] ?? '', paragraphs: body.map(paragraphOf) };
}

export function Emphasised({ text }: { text: string }) {
  return text.split(EMPHASIS).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function nonEmptyLines(text: string): string[] {
  return text.split('\n').filter(line => line.trim() !== '');
}

type ListKind = 'list' | 'ordered';
type TextRun = { kind: 'paragraph'; paragraph: TemplateParagraph } | { kind: ListKind; items: string[] };

const ITEM_MARKERS: Record<ListKind, RegExp> = { list: LIST_ITEM, ordered: ORDERED_ITEM };

function listKindOf(paragraph: TemplateParagraph): ListKind | null {
  if (paragraph.lead !== undefined) return null;
  if (LIST_ITEM.test(paragraph.body)) return 'list';
  return ORDERED_ITEM.test(paragraph.body) ? 'ordered' : null;
}

function runsOf(paragraphs: readonly TemplateParagraph[]): TextRun[] {
  const runs: TextRun[] = [];
  for (const paragraph of paragraphs) {
    const previous = runs.at(-1);
    const kind = listKindOf(paragraph);
    if (kind === null) runs.push({ kind: 'paragraph', paragraph });
    else if (previous?.kind === kind) previous.items.push(paragraph.body.replace(ITEM_MARKERS[kind], ''));
    else runs.push({ kind, items: [paragraph.body.replace(ITEM_MARKERS[kind], '')] });
  }
  return runs;
}

export const TEMPLATE_TEXT_CLASSES = {
  body: 'max-w-prose space-y-3 text-sm leading-relaxed text-text-primary',
  list: 'list-disc space-y-1.5 pl-5 marker:text-text-label',
  ordered: 'list-decimal space-y-1.5 pl-5 marker:font-semibold marker:tabular-nums',
  lead: 'font-semibold text-text-primary',
};

function Paragraph({ paragraph }: { paragraph: TemplateParagraph }) {
  return (
    <p>
      {paragraph.lead && <span className={TEMPLATE_TEXT_CLASSES.lead}>{paragraph.lead}</span>}
      {paragraph.lead && ' '}
      <Emphasised text={paragraph.body} />
    </p>
  );
}

type TemplateBodyProps = { paragraphs: readonly TemplateParagraph[]; className?: string };

export function TemplateBody({ paragraphs, className }: TemplateBodyProps) {
  return (
    <div className={cn(TEMPLATE_TEXT_CLASSES.body, className)}>
      {runsOf(paragraphs).map((run, index) => {
        if (run.kind === 'paragraph') return <Paragraph key={index} paragraph={run.paragraph} />;
        const List = run.kind === 'ordered' ? 'ol' : 'ul';
        return (
          <List key={index} className={TEMPLATE_TEXT_CLASSES[run.kind]}>
            {run.items.map(item => (
              <li key={item}>
                <Emphasised text={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

export function ProgramText({ text }: { text: string }) {
  const headingId = useId();
  const { title, paragraphs } = parseTemplate(text);
  return (
    <article aria-labelledby={title ? headingId : undefined} className="grid gap-2">
      {title && (
        <h3 id={headingId} className={WIDGET_SUBHEADING_CLASS}>
          {title}
        </h3>
      )}
      <TemplateBody paragraphs={paragraphs} />
    </article>
  );
}
