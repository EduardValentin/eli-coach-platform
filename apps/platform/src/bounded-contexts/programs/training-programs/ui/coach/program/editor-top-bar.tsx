import {
  cn,
  useIsDesktopViewport,
  WIDGET_TITLE_CLASS,
} from "~/shared/design-system/lib";
import {
  Alert,
  AlertAction,
  Button,
  buttonVariants,
  RowActionsMenu,
  type RowMenuAction,
} from "~/shared/design-system/primitives";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Library,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router";

import { coachClientPath } from "~/bounded-contexts/clients/public/paths";

import type { ProgramDraftClientProfile } from "~/bounded-contexts/programs/training-programs/public/program-draft";

import {
  ClientProfilePopover,
  ClientProfileTrigger,
} from "./client-profile-popover";
import type { DraftSaving, SaveState } from "./use-autosaved-draft";

export type BuilderClient = {
  clientId: string;
  firstName: string;
  lastName: string;
};

type EditorTopBarProps = {
  client: BuilderClient;
  versionNumber: number;
  coachingEnded: boolean;
  clientProfile: ProgramDraftClientProfile | null;
  library: { open: boolean; onToggle: () => void } | null;
  railToggle: ReactNode;
  placeTitle: string;
  placeHeading: RefObject<HTMLHeadingElement | null>;
  onOverview: (() => void) | null;
  saving: DraftSaving;
};

const PLACE_TITLE_CLASS = cn(WIDGET_TITLE_CLASS, "break-words outline-none");

const SAVE_STATE_LABEL: Record<SaveState, string | null> = {
  unchanged: null,
  saving: "Saving…",
  saved: "Saved",
  "not-saved": "Not saved",
  "changed-elsewhere": "Changed elsewhere",
};

const NOT_SAVED_STATES: readonly SaveState[] = [
  "not-saved",
  "changed-elsewhere",
];

export function clientName({ firstName, lastName }: BuilderClient): string {
  return `${firstName} ${lastName}`.trim();
}

function draftLine({
  client,
  versionNumber,
  coachingEnded,
}: Pick<EditorTopBarProps, "client" | "versionNumber" | "coachingEnded">) {
  return [
    `${clientName(client)} · v${versionNumber} draft`,
    ...(coachingEnded ? ["coaching ended"] : []),
  ].join(" · ");
}

function SaveStateNote({ state }: { state: SaveState }) {
  const label = SAVE_STATE_LABEL[state];
  if (!label) return null;
  const notSaved = NOT_SAVED_STATES.includes(state);

  return (
    <>
      {" "}
      <span className="whitespace-nowrap" data-parity="save-state">
        {"· "}
        <span
          className={cn({
            "inline-flex items-center gap-1 align-top font-medium text-feedback-danger":
              notSaved,
          })}
        >
          {notSaved && <AlertCircle aria-hidden="true" size={12} />}
          {label}
        </span>
      </span>
    </>
  );
}

function focusIsLost(): boolean {
  return (
    document.activeElement === null || document.activeElement === document.body
  );
}

function useFocusMovedToHeadingOnClose(
  placeHeading: RefObject<HTMLHeadingElement | null>,
) {
  useEffect(
    () => () => {
      if (focusIsLost()) placeHeading.current?.focus();
    },
    [placeHeading],
  );
}

type FailedSaveAlertProps = Pick<DraftSaving, "retrying" | "retryNow"> & {
  placeHeading: RefObject<HTMLHeadingElement | null>;
};

function FailedSaveAlert({
  retrying,
  retryNow,
  placeHeading,
}: FailedSaveAlertProps) {
  useFocusMovedToHeadingOnClose(placeHeading);

  return (
    <Alert
      action={
        <AlertAction
          aria-disabled={retrying || undefined}
          className="aria-disabled:opacity-100"
          onClick={retrying ? undefined : retryNow}
        >
          {retrying ? "Trying again…" : "Try again now"}
        </AlertAction>
      }
      className="order-last basis-full"
      data-parity="failed-save"
    >
      Your latest changes aren’t saved yet. They’re still here, and saving keeps
      trying.
    </Alert>
  );
}

type PlaceProps = Pick<
  EditorTopBarProps,
  "placeTitle" | "placeHeading" | "onOverview"
>;

function Place({ placeTitle, placeHeading, onOverview }: PlaceProps) {
  const heading = (
    <h1 className={PLACE_TITLE_CLASS} ref={placeHeading} tabIndex={-1}>
      {placeTitle}
    </h1>
  );
  if (!onOverview) return heading;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1">
        <li className="shrink-0">
          <button
            className={cn(
              WIDGET_TITLE_CLASS,
              "relative hit-area rounded-tile text-text-secondary transition-colors hover:text-text-primary",
            )}
            onClick={onOverview}
            type="button"
          >
            Overview
          </button>
        </li>
        <li aria-current="page" className="flex min-w-0 items-center gap-1">
          <ChevronRight
            aria-hidden="true"
            className="shrink-0 text-text-secondary"
            size={16}
          />
          {heading}
        </li>
      </ol>
    </nav>
  );
}

export function EditorTopBar({
  client,
  versionNumber,
  coachingEnded,
  clientProfile,
  library,
  railToggle,
  placeTitle,
  placeHeading,
  onOverview,
  saving,
}: EditorTopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileReturnFocus = useRef<HTMLElement | null>(null);
  const draftActions = useRef<HTMLSpanElement>(null);
  const showsToolbarIcons = useIsDesktopViewport();
  const libraryAction: RowMenuAction[] = library
    ? [
        {
          name: "library",
          label: library.open ? "Close exercise library" : "Exercise library",
          icon: Library,
          onSelect: library.onToggle,
        },
      ]
    : [];
  const profileAction: RowMenuAction = {
    name: "profile",
    label: "Client profile",
    icon: UserRound,
    onSelect: () => {
      profileReturnFocus.current =
        draftActions.current?.querySelector("button") ?? null;
      setProfileOpen(true);
    },
  };
  const narrowScreenActions: RowMenuAction[] = showsToolbarIcons
    ? []
    : [...libraryAction, profileAction];

  return (
    <header
      className={cn(
        "@container flex min-h-16 shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border-default bg-surface-base px-3 py-2 lg:gap-x-4 lg:px-6",
        { "max-h-[50dvh] overflow-y-auto": saving.failing },
      )}
      data-parity-root="EditorTopBar"
    >
      <nav aria-label="Editor" className="flex shrink-0 items-center gap-4">
        <Link
          aria-label={`Back to ${clientName(client)}`}
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          to={coachClientPath(client.clientId)}
        >
          <ArrowLeft size={20} />
        </Link>
        {railToggle}
      </nav>
      <div className="grid min-w-0 flex-1 gap-0.5 max-sm:order-last max-sm:basis-full max-sm:px-1">
        <p
          className="text-xs break-words text-text-secondary"
          data-parity="draft-line"
        >
          {draftLine({ client, versionNumber, coachingEnded })}
          <SaveStateNote state={saving.state} />
        </p>
        <Place
          onOverview={onOverview}
          placeHeading={placeHeading}
          placeTitle={placeTitle}
        />
      </div>
      <ClientProfilePopover
        name={clientName(client)}
        onOpenChange={(open) => {
          if (open) profileReturnFocus.current = null;
          setProfileOpen(open);
        }}
        open={profileOpen}
        profile={clientProfile}
        returnFocus={profileReturnFocus}
      >
        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-4 sm:flex-wrap">
          {showsToolbarIcons && <ClientProfileTrigger />}
          {showsToolbarIcons && library && (
            <Button
              aria-label="Exercise library"
              aria-pressed={library.open}
              onClick={library.onToggle}
              size="icon-sm"
              variant="ghost"
            >
              <Library size={20} />
            </Button>
          )}
          <span className="contents" ref={draftActions}>
            <RowActionsMenu
              actions={narrowScreenActions}
              label="Draft actions"
              parityRoot="DraftActionsMenu"
            />
          </span>
        </div>
      </ClientProfilePopover>
      {saving.failing && (
        <FailedSaveAlert
          placeHeading={placeHeading}
          retrying={saving.retrying}
          retryNow={saving.retryNow}
        />
      )}
    </header>
  );
}
