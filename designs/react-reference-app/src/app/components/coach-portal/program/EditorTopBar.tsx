import { useId, useRef, useState, type ReactNode, type Ref } from 'react';
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
import { Alert } from '../../ui/alert';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { useIsDesktop, useMediaQuery } from '../../ui/use-desktop';
import { cn } from '../../ui/utils';
import { ClientProfilePopover, ClientProfileTrigger } from './ClientProfilePopover';
import { ProgramFindings, type FindingTarget } from './ProgramFindings';
import type { WriteResult } from './useEditorState';

type EditorTopBarProps = {
  journey: ClientJourney;
  version: ProgramVersion;
  basedOn: ProgramVersion | undefined;
  railToggle: ReactNode;
  library: { open: boolean; onToggle: () => void } | null;
  placeTitle: string;
  placeHeading: Ref<HTMLHeadingElement>;
  onOverview: (() => void) | null;
  onOpenFinding: (target: FindingTarget) => void;
  onPreview: () => void;
  onPublish: () => void;
  onDiscard: () => WriteResult;
  opensOn: Date | null;
  problems: readonly RuleFinding<BlockingCode>[];
  warnings: readonly RuleFinding<WarningCode>[];
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

type ChecksButtonProps = Pick<EditorTopBarProps, 'problems' | 'warnings' | 'onOpenFinding'>;

function ChecksButton({ problems, warnings, onOpenFinding }: ChecksButtonProps) {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const blocked = problems.length > 0;
  const label = blocked ? `${counted(problems.length, 'problem')} to fix before publishing` : `${counted(warnings.length, 'thing')} worth a look`;
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

function PublishButton({ opensOn, onPublish }: Pick<EditorTopBarProps, 'opensOn' | 'onPublish'>) {
  const button = (
    <Button onClick={onPublish}>
      <Send aria-hidden="true" />
      <span className="@max-[20em]:sr-only">Publish</span>
    </Button>
  );
  if (!opensOn) return button;
  return <DisabledActionHint reason={`Publishing opens on ${formatJourneyDate(opensOn)}`}>{button}</DisabledActionHint>;
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
  problems,
  warnings,
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
      <header className="@container flex min-h-16 shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border bg-card px-3 py-2 lg:gap-x-4 lg:px-6">
        <nav aria-label="Editor" className="flex shrink-0 items-center gap-4">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to={clientDetailPathForJourney(journey)} aria-label={`Back to ${name}`}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
          {railToggle}
        </nav>
        <div className="grid min-w-0 flex-1 gap-0.5 max-sm:order-last max-sm:basis-full max-sm:px-1">
          <p className="text-xs break-words text-text-secondary">{draftLine(name, version, basedOn)}</p>
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
            {(problems.length > 0 || warnings.length > 0) && <ChecksButton problems={problems} warnings={warnings} onOpenFinding={onOpenFinding} />}
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
            <PublishButton opensOn={opensOn} onPublish={onPublish} />
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
      </header>
      <DiscardDialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard} version={version} onDiscard={onDiscard} />
    </>
  );
}
