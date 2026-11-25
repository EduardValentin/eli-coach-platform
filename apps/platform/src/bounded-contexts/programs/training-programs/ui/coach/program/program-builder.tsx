import { cn, useIsDesktopViewport } from "~/shared/design-system/lib";
import { DeadEndPanel } from "~/shared/design-system/layout";
import { Sheet, SheetTrigger } from "~/shared/design-system/overlays";
import { PortalBackLink } from "~/shared/design-system/portal";
import { buttonVariants, SkipLink } from "~/shared/design-system/primitives";
import { ArrowRight, ListTree, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { Link } from "react-router";

import { coachClientPath } from "~/bounded-contexts/clients/public/paths";
import { exerciseEditorPath } from "~/bounded-contexts/programs/exercise-library/public/paths";
import {
  programBuilderPath,
  programSetupPath,
} from "~/bounded-contexts/programs/training-programs/public/paths";
import {
  BLOCK_TYPE_LABELS,
  LibraryPicks,
  type BlockType,
  type LibraryExercise,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import type { ProgramDraftView } from "~/bounded-contexts/programs/training-programs/public/program-draft";
import { ExerciseDetailProvider } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-detail";

import { newBuilderId } from "./builder-editing";
import { AddBlockDialog } from "./add-block-dialog";
import { ChangedElsewhereDialog } from "./changed-elsewhere-dialog";
import {
  EditorAnnouncerProvider,
  useEditorAnnouncer,
} from "./editor-announcer";
import { EditorSectionContent, type OpenBlock } from "./editor-section-content";
import {
  sectionAnchorId,
  sectionFromHash,
  sectionHash,
  sectionTitle,
} from "./editor-section";
import { clientName, EditorTopBar, type BuilderClient } from "./editor-top-bar";
import { LeaveWarning } from "./leave-warning";
import { LibraryPanel } from "./library-panel";
import { PlaceHeadingContext } from "./place-heading";
import { openSessionOf } from "./block-workspace";
import { ProgramOutline } from "./program-outline";
import { useBuilderState, type DraftView } from "./use-builder-state";
import { useHydrated } from "./use-hydrated";
import { libraryPurpose, useLibraryPanel } from "./use-library-panel";

const EDITOR_ID = "editor";

// The server cannot see which block the address names, so the builder stays
// hidden while a block's anchor is the address's target and hydration has not
// opened that block yet.
const HIDDEN_UNTIL_BLOCK_OPENS_CLASS =
  "[&:not([data-hydrated]):has(:target)]:invisible";
const DEAD_END_PAGE_CLASS =
  "min-h-screen bg-surface-page px-4 py-10 sm:px-6 lg:py-16";

export function builderDocumentTitle(
  placeTitle: string,
  client: BuilderClient,
): string {
  return `${placeTitle} · ${clientName(client)} | Evoa`;
}

export function builderPlaceTitle(view: ProgramDraftView, hash: string) {
  if (view.state === "no-program") return "No program yet";

  const { blocks } = view.content.plan;

  return sectionTitle(sectionFromHash(hash, blocks), blocks);
}

function ExerciseLibraryLink({ exercise }: { exercise: LibraryExercise }) {
  return (
    <div className="flex justify-end">
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        to={exerciseEditorPath(exercise.id)}
      >
        <Pencil aria-hidden="true" />
        Edit in exercise library
      </Link>
    </div>
  );
}

function ProgramBuilder({ view }: { view: DraftView }) {
  const builder = useBuilderState(view);
  const { draft, saving, selected } = builder;
  const panel = useLibraryPanel();
  const [openSessions, setOpenSessions] = useState<Record<string, string>>({});
  const [railOpen, setRailOpen] = useState(false);
  const isDesktop = useIsDesktopViewport();
  const [addingBlock, setAddingBlock] = useState(false);
  const announce = useEditorAnnouncer();
  const main = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  const placeHeading = useRef<HTMLHeadingElement>(null);
  const focusHeadingOnClose = useRef(false);
  // Read as the dialog closes: the place heading remounts once the new block opens.
  const addDialogReturnFocus = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return focusHeadingOnClose.current ? placeHeading.current : null;
      },
    }),
    [],
  );
  const { blocks } = draft.content.plan;
  const placeKey = sectionHash(selected);
  const placeTitle = sectionTitle(selected, blocks);
  const block =
    selected.kind === "block"
      ? blocks.find((other) => other.id === selected.blockId)
      : undefined;
  const openSessionId = block && openSessionOf(block, openSessions[block.id]);
  const openBlock: OpenBlock = {
    openSessionId,
    onOpenSession: (sessionId) =>
      block &&
      setOpenSessions((current) => ({ ...current, [block.id]: sessionId })),
    onOpenLibrary: panel.openFor,
    libraryTarget: panel.panelTarget?.target ?? null,
  };

  useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [placeKey]);

  useEffect(() => {
    document.title = builderDocumentTitle(placeTitle, view.client);
  }, [placeTitle, view.client]);

  function addFromLibrary(exercise: LibraryExercise) {
    if (!block) return;
    const picks = new LibraryPicks({
      newId: newBuilderId,
      libraryExercises: builder.libraryExercises,
      libraryEquipment: builder.libraryEquipment,
    });
    builder.replaceBlock(
      picks.blockWithLibraryPick(block, {
        exercise,
        target: panel.panelTarget?.target ?? null,
        openSessionId,
      }),
    );
    panel.finishTarget();
  }

  function addBlock(type: BlockType, weeks: number) {
    focusHeadingOnClose.current = true;
    setAddingBlock(false);
    builder.addBlock(type, weeks);
    announce(
      `${BLOCK_TYPE_LABELS[type]} block added as block ${blocks.length + 1}`,
    );
  }

  function startAddingBlock() {
    setRailOpen(false);
    focusHeadingOnClose.current = false;
    setAddingBlock(true);
  }

  return (
    <Sheet onOpenChange={setRailOpen} open={railOpen && !isDesktop}>
      <PlaceHeadingContext.Provider value={placeHeading}>
        <div
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-surface-subtle",
            HIDDEN_UNTIL_BLOCK_OPENS_CLASS,
          )}
          data-hydrated={hydrated ? "" : undefined}
          data-parity-root="ProgramEditorPage"
        >
          {blocks.map((block) => (
            <span
              hidden
              id={sectionAnchorId({ kind: "block", blockId: block.id })}
              key={block.id}
            />
          ))}
          <SkipLink targetId={EDITOR_ID}>Skip to editor</SkipLink>
          <EditorTopBar
            client={view.client}
            clientProfile={view.clientProfile}
            coachingEnded={view.coachingEnded}
            library={
              block ? { open: panel.visible, onToggle: panel.toggle } : null
            }
            onOverview={
              selected.kind === "plan"
                ? null
                : () => builder.select({ kind: "plan" })
            }
            placeHeading={placeHeading}
            placeTitle={placeTitle}
            railToggle={
              <SheetTrigger
                aria-label="Program sections"
                className={cn(
                  buttonVariants({ size: "icon-sm", variant: "ghost" }),
                  "lg:hidden",
                )}
              >
                <ListTree size={20} />
              </SheetTrigger>
            }
            saving={saving}
            versionNumber={view.versionNumber}
          />
          <div className="flex min-h-0 flex-1 flex-row gap-0">
            <ProgramOutline
              blocks={blocks}
              onAddBlock={startAddingBlock}
              onSelect={(section) => {
                builder.select(section);
                setRailOpen(false);
              }}
              selected={selected}
            />
            <main
              aria-label="Program editor"
              className="min-w-0 flex-1 overflow-y-auto bg-surface-page p-4 [overflow-anchor:none] focus:outline-none lg:p-6"
              id={EDITOR_ID}
              ref={main}
              tabIndex={-1}
            >
              <div className="mx-auto w-full max-w-5xl flex-none">
                <EditorSectionContent
                  builder={builder}
                  onAddBlock={startAddingBlock}
                  openBlock={openBlock}
                />
              </div>
            </main>
            {block && panel.visible && (
              <LibraryPanel
                libraryEquipment={builder.libraryEquipment}
                libraryExercises={builder.libraryExercises}
                onAdd={addFromLibrary}
                onClose={panel.close}
                presentation={panel.isWide ? "pane" : "drawer"}
                purpose={libraryPurpose(
                  block,
                  panel.panelTarget,
                  builder.libraryExercises,
                )}
                searchRef={panel.search}
              />
            )}
          </div>
          <AddBlockDialog
            lastBlock={blocks.at(-1)}
            onAdd={addBlock}
            onOpenChange={setAddingBlock}
            open={addingBlock}
            returnFocusTo={addDialogReturnFocus}
          />
          <ChangedElsewhereDialog
            onReload={saving.reload}
            open={saving.state === "changed-elsewhere"}
            returnFocusTo={placeHeading}
          />
          <LeaveWarning
            builderPath={programBuilderPath(view.client.clientId)}
            saving={saving}
          />
        </div>
      </PlaceHeadingContext.Provider>
    </Sheet>
  );
}

type NoProgramView = Extract<ProgramDraftView, { state: "no-program" }>;

function NoProgramYet({ view }: { view: NoProgramView }) {
  const { client } = view;

  return (
    <main aria-label="Program editor" className={DEAD_END_PAGE_CLASS}>
      <div className="mx-auto w-full max-w-xl">
        <PortalBackLink
          navigationLabel="Back to the client"
          to={coachClientPath(client.clientId)}
        >
          Back to {clientName(client)}
        </PortalBackLink>
        <DeadEndPanel
          action={
            <Link
              className={buttonVariants({ size: "md" })}
              to={programSetupPath(client.clientId)}
            >
              Set up program
              <ArrowRight aria-hidden="true" />
            </Link>
          }
          announcement="none"
          description="There is no draft to edit yet. Set up the program to start its first version."
          icon={<Pencil aria-hidden="true" size={36} />}
          title="No program yet"
        />
      </div>
    </main>
  );
}

export function ProgramBuilderView({ view }: { view: ProgramDraftView }) {
  if (view.state === "no-program") return <NoProgramYet view={view} />;

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <EditorAnnouncerProvider>
        <ExerciseDetailProvider
          footer={(exercise) => <ExerciseLibraryLink exercise={exercise} />}
        >
          <ProgramBuilder view={view} />
        </ExerciseDetailProvider>
      </EditorAnnouncerProvider>
    </DndProvider>
  );
}
