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
import {
  programBuilderPath,
  programSetupPath,
} from "~/bounded-contexts/programs/training-programs/public/paths";
import {
  BLOCK_TYPE_LABELS,
  type BlockType,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import type { ProgramDraftView } from "~/bounded-contexts/programs/training-programs/public/program-draft";

import { AddBlockDialog } from "./add-block-dialog";
import { ChangedElsewhereDialog } from "./changed-elsewhere-dialog";
import {
  EditorAnnouncerProvider,
  useEditorAnnouncer,
} from "./editor-announcer";
import { EditorSectionContent } from "./editor-section-content";
import { sectionFromHash, sectionHash, sectionTitle } from "./editor-section";
import { clientName, EditorTopBar } from "./editor-top-bar";
import { LeaveWarning } from "./leave-warning";
import { ProgramOutline } from "./program-outline";
import { useBuilderState, type DraftView } from "./use-builder-state";

const EDITOR_ID = "editor";
const DEAD_END_PAGE_CLASS =
  "min-h-screen bg-surface-page px-4 py-10 sm:px-6 lg:py-16";

export function builderPlaceTitle(view: ProgramDraftView, hash: string) {
  if (view.state === "no-program") return "No program yet";

  const { blocks } = view.content.plan;

  return sectionTitle(sectionFromHash(hash, blocks), blocks);
}

function ProgramBuilder({ view }: { view: DraftView }) {
  const builder = useBuilderState(view);
  const { draft, saving, selected } = builder;
  const [railOpen, setRailOpen] = useState(false);
  const isDesktop = useIsDesktopViewport();
  const [addingBlock, setAddingBlock] = useState(false);
  const announce = useEditorAnnouncer();
  const main = useRef<HTMLElement>(null);
  const placeHeading = useRef<HTMLHeadingElement>(null);
  const blockAdded = useRef(false);
  const focusAfterAdding = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return blockAdded.current ? placeHeading.current : null;
      },
    }),
    [],
  );
  const { blocks } = draft.content.plan;
  const placeKey = sectionHash(selected);

  useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [placeKey]);

  function addBlock(type: BlockType, weeks: number) {
    blockAdded.current = true;
    setAddingBlock(false);
    builder.addBlock(type, weeks);
    announce(
      `${BLOCK_TYPE_LABELS[type]} block added as block ${blocks.length + 1}`,
    );
  }

  function startAddingBlock() {
    setRailOpen(false);
    blockAdded.current = false;
    setAddingBlock(true);
  }

  return (
    <Sheet onOpenChange={setRailOpen} open={railOpen && !isDesktop}>
      <div
        className="fixed inset-0 z-50 flex flex-col bg-surface-subtle"
        data-parity-root="ProgramEditorPage"
      >
        <SkipLink targetId={EDITOR_ID}>Skip to editor</SkipLink>
        <EditorTopBar
          client={view.client}
          coachingEnded={view.coachingEnded}
          onOverview={
            selected.kind === "plan"
              ? null
              : () => builder.select({ kind: "plan" })
          }
          placeHeading={placeHeading}
          placeTitle={sectionTitle(selected, blocks)}
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
              />
            </div>
          </main>
        </div>
        <AddBlockDialog
          lastBlock={blocks.at(-1)}
          onAdd={addBlock}
          onOpenChange={setAddingBlock}
          open={addingBlock}
          returnFocusTo={focusAfterAdding}
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
        <ProgramBuilder view={view} />
      </EditorAnnouncerProvider>
    </DndProvider>
  );
}
