import { CalendarDays, ClipboardList, Dumbbell, Footprints, HeartPulse, History, Info, Leaf, ListChecks, Salad } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CollapsiblePortalWidget } from '../../components/CollapsiblePortalWidget';
import { EmptyState } from '../../components/EmptyState';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SUPPORTING_LINES } from '../../components/client-portal/ProgramStatusCard';
import { CARDIO_TYPE_LABELS, WEEKDAY_LABELS } from '../../components/coach-portal/program/program-constants';
import { DayContent } from '../../components/program-view/DayContent';
import { FocusCard } from '../../components/program-view/FocusCard';
import { WeekStrip } from '../../components/program-view/WeekStrip';
import { WhatChangedBanner, readDismissedVersion } from '../../components/program-view/WhatChangedBanner';
import { currentBlock, plainText, viewOf, weekStart, type ProgramView } from '../../components/program-view/programView';
import { Button } from '../../components/ui/button';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { dayOneOf, usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../domain/onboardingAnswers';
import { BLOCK_TYPE_LABELS, currentVersion, type Block, type ProgramVersion, type Weekday } from '../../domain/program';
import { blockDates, weekdayFromOnboarding, weekdayOf } from '../../domain/programCalendar';
import { estimatedCycleDay } from '../../domain/programOnboarding';
import { fillTemplate, templateText, type TemplateKey } from '../../domain/programTemplates';
import { formatJourneyDate } from '../../utils/journeyLabels';

const NUTRITION_FALLBACK = 'Your coach will add nutrition guidance here.';
const LIFESTYLE_FALLBACK = 'Nothing extra this time.';
const EMPTY_STATE_FALLBACK = 'Your coach is building it from your answers.';

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="grid gap-2 text-sm text-text-primary">
      {plainText(text)
        .split('\n')
        .filter(line => line.trim() !== '')
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>
  );
}

function template(view: ProgramView, key: TemplateKey): string {
  return templateText(key, view.program.language).text;
}

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
        {block.cardioSessions.map(cardio => (
          <li key={cardio.id}>
            {CARDIO_TYPE_LABELS[cardio.type]} · {cardio.minutes} min · {WEEKDAY_LABELS[cardio.weekday]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanBlocks({ view }: { view: ProgramView }) {
  const { blocks } = view.version.content.plan;
  const { dayOne, position } = view;
  return (
    <ol className="grid gap-1 text-sm text-text-primary">
      {blocks.map((block, index) => {
        const dates = dayOne ? blockDates(blocks, index, dayOne) : null;
        const isCurrent = position.status === 'in-plan' && position.blockIndex === index;
        return (
          <li key={block.id} aria-current={isCurrent ? 'true' : undefined} className={isCurrent ? 'font-semibold' : undefined}>
            {index + 1}. {BLOCK_TYPE_LABELS[block.type]} · {block.weeks} weeks
            {dates && ` · ${formatJourneyDate(dates.start)} – ${formatJourneyDate(dates.end)}`}
          </li>
        );
      })}
    </ol>
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

export function ClientProgram() {
  const { demoJourney } = useClientJourneys();
  const { programFor } = usePrograms();
  const { exercises } = useTraining();
  const [dismissedVersion, setDismissedVersion] = useState(readDismissedVersion);
  const today = new Date();
  const program = programFor(demoJourney.callId);
  const version = program && currentVersion(program);
  const [selected, setSelected] = useState<Weekday | null>(null);

  if (!program || !version) {
    return (
      <div data-parity-root="ClientProgram">
        <PortalPageHeader title="Program" />
        <EmptyState
          icon={ClipboardList}
          title="Your program is on its way"
          description={SUPPORTING_LINES[demoJourney.stage] ?? EMPTY_STATE_FALLBACK}
        />
      </div>
    );
  }

  const view = viewOf({
    program,
    version,
    dayOne: dayOneOf(demoJourney),
    today,
    preferredWeekday: weekdayFromOnboarding(collaborationPreference(demoJourney.onboarding, CHECK_IN_DAY_KEY)),
    exercises,
    cycleDay: estimatedCycleDay(demoJourney, today),
  });
  const block = currentBlock(view);
  const weekday = selected ?? (view.position.status === 'in-plan' ? weekdayOf(today) : 'mon');
  const superseded = program.versions.filter(candidate => candidate.state === 'superseded');
  const { content } = version;

  return (
    <div data-parity-root="ClientProgram" className="grid gap-6">
      <PortalPageHeader
        title="Program"
        subtitle={`Version ${version.number}${version.publishedAt ? ` · ${formatJourneyDate(version.publishedAt)}` : ''}`}
      />
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
        <section aria-label="Your week" className="grid gap-4">
          <WeekStrip block={block} weekStart={weekStart(view)} today={today} selected={weekday} onSelect={setSelected} />
          <DayContent view={view} block={block} weekday={weekday} />
        </section>
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
