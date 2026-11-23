import { useId, type ReactNode } from 'react';
import { CircleCheck, CircleDashed, ClipboardList } from 'lucide-react';
import { Link } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import { useTraining } from '../../../context/TrainingContext';
import { coachingHasEnded, isBeforeStage, type ClientJourney } from '../../../domain/journey';
import {
  BLOCK_TYPE_LABELS,
  currentVersion,
  draftOf,
  filledSessionCount,
  type Block,
  type Program,
  type ProgramVersion,
} from '../../../domain/program';
import { counted } from '../../../utils/counted';
import { clientDetailPathForJourney, clientPronouns } from '../../../utils/journeyLabels';
import { EmptyState } from '../../EmptyState';
import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { EYEBROW_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { BlockNumber } from '../../program-view/BlockNumber';
import { filledSessionsText } from './blockParts';
import { NextVersionAction } from './NextVersionAction';
import { journeyProgramView } from '../../program-view/journeyProgramView';
import { ProgramPlanSummary } from '../../program-view/ProgramPlan';
import { coachingEndedDraftReason, draftStateOf } from './unpublishableDraft';
import { UpcomingBlockWarnings } from './UpcomingBlockWarnings';
import { VersionReading } from './VersionReading';

function missingFrom(version: ProgramVersion): string[] {
  const { content } = version;
  const emptySessions = content.plan.blocks.reduce(
    (sum, block) => sum + block.sessions.length - filledSessionCount(block),
    0,
  );
  const missing: string[] = [];
  if (emptySessions > 0) missing.push(`${counted(emptySessions, 'session')} without exercises`);
  return missing;
}

function BlockChip({ block, index }: { block: Block; index: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary" data-parity={`block-${index + 1}-chip`}>
      <BlockNumber block={block} index={index} size="xs" />
      {`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}
    </span>
  );
}

function DraftBlocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <ul aria-label="Blocks" className="divide-y divide-border-subtle">
      {blocks.map((block, index) => {
        const filled = filledSessionCount(block);
        const total = block.sessions.length;
        return (
          <li key={block.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0" data-parity={`block-${index + 1}`}>
            <BlockChip block={block} index={index} />
            <span className={cn('text-sm tabular-nums', filled < total ? 'text-warning' : 'text-text-secondary')} data-parity={`block-${index + 1}-sessions`}>
              {filledSessionsText(filled, total)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DraftReadiness({ missing }: { missing: readonly string[] }) {
  const titleId = useId();
  if (missing.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-success">
        <CircleCheck aria-hidden="true" className="shrink-0" size={16} />
        Ready to publish
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <p id={titleId} className={EYEBROW_CLASS}>
        Still missing
      </p>
      <ul aria-labelledby={titleId} className="grid gap-2">
        {missing.map(item => (
          <li key={item} className="flex items-start gap-2 text-sm text-text-primary">
            <CircleDashed aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={16} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DraftSummary({ journey, version }: { journey: ClientJourney; version: ProgramVersion }) {
  return (
    <SettingsBody className="grid gap-4" parity="draft-summary">
      <p className={EYEBROW_CLASS}>{`Version ${version.number} · draft`}</p>
      <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-8" data-parity="draft-columns">
        <DraftBlocks blocks={version.content.plan.blocks} />
        <div className="self-start rounded-field bg-surface-quiet p-4" data-parity="draft-readiness">
          {draftStateOf(journey, new Date()) === 'coaching-ended' ? (
            <p className="text-sm text-text-secondary">{coachingEndedDraftReason(journey)}</p>
          ) : (
            <DraftReadiness missing={missingFrom(version)} />
          )}
        </div>
      </div>
    </SettingsBody>
  );
}

function PublishedSummary({ journey, program, programPath }: { journey: ClientJourney; program: Program; programPath: string }) {
  const { exercises } = useTraining();
  const version = currentVersion(program);
  if (!version) return null;
  const view = journeyProgramView({ journey, program, version, exercises, today: new Date() });
  return (
    <SettingsBody>
      <ProgramPlanSummary
        view={view}
        voice="coach"
        reading={<VersionReading version={version} />}
        weekAction={{ kind: 'link', label: 'Open in the program', hrefOf: week => `${programPath}?week=${week}` }}
        notice={view.dayOne && <UpcomingBlockWarnings blocks={version.content.plan.blocks} dayOne={view.dayOne} today={view.today} />}
      />
    </SettingsBody>
  );
}

function NoProgram({ journey, programPath }: { journey: ClientJourney; programPath: string }) {
  const possessive = clientPronouns(journey.profile.identity.gender).possessive;
  if (coachingHasEnded(journey, new Date())) {
    return <EmptyState icon={ClipboardList} title="No program" description={`${possessive.capitalised} coaching has ended.`} />;
  }
  if (isBeforeStage(journey.stage, 'approved')) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No program yet"
        description={`The program opens once ${possessive.lower} answers are approved.`}
      />
    );
  }
  return (
    <EmptyState
      icon={ClipboardList}
      title="No program yet"
      description={`Build it from ${possessive.lower} profile.`}
      action={
        <Button variant="primary" asChild>
          <Link to={`${programPath}/new`}>Build program</Link>
        </Button>
      }
    />
  );
}

export function ProgramBlock({ journey }: { journey: ClientJourney }) {
  const { programFor } = usePrograms();
  const program = programFor(journey.callId);
  const programPath = `${clientDetailPathForJourney(journey)}/program`;
  const draft = program && draftOf(program);
  const published = program?.versions.some(version => version.state === 'published');

  let body: ReactNode;
  let footer: ReactNode = null;
  if (!program) {
    body = <NoProgram journey={journey} programPath={programPath} />;
  } else if (!published) {
    body = draft && <DraftSummary journey={journey} version={draft} />;
    footer = <NextVersionAction journey={journey} program={program} />;
  } else {
    body = <PublishedSummary journey={journey} program={program} programPath={programPath} />;
    footer = (
      <>
        <Button variant="outline" asChild>
          <Link to={programPath}>View program</Link>
        </Button>
        <NextVersionAction journey={journey} program={program} />
      </>
    );
  }

  return (
    <SettingsSection
      headingId="client-program"
      title="Program"
      icon={ClipboardList}
      parityRoot="ProgramBlock"
      className="mb-8"
      footer={footer}
    >
      {body}
    </SettingsSection>
  );
}
