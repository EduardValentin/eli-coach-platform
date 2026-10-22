import { BLOCK_TYPE_LABELS } from '../../domain/program';
import { blockDates } from '../../domain/programCalendar';
import { templateText, type TemplateKey } from '../../domain/programTemplates';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { plainText, type ProgramView } from './programView';

export const NUTRITION_FALLBACK = 'Your coach will add nutrition guidance here.';
export const LIFESTYLE_FALLBACK = 'Nothing extra this time.';

export function Paragraphs({ text }: { text: string }) {
  return (
    <div className="grid gap-3 text-sm leading-relaxed text-text-primary">
      {plainText(text)
        .split('\n')
        .filter(line => line.trim() !== '')
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>
  );
}

export function template(view: ProgramView, key: TemplateKey): string {
  return templateText(key, view.program.language).text;
}

export function PlanBlocks({ view }: { view: ProgramView }) {
  const { blocks } = view.version.content.plan;
  const { dayOne, position } = view;
  return (
    <ol className="grid gap-1 text-sm text-text-primary">
      {blocks.map((block, index) => {
        const dates = dayOne ? blockDates(blocks, index, dayOne) : null;
        const isCurrent = position.status === 'in-plan' && position.blockIndex === index;
        return (
          <li key={block.id} aria-current={isCurrent ? 'true' : undefined} className={isCurrent ? 'font-semibold' : undefined}>
            {index + 1}. {BLOCK_TYPE_LABELS[block.type]} · {block.weeks} {block.weeks === 1 ? 'week' : 'weeks'}
            {dates && ` · ${formatJourneyDate(dates.start)} – ${formatJourneyDate(dates.end)}`}
          </li>
        );
      })}
    </ol>
  );
}
