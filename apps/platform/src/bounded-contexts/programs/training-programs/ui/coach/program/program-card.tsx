import { cn, EYEBROW_CLASS } from "~/shared/design-system/lib";
import {
  EmptyState,
  SettingsBody,
  SettingsSection,
} from "~/shared/design-system/portal";
import { buttonVariants } from "~/shared/design-system/primitives";
import { CircleCheck, CircleDashed, ClipboardList } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Link } from "react-router";

import {
  programBuilderPath,
  programSetupPath,
} from "~/bounded-contexts/programs/training-programs/public/paths";
import type { ProgramCardView } from "~/bounded-contexts/programs/training-programs/public/program-card";
import { possessivePronoun } from "~/bounded-contexts/scheduling/assessment-calls/ui/shared/visitor-profile-display";

import { filledSessionsText } from "./block-parts";
import { BlockNumber } from "./block-number";

type DraftCard = Extract<ProgramCardView, { state: "draft" }>;

type ProgramCardDraft = DraftCard["draft"];

type ProgramCardBlock = ProgramCardDraft["blocks"][number];

type ProgramCardProps = { card: ProgramCardView; clientId: string };

function BlockChip({
  block,
  number,
}: {
  block: ProgramCardBlock;
  number: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 text-sm font-medium text-text-primary"
      data-parity={`block-${number}-chip`}
    >
      <BlockNumber block={block} index={number - 1} size="xs" />
      {`${block.typeLabel} · ${block.weeks} wk`}
    </span>
  );
}

function DraftBlocks({ blocks }: { blocks: ProgramCardDraft["blocks"] }) {
  return (
    <ul aria-label="Blocks" className="divide-y divide-border-subtle">
      {blocks.map((block, index) => {
        const number = index + 1;
        const unfilled = block.filledSessions < block.sessions;

        return (
          <li
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            data-parity={`block-${number}`}
            key={number}
          >
            <BlockChip block={block} number={number} />
            <span
              className={cn("text-sm tabular-nums", {
                "text-feedback-warning": unfilled,
                "text-text-secondary": !unfilled,
              })}
              data-parity={`block-${number}-sessions`}
            >
              {filledSessionsText(block.filledSessions, block.sessions)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DraftReadiness({ stillMissing }: { stillMissing: readonly string[] }) {
  const titleId = useId();

  if (stillMissing.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-feedback-success">
        <CircleCheck aria-hidden="true" className="shrink-0" size={16} />
        Ready to publish
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <p className={EYEBROW_CLASS} id={titleId}>
        Still missing
      </p>
      <ul aria-labelledby={titleId} className="grid gap-2">
        {stillMissing.map((item) => (
          <li
            className="flex items-start gap-2 text-sm text-text-primary"
            key={item}
          >
            <CircleDashed
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-feedback-warning"
              size={16}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DraftSummaryPanel({
  draft,
  readiness,
}: {
  draft: ProgramCardDraft;
  readiness: ReactNode;
}) {
  return (
    <SettingsBody className="grid gap-4" data-parity="draft-summary">
      <p
        className={EYEBROW_CLASS}
      >{`Version ${draft.versionNumber} · draft`}</p>
      <div
        className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-8"
        data-parity="draft-columns"
      >
        <DraftBlocks blocks={draft.blocks} />
        <div
          className="self-start rounded-field bg-surface-quiet p-4"
          data-parity="draft-readiness"
        >
          {readiness}
        </div>
      </div>
    </SettingsBody>
  );
}

function ProgramCardBody({ card, clientId }: ProgramCardProps) {
  const her = possessivePronoun(card.gender);

  switch (card.state) {
    case "waiting":
      return (
        <EmptyState
          description={`The program opens once ${her.lower} answers are approved.`}
          icon={ClipboardList}
          title="No program yet"
        />
      );
    case "ready-to-build":
      return (
        <EmptyState
          action={
            <Link
              className={buttonVariants({ size: "sm", variant: "primary" })}
              to={programSetupPath(clientId)}
            >
              Build program
            </Link>
          }
          description={`Build it from ${her.lower} profile.`}
          icon={ClipboardList}
          title="No program yet"
        />
      );
    case "coaching-ended":
      return (
        <EmptyState
          description={`${her.capitalised} coaching has ended.`}
          icon={ClipboardList}
          title="No program"
        />
      );
    case "draft":
      return (
        <DraftSummaryPanel
          draft={card.draft}
          readiness={<DraftReadiness stillMissing={card.stillMissing} />}
        />
      );
    case "draft-coaching-ended":
      return (
        <DraftSummaryPanel
          draft={card.draft}
          readiness={
            <p className="text-sm text-text-secondary">
              {`${her.capitalised} coaching has ended, so this draft can’t be published.`}
            </p>
          }
        />
      );
  }
}

function ContinueDraft({ clientId }: { clientId: string }) {
  return (
    <Link
      className={buttonVariants({ size: "sm", variant: "primary" })}
      to={programBuilderPath(clientId)}
    >
      Continue draft
    </Link>
  );
}

const DRAFT_STATES: readonly ProgramCardView["state"][] = [
  "draft",
  "draft-coaching-ended",
];

export function ProgramCard(props: ProgramCardProps) {
  return (
    <SettingsSection
      className="mb-8"
      data-parity-root="ProgramBlock"
      footer={
        DRAFT_STATES.includes(props.card.state) && (
          <ContinueDraft clientId={props.clientId} />
        )
      }
      headingId="client-program"
      icon={ClipboardList}
      title="Program"
    >
      <ProgramCardBody {...props} />
    </SettingsSection>
  );
}
