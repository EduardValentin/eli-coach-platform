import { CalendarDays, Download, Dumbbell, Footprints, HeartPulse, History, Info, Leaf, ListChecks, Salad } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CollapsiblePortalWidget } from '../CollapsiblePortalWidget';
import { LABEL_CLASS } from '../typography';
import { Button } from '../ui/button';
import { BLOCK_TYPE_LABELS, cardioOn, WEEKDAY_LABELS, WEEKDAYS, type Block, type ProgramVersion, type Weekday } from '../../domain/program';
import { cardioMinutes } from '../../domain/programCardio';
import { weekdayOf } from '../../domain/programCalendar';
import { fillTemplate } from '../../domain/programTemplates';
import { splitLabel } from '../../domain/splitTemplates';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { DayContent } from './DayContent';
import { PlanTimeline } from './PlanTimeline';
import { FocusCard } from './FocusCard';
import { LIFESTYLE_FALLBACK, NUTRITION_FALLBACK, parseTemplate, ProgramText, template, TemplateBody, templateCard, TextCardStack } from './ProgramText';
import { WeekStrip } from './WeekStrip';
import { WhatChangedBanner, readDismissedVersion } from './WhatChangedBanner';
import { currentBlock, weekStart, type ProgramView } from './programView';

function AboutBlock({ view, block }: { view: ProgramView; block: Block }) {
  const calibration = view.position.status === 'in-plan' && view.position.calibration;
  const cards = [
    templateCard('intro', block.introText || template(view, `block.${block.type}`), `${BLOCK_TYPE_LABELS[block.type]} block`),
    ...(block.clientNote ? [templateCard('note', block.clientNote, 'A note from your coach')] : []),
    ...(calibration ? [templateCard('calibration', template(view, 'calibration'), 'Calibration week')] : []),
  ];
  return <TextCardStack cards={cards} />;
}

function CardioAndSteps({ view, block }: { view: ProgramView; block: Block }) {
  const steps = fillTemplate(template(view, 'steps'), { steps: block.dailySteps.toLocaleString('en-US') });
  return (
    <div className="grid gap-3">
      <ProgramText text={steps} />
      <ul className="divide-y divide-border-subtle">
        {WEEKDAYS.flatMap(weekday => {
          const cardio = cardioOn(block, weekday);
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
            <TextCardStack cards={[templateCard('split', block.split.text, splitLabel(block))]} />
          </Section>
          {program.cycleMode === 'adapted' && (
            <Section title="Listening to your cycle" id="cycle" icon={HeartPulse}>
              <TextCardStack cards={[templateCard('cycle', template(view, 'cycle'), 'Listening to your cycle')]} />
            </Section>
          )}
          <Section title="How to read your session" id="legend" icon={ListChecks}>
            <TemplateBody paragraphs={parseTemplate(template(view, 'legend')).paragraphs} />
          </Section>
          <Section title="Cardio and steps" id="cardio" icon={Footprints}>
            <CardioAndSteps view={view} block={block} />
          </Section>
          <Section title="Nutrition" id="nutrition" icon={Salad}>
            <ProgramText text={content.nutritionNotes || NUTRITION_FALLBACK} />
          </Section>
          <Section title="Lifestyle" id="lifestyle" icon={Leaf}>
            <ProgramText text={content.lifestyleNotes || LIFESTYLE_FALLBACK} />
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
