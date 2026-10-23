import { useId, type ReactNode } from 'react';
import { CircleCheck, CircleDashed, ClipboardList } from 'lucide-react';
import { Link } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import { isBeforeStage, type ClientJourney } from '../../../domain/journey';
import {
  BLOCK_TYPE_LABELS,
  currentVersion,
  draftOf,
  filledSessionCount,
  type Block,
  type BlockType,
  type Program,
  type ProgramVersion,
} from '../../../domain/program';
import { currentPosition, dayOneOf } from '../../../domain/programCalendar';
import { clientDetailPathForJourney, clientPronouns } from '../../../utils/journeyLabels';
import { EmptyState } from '../../EmptyState';
import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH } from './program-constants';
import { NextVersionAction } from './NextVersionAction';
import { ProgramSummary } from './ProgramSummary';

function missingFrom(version: ProgramVersion): string[] {
  const { content } = version;
  const emptySessions = content.plan.blocks.reduce(
    (sum, block) => sum + block.sessions.length - filledSessionCount(block),
    0,
  );
  const missing: string[] = [];
  if (!content.header.focus.trim()) missing.push('Focus not set');
  if (emptySessions > 0) missing.push(`${emptySessions} ${emptySessions === 1 ? 'session' : 'sessions'} without exercises`);
  if (version.number >= 2 && !version.whatChanged.trim()) missing.push('What changed not written');
  return missing;
}

function BlockChip({ block }: { block: Block }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-text-primary',
        BLOCK_SOFT[block.type],
      )}
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', BLOCK_SWATCH[block.type])} />
      {`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}
    </span>
  );
}

function DraftBlocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <ul aria-label="Blocks" className="divide-y divide-border-subtle">
      {blocks.map(block => {
        const filled = filledSessionCount(block);
        const total = block.sessions.length;
        return (
          <li key={block.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
            <BlockChip block={block} />
            <span className={cn('text-sm tabular-nums', filled < total ? 'text-warning' : 'text-text-secondary')}>
              {`${filled} of ${total} sessions`}
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
      <p id={titleId} className={LABEL_CLASS}>
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

function DraftSummary({ version }: { version: ProgramVersion }) {
  return (
    <SettingsBody className="grid gap-4">
      <p className={LABEL_CLASS}>{`Version ${version.number} · draft`}</p>
      <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-8">
        <DraftBlocks blocks={version.content.plan.blocks} />
        <div className="self-start rounded-field bg-surface-quiet p-4">
          <DraftReadiness missing={missingFrom(version)} />
        </div>
      </div>
    </SettingsBody>
  );
}

function currentBlockType(journey: ClientJourney, program: Program): BlockType | null {
  const blocks = currentVersion(program)?.content.plan.blocks ?? [];
  const position = currentPosition(blocks, dayOneOf(journey), new Date());
  if (position.status === 'in-plan') return blocks[position.blockIndex].type;
  return position.status === 'before' ? (blocks[0]?.type ?? null) : null;
}

function PublishedSummary({ journey, program }: { journey: ClientJourney; program: Program }) {
  const type = currentBlockType(journey, program);
  return (
    <>
      <span aria-hidden="true" className={cn('block h-1', type ? BLOCK_SWATCH[type] : 'bg-border')} />
      <SettingsBody>
        <ProgramSummary journey={journey} program={program} />
      </SettingsBody>
    </>
  );
}

export function ProgramBlock({ journey }: { journey: ClientJourney }) {
  const { programFor } = usePrograms();
  const program = programFor(journey.callId);
  const programPath = `${clientDetailPathForJourney(journey)}/program`;
  const draft = program && draftOf(program);
  const published = program?.versions.some(version => version.state === 'published');
  const possessive = clientPronouns(journey.identity.gender).possessive.lower;

  let body: ReactNode;
  let footer: ReactNode = null;
  if (!program) {
    const waiting = isBeforeStage(journey.stage, 'submitted');
    body = (
      <EmptyState
        icon={ClipboardList}
        title="No program yet"
        description={waiting ? `Available once ${possessive} onboarding is sent.` : `Build it from ${possessive} onboarding answers.`}
        action={
          !waiting && (
            <Button variant="primary" asChild>
              <Link to={`${programPath}/new`}>Build program</Link>
            </Button>
          )
        }
      />
    );
  } else if (!published) {
    body = draft && <DraftSummary version={draft} />;
    footer = <NextVersionAction journey={journey} program={program} />;
  } else {
    body = <PublishedSummary journey={journey} program={program} />;
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
