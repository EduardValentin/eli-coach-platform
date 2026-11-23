import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { AlertCircle, AlertTriangle, ArrowLeft, ChevronRight, Eye, Library, Send, Trash2, UserRound } from 'lucide-react';
import type { ClientJourney } from '../../../domain/journey';
import type { ProgramVersion } from '../../../domain/program';
import type { BlockingCode, RuleFinding, WarningCode } from '../../../domain/programRules';
import { counted } from '../../../utils/counted';
import { clientDetailPathForJourney, formatJourneyDate, journeyClientName } from '../../../utils/journeyLabels';
import { DisabledActionHint } from '../../DisabledActionHint';
import { RowActionsMenu, type RowMenuAction } from '../../RowActionsMenu';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Alert, AlertAction } from '../../ui/alert';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { useIsDesktop, useMediaQuery } from '../../ui/use-desktop';
import { cn } from '../../ui/utils';
import { ClientProfilePopover, ClientProfileTrigger } from './ClientProfilePopover';
import { ProgramFindings, type FindingTarget } from './ProgramFindings';
import { coachingEndedDraftReason, type DraftState } from './unpublishableDraft';
import type { DraftSaving, SaveState } from './useAutosavedDraft';
import type { WriteResult } from './useEditorState';

type EditorTopBarProps = {
  journey: ClientJourney;
  version: ProgramVersion;
  basedOn: ProgramVersion | undefined;
  railToggle: ReactNode;
  library: { open: boolean; onToggle: () => void } | null;
  placeTitle: string;
  placeHeading: RefObject<HTMLHeadingElement>;
  onOverview: (() => void) | null;
  onOpenFinding: (target: FindingTarget) => void;
  onPreview: () => void;
  onPublish: () => void;
  onDiscard: () => WriteResult;
  opensOn: Date | null;
  draftState: DraftState;
  problems: readonly RuleFinding<BlockingCode>[];
  warnings: readonly RuleFinding<WarningCode>[];
  saving: DraftSaving;
};

const SM_QUERY = '(min-width: 40em)';
const PLACE_TITLE_CLASS = cn(WIDGET_TITLE_CLASS, 'break-words outline-none');

function discardDescription(version: ProgramVersion): string {
  return version.number > 1
    ? `Everything you changed since version ${version.number - 1} is lost.`
    : 'Nothing has been published yet, so the whole program is deleted.';
}

function draftLine(name: string, version: ProgramVersion, basedOn: ProgramVersion | undefined): string {
  const origin = version.number > 1 && basedOn?.publishedAt ? ` · from v${version.number - 1}, ${formatJourneyDate(basedOn.publishedAt)}` : '';
  return `${name} · v${version.number} draft${origin}`;
}

const SAVE_STATE_LABEL: Record<SaveState, string | null> = {
  unchanged: null,
  saving: 'Saving…',
  saved: 'Saved',
  'not-saved': 'Not saved',
  'changed-elsewhere': 'Changed elsewhere',
};

function SaveStateNote({ state }: { state: SaveState }) {
  const label = SAVE_STATE_LABEL[state];
  if (!label) return null;
  const notSaved = state === 'not-saved' || state === 'changed-elsewhere';
  return (
    <>
      {' '}
      <span className="whitespace-nowrap">
        {'· '}
        <span className={cn({ 'inline-flex items-center gap-1 align-top font-medium text-destructive': notSaved })}>
          {notSaved && <AlertCircle aria-hidden="true" size={12} />}
          {label}
        </span>
      </span>
    </>
  );
}

type FailedSaveAlertProps = Pick<DraftSaving, 'retrying' | 'retryNow'> & { placeHeading: RefObject<HTMLHeadingElement> };

function FailedSaveAlert({ retrying, retryNow, placeHeading }: FailedSaveAlertProps) {
  useFocusMovedToHeadingOnClose(placeHeading);
  return (
    <Alert
      className="order-last basis-full"
      action={
        <AlertAction aria-disabled={retrying || undefined} onClick={retrying ? undefined : retryNow} className="aria-disabled:opacity-100">
          {retrying ? 'Trying again…' : 'Try again now'}
        </AlertAction>
      }
    >
      Your latest changes aren’t saved yet. They’re still here, and saving keeps trying.
    </Alert>
  );
}

function focusIsLost(): boolean {
  return document.activeElement === null || document.activeElement === document.body;
}

/** Focus inside the closing element would drop to the page, so it moves to the place heading. */
function useFocusMovedToHeadingOnClose(placeHeading: RefObject<HTMLHeadingElement>) {
  useEffect(
    () => () => {
      if (focusIsLost()) placeHeading.current?.focus();
    },
    [placeHeading],
  );
}

type PlaceProps = Pick<EditorTopBarProps, 'placeTitle' | 'placeHeading' | 'onOverview'>;

function Place({ placeTitle, placeHeading, onOverview }: PlaceProps) {
  const heading = (
    <h1 ref={placeHeading} tabIndex={-1} className={PLACE_TITLE_CLASS}>
      {placeTitle}
    </h1>
  );
  if (!onOverview) return heading;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1">
        <li className="shrink-0">
          <button type="button" onClick={onOverview} className={cn(WIDGET_TITLE_CLASS, 'relative hit-area rounded-tile text-text-secondary transition-colors hover:text-text-primary')}>
            Overview
          </button>
        </li>
        <li aria-current="page" className="flex min-w-0 items-center gap-1">
          <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-text-secondary" />
          {heading}
        </li>
      </ol>
    </nav>
  );
}

type ChecksButtonProps = Pick<EditorTopBarProps, 'problems' | 'warnings' | 'onOpenFinding' | 'draftState'>;

function problemsBeforePublishingLabel(count: number): string {
  return `${counted(count, 'problem')} to fix before publishing`;
}

function problemsInDraftLabel(count: number): string {
  return `${counted(count, 'problem')} in the draft`;
}

const PROBLEMS_LABEL: Record<DraftState, (count: number) => string> = {
  publishable: problemsBeforePublishingLabel,
  'coaching-ended': problemsInDraftLabel,
};

const PROBLEMS_HEADING: Record<DraftState, string> = {
  publishable: 'Before you can publish',
  'coaching-ended': 'Problems in the draft',
};

const DRAFT_STATE_NOTE: Record<DraftState, string | null> = {
  publishable: null,
  'coaching-ended': 'coaching ended',
};

function ChecksButton({ problems, warnings, onOpenFinding, draftState }: ChecksButtonProps) {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const blocked = problems.length > 0;
  const label = blocked ? PROBLEMS_LABEL[draftState](problems.length) : `${counted(warnings.length, 'thing')} worth a look`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" aria-label={label} className={cn('tabular-nums', { 'text-destructive': blocked, 'text-warning': !blocked })}>
          {blocked ? <AlertCircle aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          {blocked ? problems.length : warnings.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} collisionPadding={16} aria-labelledby={headingId} className="grid w-80 max-w-[calc(100vw-2rem)] gap-4 rounded-card">
        <h2 id={headingId} className={WIDGET_TITLE_CLASS}>
          Review the draft
        </h2>
        <ProgramFindings
          problemsHeading={PROBLEMS_HEADING[draftState]}
          problems={problems}
          warnings={warnings}
          onOpen={target => {
            setOpen(false);
            onOpenFinding(target);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function publishUnavailableReason({ journey, opensOn, draftState }: Pick<EditorTopBarProps, 'journey' | 'opensOn' | 'draftState'>): string | null {
  if (draftState === 'coaching-ended') return coachingEndedDraftReason(journey);
  return opensOn && `Publishing opens on ${formatJourneyDate(opensOn)}`;
}

function PublishButton({ journey, opensOn, draftState, onPublish }: Pick<EditorTopBarProps, 'journey' | 'opensOn' | 'draftState' | 'onPublish'>) {
  const button = (
    <Button onClick={onPublish}>
      <Send aria-hidden="true" />
      <span className="@max-[20em]:sr-only">Publish</span>
    </Button>
  );
  const reason = publishUnavailableReason({ journey, opensOn, draftState });
  if (!reason) return button;
  return <DisabledActionHint reason={reason}>{button}</DisabledActionHint>;
}

function DiscardDialog({ open, onOpenChange, version, onDiscard }: { open: boolean; onOpenChange: (open: boolean) => void; version: ProgramVersion; onDiscard: () => WriteResult }) {
  const [failed, setFailed] = useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={next => {
        setFailed(false);
        onOpenChange(next);
      }}
      title="Discard this draft?"
      description={discardDescription(version)}
      confirmLabel="Discard draft"
      cancelLabel="Keep editing"
      tone="destructive"
      onConfirm={() => setFailed(onDiscard() === 'failed')}
    >
      {failed && <Alert>The draft wasn’t discarded and nothing changed. Try again.</Alert>}
    </ConfirmDialog>
  );
}

export function EditorTopBar({
  journey,
  version,
  basedOn,
  railToggle,
  library,
  placeTitle,
  placeHeading,
  onOverview,
  onOpenFinding,
  onPreview,
  onPublish,
  onDiscard,
  opensOn,
  draftState,
  problems,
  warnings,
  saving,
}: EditorTopBarProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileReturnFocus = useRef<HTMLElement | null>(null);
  const draftActions = useRef<HTMLSpanElement>(null);
  const showsPreviewInMenu = !useMediaQuery(SM_QUERY);
  const showsToolbarIcons = useIsDesktop();
  const name = journeyClientName(journey);
  const libraryAction: RowMenuAction[] = library ? [{ name: 'library', label: library.open ? 'Close exercise library' : 'Exercise library', icon: Library, onSelect: library.onToggle }] : [];
  const previewAction: RowMenuAction[] = showsPreviewInMenu ? [{ name: 'preview', label: 'Preview as client', icon: Eye, onSelect: onPreview }] : [];
  const profileAction: RowMenuAction = {
    name: 'profile',
    label: 'Client profile',
    icon: UserRound,
    onSelect: () => {
      profileReturnFocus.current = draftActions.current?.querySelector('button') ?? null;
      setProfileOpen(true);
    },
  };
  const narrowScreenActions: RowMenuAction[] = showsToolbarIcons ? [] : [...libraryAction, ...previewAction, profileAction];

  return (
    <>
      <header
        className={cn('@container flex min-h-16 shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border bg-card px-3 py-2 lg:gap-x-4 lg:px-6', {
          'max-h-[50dvh] overflow-y-auto': saving.failing,
        })}
      >
        <nav aria-label="Editor" className="flex shrink-0 items-center gap-4">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to={clientDetailPathForJourney(journey)} aria-label={`Back to ${name}`}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
          {railToggle}
        </nav>
        <div className="grid min-w-0 flex-1 gap-0.5 max-sm:order-last max-sm:basis-full max-sm:px-1">
          <p className="text-xs break-words text-text-secondary">
            {[draftLine(name, version, basedOn), DRAFT_STATE_NOTE[draftState]].filter(Boolean).join(' · ')}
            <SaveStateNote state={saving.state} />
          </p>
          <Place placeTitle={placeTitle} placeHeading={placeHeading} onOverview={onOverview} />
        </div>
        <ClientProfilePopover
          journey={journey}
          open={profileOpen}
          onOpenChange={open => {
            if (open) profileReturnFocus.current = null;
            setProfileOpen(open);
          }}
          returnFocus={profileReturnFocus}
        >
          <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-4 sm:flex-wrap">
            {(problems.length > 0 || warnings.length > 0) && <ChecksButton problems={problems} warnings={warnings} onOpenFinding={onOpenFinding} draftState={draftState} />}
            {showsToolbarIcons && <ClientProfileTrigger />}
            {showsToolbarIcons && library && (
              <Button onClick={library.onToggle} variant="ghost" size="icon-sm" aria-label="Exercise library" aria-pressed={library.open}>
                <Library size={20} />
              </Button>
            )}
            <Button variant="outline" aria-label="Preview as client" onClick={onPreview} className="max-sm:hidden">
              <Eye aria-hidden="true" />
              <span className="hidden lg:inline">Preview as client</span>
            </Button>
            <PublishButton journey={journey} opensOn={opensOn} draftState={draftState} onPublish={onPublish} />
            <span ref={draftActions} className="contents">
              <RowActionsMenu
                label="Draft actions"
                parityRoot="DraftActionsMenu"
                actions={[
                  ...narrowScreenActions,
                  {
                    name: 'discard',
                    label: 'Discard draft',
                    icon: Trash2,
                    tone: 'destructive',
                    onSelect: () => setConfirmingDiscard(true),
                  },
                ]}
              />
            </span>
          </div>
        </ClientProfilePopover>
        {saving.failing && <FailedSaveAlert retrying={saving.retrying} retryNow={saving.retryNow} placeHeading={placeHeading} />}
      </header>
      <DiscardDialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard} version={version} onDiscard={onDiscard} />
    </>
  );
}
