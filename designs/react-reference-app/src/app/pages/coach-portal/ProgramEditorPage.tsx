import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowRight, ListTree, Pencil } from 'lucide-react';
import { DeadEndPanel } from '../../components/ErrorPage';
import { PortalBackLink } from '../../components/PortalBackLink';
import { ExerciseLibraryLink } from '../../components/coach-portal/ExerciseLibraryLink';
import { AddBlockDialog } from '../../components/coach-portal/program/AddBlockDialog';
import { ChangedElsewhereDialog } from '../../components/coach-portal/program/ChangedElsewhereDialog';
import { ClientPreviewDialog } from '../../components/coach-portal/program/ClientPreviewDialog';
import { EditorSectionContent, type OpenBlock } from '../../components/coach-portal/program/EditorSectionContent';
import { EDITOR_MODE_LABELS, sectionHash, sectionTitle, type EditorSection } from '../../components/coach-portal/program/editorSection';
import { EditorAnnouncerProvider, useEditorAnnouncer } from '../../components/coach-portal/program/editorAnnouncer';
import { EditorShell } from '../../components/coach-portal/program/EditorShell';
import { EditorSkeleton } from '../../components/coach-portal/program/EditorSkeleton';
import { EditorTopBar } from '../../components/coach-portal/program/EditorTopBar';
import { LeaveWarning } from '../../components/coach-portal/program/LeaveWarning';
import { LibraryPanel } from '../../components/coach-portal/program/LibraryPanel';
import { ProgramOutline } from '../../components/coach-portal/program/ProgramOutline';
import { PlaceHeadingContext } from '../../components/coach-portal/program/placeHeading';
import { ProgramSetupNotReady, ProgramSetupSheet, ProgramSetupSkeleton } from '../../components/coach-portal/program/ProgramSetupSheet';
import type { FindingTarget } from '../../components/coach-portal/program/ProgramFindings';
import { PublishDialog } from '../../components/coach-portal/program/PublishDialog';
import { useEditorState } from '../../components/coach-portal/program/useEditorState';
import { libraryPurpose, useLibraryPanel } from '../../components/coach-portal/program/useLibraryPanel';
import { useCoachPortalScope } from '../../components/coach-portal/useCoachPortalScope';
import { ExerciseDetailProvider } from '../../components/program-view/ExerciseDetail';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { ProgramLoadState } from '../../components/program-view/ProgramLoadState';
import { useProgramLookup } from '../../components/program-view/useProgramLookup';
import { Button } from '../../components/ui/button';
import { Sheet, SheetTrigger } from '../../components/ui/sheet';
import { Tabs, TabsContent } from '../../components/ui/tabs';
import { SkipLink } from '../../components/ui/skip-link';
import { useIsDesktop } from '../../components/ui/use-desktop';
import { useTraining, type Exercise } from '../../context/TrainingContext';
import { BLOCK_TYPE_LABELS, currentVersion, draftOf, type Block, type BlockType, type Program, type ProgramVersion } from '../../domain/program';
import { coachingHasEnded, isBeforeStage, type ClientJourney } from '../../domain/journey';
import { blockWithLibraryPick } from '../../domain/programEditing';
import { plannedId, plannedSessions } from '../../domain/weekEditing';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import { journeyClientName } from '../../utils/journeyLabels';

const EDITOR_ID = 'editor';
const SETUP_PAGE_CLASS = 'min-h-screen bg-surface-page px-4 py-10 sm:px-6 lg:py-16';

function openSessionOf(block: Block, chosen: string | undefined): string | undefined {
  const ids = plannedSessions(block).map(plannedId);
  return chosen && ids.includes(chosen) ? chosen : ids[0];
}

type EditorProps = { journey: ClientJourney; program: Program; draft: ProgramVersion; programPath: string };

function ProgramEditor(props: EditorProps) {
  const { journey, programPath } = props;
  const editor = useEditorState(props);
  const { program, draft, saving } = editor;
  const [railOpen, setRailOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const panel = useLibraryPanel();
  const announce = useEditorAnnouncer();
  const { exercises } = useTraining();
  const [addingBlock, setAddingBlock] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [openSessions, setOpenSessions] = useState<Record<string, string>>({});
  const { content } = draft;
  const { today, ruleContext } = editor;
  const { selected } = editor;
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
  const placeKey = `${editor.mode}${sectionHash(selected)}`;
  const placeTitle = sectionTitle(selected, content.plan.blocks);
  const blockIndex = editor.mode === 'structure' && selected.kind === 'block' ? content.plan.blocks.findIndex(block => block.id === selected.blockId) : -1;
  const block = blockIndex >= 0 ? content.plan.blocks[blockIndex] : undefined;
  const openSessionId = block && openSessionOf(block, openSessions[block.id]);
  const openBlock: OpenBlock | undefined = block && {
    block,
    index: blockIndex,
    openSessionId,
    onOpenSession: sessionId => setOpenSessions(current => ({ ...current, [block.id]: sessionId })),
    onOpenLibrary: panel.openFor,
    libraryTarget: panel.panelTarget?.target ?? null,
  };
  useDocumentTitle(`${EDITOR_MODE_LABELS[editor.mode]} · ${placeTitle} · ${journeyClientName(journey)}`);

  function addFromLibrary(exercise: Exercise) {
    if (!block) return;
    const pick = { exercise, target: panel.panelTarget?.target ?? null, openSessionId };
    editor.replaceBlock(blockWithLibraryPick(block, pick, { blockType: block.type, library: exercises, equipment: editor.equipment }));
    panel.finishTarget();
  }

  function addBlock(type: BlockType, weeks: number) {
    blockAdded.current = true;
    setAddingBlock(false);
    editor.addBlock(type, weeks);
    announce(`${BLOCK_TYPE_LABELS[type]} block added as block ${content.plan.blocks.length + 1}`);
  }

  function hideRail() {
    setRailOpen(false);
  }

  function startAddingBlock() {
    hideRail();
    blockAdded.current = false;
    setAddingBlock(true);
  }

  useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [placeKey]);

  function openFinding({ blockId, sessionId }: FindingTarget) {
    if (sessionId) setOpenSessions(current => ({ ...current, [blockId]: sessionId }));
    editor.openInStructure({ kind: 'block', blockId });
  }

  function selectFromRail(section: EditorSection) {
    editor.select(section);
    hideRail();
  }

  return (
    <Sheet open={railOpen && !isDesktop} onOpenChange={setRailOpen}>
      <PlaceHeadingContext.Provider value={placeHeading}>
        <EditorShell data-parity-root="ProgramEditorPage">
        <SkipLink targetId={EDITOR_ID}>Skip to editor</SkipLink>
        <EditorTopBar
          journey={journey}
          version={draft}
          basedOn={currentVersion(program)}
          placeTitle={placeTitle}
          placeHeading={placeHeading}
          onOverview={selected.kind === 'plan' ? null : () => editor.select({ kind: 'plan' })}
          onOpenFinding={openFinding}
          library={block ? { open: panel.visible, onToggle: panel.toggle } : null}
          railToggle={
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Program sections">
                <ListTree size={20} />
              </Button>
            </SheetTrigger>
          }
          onPreview={() => setPreviewing(true)}
          onPublish={() => setPublishing(true)}
          onDiscard={editor.discard}
          opensOn={editor.opensOn}
          draftState={editor.draftState}
          problems={editor.problems}
          warnings={editor.warnings}
          saving={saving}
        />
        <Tabs value={editor.mode} activationMode="manual" variant="segmented" className="min-h-0 flex-1 flex-row gap-0">
          <ProgramOutline
            mode={editor.mode}
            version={draft}
            language={program.language}
            dayOne={ruleContext.dayOne}
            today={today}
            selected={selected}
            locationOf={editor.locationOf}
            onSelect={selectFromRail}
            onSwitchMode={hideRail}
            onAddBlock={startAddingBlock}
          />
          <main
            ref={main}
            id={EDITOR_ID}
            tabIndex={-1}
            aria-label="Program editor"
            className="min-w-0 flex-1 overflow-y-auto bg-surface-page p-4 [overflow-anchor:none] focus:outline-none lg:p-6"
          >
            <TabsContent value={editor.mode} tabIndex={-1} labelWithoutTabs={EDITOR_MODE_LABELS[editor.mode]} className="mx-auto w-full max-w-5xl flex-none">
              <EditorSectionContent
                section={selected}
                journey={journey}
                program={program}
                draft={draft}
                editor={editor}
                openBlock={openBlock}
                onAddBlock={startAddingBlock}
              />
            </TabsContent>
          </main>
          {block && panel.visible && (
            <LibraryPanel
              presentation={panel.isWide ? 'pane' : 'drawer'}
              purpose={libraryPurpose(block, panel.panelTarget, exercises)}
              library={exercises}
              equipment={editor.equipment}
              searchRef={panel.search}
              onAdd={addFromLibrary}
              onClose={panel.close}
            />
          )}
        </Tabs>
        <PublishDialog
          open={publishing}
          onOpenChange={setPublishing}
          version={draft}
          problems={editor.problems}
          warnings={editor.warnings}
          onPublish={editor.publish}
          onOpenFinding={openFinding}
        />
        <ClientPreviewDialog
          open={previewing}
          onOpenChange={setPreviewing}
          view={journeyProgramView({ journey, program, version: draft, exercises, today: new Date(), fallbackDayOne: new Date() })}
        />
        <AddBlockDialog
          open={addingBlock}
          onOpenChange={setAddingBlock}
          lastBlock={content.plan.blocks.at(-1)}
          returnFocusTo={focusAfterAdding}
          onAdd={addBlock}
        />
        <ChangedElsewhereDialog open={saving.state === 'changed-elsewhere'} onReload={saving.reload} returnFocusTo={placeHeading} />
        <LeaveWarning draftPath={`${programPath}/draft`} saving={saving} />
        </EditorShell>
      </PlaceHeadingContext.Provider>
    </Sheet>
  );
}

function SetupPage({ journey, draftPath }: { journey: ClientJourney; draftPath: string }) {
  const navigate = useNavigate();
  return (
    <main className={SETUP_PAGE_CLASS}>
      {isBeforeStage(journey.stage, 'approved') ? (
        <ProgramSetupNotReady journey={journey} />
      ) : (
        <ProgramSetupSheet journey={journey} onCreated={() => navigate(draftPath)} />
      )}
    </main>
  );
}

type ClientBack = { path: string; name: string };

/** A state of the editor without a program to edit: a way back to the client above the page's one panel. */
function EditorDeadEnd({ client, children }: { client: ClientBack; children: ReactNode }) {
  return (
    <main aria-label="Program editor" className={SETUP_PAGE_CLASS}>
      <div className="mx-auto w-full max-w-xl">
        <PortalBackLink to={client.path} navigationLabel="Back to the client">
          Back to {client.name}
        </PortalBackLink>
        {children}
      </div>
    </main>
  );
}

function NoProgramYet({ setupPath, client }: { setupPath: string; client: ClientBack }) {
  return (
    <EditorDeadEnd client={client}>
      <DeadEndPanel
        icon={Pencil}
        title="No program yet"
        announcement="none"
        description="There is no draft to edit yet. Set up the program to start its first version."
        action={
          <Button asChild size="md">
            <Link to={setupPath}>
              Set up program
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />
    </EditorDeadEnd>
  );
}

export function ProgramEditorPage() {
  useCoachPortalScope();
  const { id = '' } = useParams();
  const journey = useJourneyClient(id);
  const lookup = useProgramLookup(journey?.callId ?? null);
  const isSetup = useLocation().pathname.endsWith('/new');
  const programPath = `/coach/clients/${id}/program`;
  const draftPath = `${programPath}/draft`;
  const client: ClientBack = { path: `/coach/clients/${id}`, name: journey ? journeyClientName(journey) : 'the client' };

  if (lookup.status === 'pending' && lookup.load === 'loading') {
    return isSetup ? (
      <main className={SETUP_PAGE_CLASS}>
        <ProgramSetupSkeleton />
      </main>
    ) : (
      <EditorSkeleton clientPath={client.path} clientName={client.name} />
    );
  }
  if (lookup.status === 'pending') {
    return (
      <EditorDeadEnd client={client}>
        <ProgramLoadState load={lookup.load} onRetry={lookup.retry} headingLevel="h1" />
      </EditorDeadEnd>
    );
  }
  if (!journey) return <Navigate to="/coach/clients" replace />;
  const program = lookup.status === 'found' ? lookup.program : undefined;
  if (isSetup && program) return <Navigate to={draftPath} replace />;
  if (isSetup && coachingHasEnded(journey, new Date())) return <Navigate to={client.path} replace />;
  if (isSetup) return <SetupPage journey={journey} draftPath={draftPath} />;
  if (!program) return <NoProgramYet setupPath={`${programPath}/new`} client={client} />;
  const draft = draftOf(program);
  if (!draft) return <Navigate to={programPath} replace />;

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <EditorAnnouncerProvider>
        <ExerciseDetailProvider footer={exercise => <ExerciseLibraryLink exercise={exercise} />}>
          <ProgramEditor journey={journey} program={program} draft={draft} programPath={programPath} />
        </ExerciseDetailProvider>
      </EditorAnnouncerProvider>
    </DndProvider>
  );
}
