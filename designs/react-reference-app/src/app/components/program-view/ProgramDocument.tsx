import type { ReactNode } from 'react';
import { BLOCK_TYPE_LABELS, WEEKDAYS, type Block, type Weekday } from '../../domain/program';
import { fillTemplate } from '../../domain/programTemplates';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { cardioMinutes } from '../../domain/programCardio';
import { LIFESTYLE_FALLBACK, NUTRITION_FALLBACK, Paragraphs, PlanBlocks, template } from './ProgramText';
import { SessionTable } from './SessionTable';
import { TrackingTable } from './TrackingTable';
import { cardioDayLabel, currentBlock, dayEntries, type ProgramView } from './programView';

const DISCLAIMER_PLACEHOLDER = 'Disclaimer (page 8) — placeholder';

const WEEKDAY_ABBREVIATIONS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

function entryLabel(block: Block, weekday: Weekday): string {
  const entry = dayEntries(block, weekday);
  if (entry.kind === 'session') return block.sessions.find(session => session.id === entry.sessionId)?.name ?? 'Session';
  if (entry.kind === 'cardio') return cardioDayLabel(block, weekday);
  return 'Rest';
}

function weekLine(block: Block): string {
  return WEEKDAYS.map(weekday => `${WEEKDAY_ABBREVIATIONS[weekday]} ${entryLabel(block, weekday)}`).join(' · ');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid grid-cols-1 gap-2">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function ProgramDocument({ view }: { view: ProgramView }) {
  const { program, version, exercisesById } = view;
  const { content } = version;
  const block = currentBlock(view);
  const { language } = program;
  const published = version.publishedAt ? ` · ${formatJourneyDate(version.publishedAt)}` : '';

  return (
    <article data-parity-root="ProgramDocument" className="mx-auto grid max-w-3xl grid-cols-1 gap-6 bg-white p-4 text-black sm:p-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold text-text-primary">{view.clientName}</h1>
        <p className="text-sm text-text-secondary">
          Version {version.number}
          {published}
        </p>
        {content.header.focus && <p className="text-sm text-text-primary">{content.header.focus}</p>}
      </header>
      {version.number > 1 && version.whatChanged && (
        <Section title={`What changed in v${version.number}`}>
          <Paragraphs text={version.whatChanged} />
        </Section>
      )}
      <Section title="Your plan">
        <PlanBlocks view={view} />
      </Section>
      <Section title="How to read your session">
        <Paragraphs text={template(view, 'legend')} />
      </Section>
      {block && (
        <>
          <Section title={`${BLOCK_TYPE_LABELS[block.type]} block`}>
            <Paragraphs text={block.introText || template(view, `block.${block.type}`)} />
            {block.clientNote && <Paragraphs text={block.clientNote} />}
            {block.calibrationWeek && <Paragraphs text={template(view, 'calibration')} />}
          </Section>
          <Section title="Your split">
            <h3 className="text-sm font-semibold text-text-primary">{block.split.name || block.split.shape}</h3>
            <Paragraphs text={block.split.text} />
          </Section>
          <Section title="Your week">
            <p className="text-sm text-text-primary">{weekLine(block)}</p>
          </Section>
          {block.sessions.map(session => (
            <div key={session.id} data-print-session className="grid grid-cols-1 gap-4">
              <SessionTable session={session} block={block} language={language} exercisesById={exercisesById} mode="document" />
              <TrackingTable session={session} block={block} exercisesById={exercisesById} />
            </div>
          ))}
          <Section title="Cardio and steps">
            <Paragraphs text={fillTemplate(template(view, 'steps'), { steps: block.dailySteps.toLocaleString('en-US') })} />
            <ul className="grid gap-1 text-sm text-text-primary">
              {block.cardioSessions.map(cardio => (
                <li key={cardio.id}>{`${cardio.name} · ${cardioMinutes(cardio)} min`}</li>
              ))}
            </ul>
          </Section>
        </>
      )}
      {program.cycleMode === 'adapted' && (
        <Section title="Listening to your cycle">
          <Paragraphs text={template(view, 'cycle')} />
        </Section>
      )}
      <Section title="Low-energy session">
        <Paragraphs text={template(view, 'lowEnergy')} />
      </Section>
      <Section title="Nutrition">
        <Paragraphs text={content.nutritionNotes || NUTRITION_FALLBACK} />
      </Section>
      <Section title="Lifestyle">
        <Paragraphs text={content.lifestyleNotes || LIFESTYLE_FALLBACK} />
      </Section>
      <p className="text-sm text-text-secondary">{DISCLAIMER_PLACEHOLDER}</p>
    </article>
  );
}
