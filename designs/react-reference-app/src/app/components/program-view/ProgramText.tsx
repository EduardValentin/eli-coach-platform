import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { BLOCK_TYPE_LABELS, type Block } from '../../domain/program';
import { guideText, isGuideTextKey, templateText, type TemplateKey } from '../../domain/programTemplates';
import { isWritten } from '../../domain/programTexts';
import { LABEL_CLASS, WIDGET_SUBHEADING_CLASS } from '../typography';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../ui/utils';
import type { ProgramView } from './programView';

export function programTemplate(view: ProgramView, key: TemplateKey): string {
  const { language } = view.program;
  return isGuideTextKey(key) ? guideText(view.version.content.guideTexts, key, language) : templateText(key, language).text;
}

const HEADING_LINE = /^\*\*([^*]+)\*\*$/;
const LEAD_LINE = /^\*\*([^*]+)\*\*\s+(.+)$/;
const LIST_ITEM = /^—\s+/;
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

type TextRun = { kind: 'paragraph'; paragraph: TemplateParagraph } | { kind: 'list'; items: string[] };

function isListItem(paragraph: TemplateParagraph): boolean {
  return paragraph.lead === undefined && LIST_ITEM.test(paragraph.body);
}

function runsOf(paragraphs: readonly TemplateParagraph[]): TextRun[] {
  const runs: TextRun[] = [];
  for (const paragraph of paragraphs) {
    const previous = runs.at(-1);
    if (!isListItem(paragraph)) runs.push({ kind: 'paragraph', paragraph });
    else if (previous?.kind === 'list') previous.items.push(paragraph.body.replace(LIST_ITEM, ''));
    else runs.push({ kind: 'list', items: [paragraph.body.replace(LIST_ITEM, '')] });
  }
  return runs;
}

export const TEMPLATE_TEXT_CLASSES = {
  body: 'max-w-prose space-y-3 text-sm leading-relaxed text-text-primary',
  list: 'list-disc space-y-1.5 pl-5 marker:text-text-label',
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
      {runsOf(paragraphs).map((run, index) =>
        run.kind === 'list' ? (
          <ul key={index} className={TEMPLATE_TEXT_CLASSES.list}>
            {run.items.map(item => (
              <li key={item}>
                <Emphasised text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <Paragraph key={index} paragraph={run.paragraph} />
        ),
      )}
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

export type TextCard = { key: string; title: string; eyebrow?: string; content: ReactNode };

export function blockIntroCards(view: ProgramView, block: Block, noteTitle: string): TextCard[] {
  const calibration = view.position.status === 'in-plan' && view.position.calibration;
  const calibrationText = calibration ? programTemplate(view, 'calibration') : '';
  return [
    ...writtenCard('intro', block.introText, `${BLOCK_TYPE_LABELS[block.type]} block`),
    ...writtenCard('note', block.clientNote, noteTitle),
    ...writtenCard('calibration', calibrationText, 'Calibration week'),
    ...writtenCard('missed-day', block.missedDayNote, 'If you miss a session'),
  ];
}

export function writtenCard(key: string, text: string, fallbackTitle: string): TextCard[] {
  return isWritten(text) ? [templateCard(key, text, fallbackTitle)] : [];
}

export function templateCard(key: string, text: string, fallbackTitle: string): TextCard {
  const { title, paragraphs } = parseTemplate(text);
  return { key, title: title || fallbackTitle, content: <TemplateBody paragraphs={paragraphs} /> };
}

export function TextCardStack({ cards }: { cards: readonly TextCard[] }) {
  const stackId = useId();
  return (
    <div className="grid gap-2">
      {cards.map((card, index) => {
        const headingId = `${stackId}-${card.key}`;
        return (
          <Collapsible key={card.key} asChild defaultOpen={index === 0}>
            <article aria-labelledby={headingId} className="rounded-control border border-border bg-card">
              <h3 id={headingId}>
                <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-4 py-3 text-left hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <span className="grid min-w-0 gap-0.5">
                    {card.eyebrow && <span className={LABEL_CLASS}>{card.eyebrow}</span>}
                    <span className="text-sm font-semibold text-pretty text-text-primary">{card.title}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-secondary transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
                </CollapsibleTrigger>
              </h3>
              <CollapsibleContent className="border-t border-border-subtle px-4 pt-3 pb-4">{card.content}</CollapsibleContent>
            </article>
          </Collapsible>
        );
      })}
    </div>
  );
}
