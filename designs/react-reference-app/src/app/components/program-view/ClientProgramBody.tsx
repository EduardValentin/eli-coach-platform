import { CalendarDays, CalendarRange, Dumbbell, Footprints, HeartPulse, History, Info, Leaf, ListChecks, Salad } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CollapsiblePortalWidget } from '../CollapsiblePortalWidget';
import { ClientWidget } from '../client-portal/ClientWidget';
import { WEEKDAY_LABELS } from '../coach-portal/program/program-constants';
import { Button } from '../ui/button';
import { BLOCK_TYPE_LABELS, WEEKDAYS, type Block, type ProgramVersion, type Weekday } from '../../domain/program';
import { cardioMinutes } from '../../domain/programCardio';
import { weekdayOf } from '../../domain/programCalendar';
import { fillTemplate } from '../../domain/programTemplates';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { DayContent } from './DayContent';
import { FocusCard } from './FocusCard';
import { LIFESTYLE_FALLBACK, NUTRITION_FALLBACK, Paragraphs, PlanBlocks, template } from './ProgramText';
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
      <ul className="grid gap-1 text-sm text-text-primary">
        {WEEKDAYS.flatMap(weekday => {
          const cardio = cardioFor(block, weekday);
          if (!cardio) return [];
          return [<li key={cardio.id}>{`${cardio.name} · ${cardioMinutes(cardio)} min · ${WEEKDAY_LABELS[weekday]}`}</li>];
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
          <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
          <ul className="grid gap-2">
            {group.map(version => (
              <li key={version.number} className="flex items-center justify-between gap-3 text-sm text-text-primary">
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
    <div className="grid gap-6">
      <FocusCard
        view={view}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/portal/program/document">Download PDF</Link>
          </Button>
        }
      />
      <WhatChangedBanner version={version} dismissedVersion={dismissedVersion} onDismiss={() => setDismissedVersion(version.number)} />
      {block && (
        <ClientWidget eyebrow="This week" icon={CalendarRange} headingId="program-week">
          <div className="grid gap-6">
            <WeekStrip block={block} weekStart={weekStart(view)} today={today} selected={weekday} onSelect={setSelected} />
            <DayContent view={view} block={block} weekday={weekday} />
          </div>
        </ClientWidget>
      )}
      {block && (
        <div className="grid gap-4">
          <Section title="About this block" id="about" icon={Info}>
            <AboutBlock view={view} block={block} />
          </Section>
          <Section title="Your split" id="split" icon={Dumbbell}>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-text-primary">{block.split.name || block.split.shape}</h3>
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
            <PlanBlocks view={view} />
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
