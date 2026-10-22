import { CalendarDays, Download, Dumbbell, Footprints, HeartPulse, History, Info, Leaf, ListChecks, Salad } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CollapsiblePortalWidget } from '../CollapsiblePortalWidget';
import { PlanTimeline } from '../coach-portal/program/PlanTimeline';
import { WEEKDAY_LABELS } from '../coach-portal/program/program-constants';
import { LABEL_CLASS, WIDGET_SUBHEADING_CLASS } from '../typography';
import { Button } from '../ui/button';
import { BLOCK_TYPE_LABELS, WEEKDAYS, type Block, type ProgramVersion, type Weekday } from '../../domain/program';
import { cardioMinutes } from '../../domain/programCardio';
import { weekdayOf } from '../../domain/programCalendar';
import { fillTemplate } from '../../domain/programTemplates';
import { SPLIT_TEMPLATES } from '../../domain/splitTemplates';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { DayContent } from './DayContent';
import { FocusCard } from './FocusCard';
import { LIFESTYLE_FALLBACK, NUTRITION_FALLBACK, Paragraphs, template } from './ProgramText';
import { WeekStrip } from './WeekStrip';
import { WhatChangedBanner, readDismissedVersion } from './WhatChangedBanner';
import { cardioFor, currentBlock, weekStart, type ProgramView } from './programView';

function AboutBlock({ view, block }: { view: ProgramView; block: Block }) {
  const intro = block.introText || template(view, `block.${block.type}`);
  return (
    <div className="grid gap-3">
      <Paragraphs text={intro} />
      {block.clientNote && <Paragraphs text={block.clientNote} />}
      {view.position.status === 'in-plan' && view.position.calibration && <Paragraphs text={template(view, 'calibration')} />}
    </div>
  );
}

function CardioAndSteps({ view, block }: { view: ProgramView; block: Block }) {
  const steps = fillTemplate(template(view, 'steps'), { steps: block.dailySteps.toLocaleString('en-US') });
  return (
    <div className="grid gap-3">
      <Paragraphs text={steps} />
      <ul className="divide-y divide-border-subtle">
        {WEEKDAYS.flatMap(weekday => {
          const cardio = cardioFor(block, weekday);
          if (!cardio) return [];
          return [
            <li key={weekday} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
              <span className="font-medium text-text-primary">{cardio.name}</span>
              <span className="text-text-secondary tabular-nums">{`${cardioMinutes(cardio)} min · ${WEEKDAY_LABELS[weekday]}`}</span>
            </li>,
          ];
        })}
      </ul>
    </div>
  );
}

function PreviousVersions({ versions }: { versions: readonly ProgramVersion[] }) {
  const groups = new Map<string, ProgramVersion[]>();
  for (const version of versions) {
    const label = BLOCK_TYPE_LABELS[version.content.plan.blocks[0].type];
    groups.set(label, [...(groups.get(label) ?? []), version]);
  }
  return (
    <div className="grid gap-4">
      {[...groups].map(([label, group]) => (
        <section key={label} className="grid gap-2">
          <h3 className={LABEL_CLASS}>{label}</h3>
          <ul className="divide-y divide-border-subtle">
            {group.map(version => (
              <li key={version.number} className="flex items-center justify-between gap-3 py-2 text-sm text-text-primary tabular-nums">
                <span>
                  Version {version.number}
                  {version.publishedAt && ` · ${formatJourneyDate(version.publishedAt)}`}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/portal/program/document/${version.number}`}>Download PDF</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Section({ title, id, icon, children }: { title: string; id: string; icon: typeof Info; children: ReactNode }) {
  return (
    <CollapsiblePortalWidget title={title} icon={icon} headingId={`program-section-${id}`}>
      {children}
    </CollapsiblePortalWidget>
  );
}

export function ClientProgramBody({ view }: { view: ProgramView }) {
  const { program, version, today } = view;
  const [dismissedVersion, setDismissedVersion] = useState(readDismissedVersion);
  const [selected, setSelected] = useState<Weekday | null>(null);
  const block = currentBlock(view);
  const weekday = selected ?? (view.position.status === 'in-plan' ? weekdayOf(today) : 'mon');
  const superseded = program.versions.filter(candidate => candidate.state === 'superseded');
  const { content } = version;

  return (
    <div className="grid grid-cols-1 gap-6">
      <FocusCard
        view={view}
        action={
          <Button asChild variant="ghost" size="sm" className="text-text-secondary">
            <Link to="/portal/program/document">
              <Download aria-hidden="true" />
              Download PDF
            </Link>
          </Button>
        }
      />
      <WhatChangedBanner version={version} dismissedVersion={dismissedVersion} onDismiss={() => setDismissedVersion(version.number)} />
      {block && (
        <section aria-labelledby="program-week" className="grid gap-4">
          <h2 id="program-week" className={LABEL_CLASS}>
            This week
          </h2>
          <WeekStrip block={block} weekStart={weekStart(view)} today={today} selected={weekday} onSelect={setSelected} />
          <DayContent view={view} block={block} weekday={weekday} />
        </section>
      )}
      {block && (
        <div className="grid grid-cols-1 gap-3">
          <Section title="About this block" id="about" icon={Info}>
            <AboutBlock view={view} block={block} />
          </Section>
          <Section title="Your split" id="split" icon={Dumbbell}>
            <div className="grid gap-2">
              <h3 className={WIDGET_SUBHEADING_CLASS}>{block.split.name || SPLIT_TEMPLATES[block.split.shape].label}</h3>
              <Paragraphs text={block.split.text} />
            </div>
          </Section>
          {program.cycleMode === 'adapted' && (
            <Section title="Listening to your cycle" id="cycle" icon={HeartPulse}>
              <Paragraphs text={template(view, 'cycle')} />
            </Section>
          )}
          <Section title="How to read your session" id="legend" icon={ListChecks}>
            <Paragraphs text={template(view, 'legend')} />
          </Section>
          <Section title="Cardio and steps" id="cardio" icon={Footprints}>
            <CardioAndSteps view={view} block={block} />
          </Section>
          <Section title="Nutrition" id="nutrition" icon={Salad}>
            <Paragraphs text={content.nutritionNotes || NUTRITION_FALLBACK} />
          </Section>
          <Section title="Lifestyle" id="lifestyle" icon={Leaf}>
            <Paragraphs text={content.lifestyleNotes || LIFESTYLE_FALLBACK} />
          </Section>
          <Section title="Your plan" id="plan" icon={CalendarDays}>
            <PlanTimeline blocks={content.plan.blocks} dayOne={view.dayOne} preferredWeekday={view.preferredWeekday} today={today} />
          </Section>
          {superseded.length > 0 && (
            <Section title="Previous versions" id="previous" icon={History}>
              <PreviousVersions versions={superseded} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
