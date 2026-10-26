import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Library, ListTree } from 'lucide-react';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { AddBlockDialog } from '../../components/coach-portal/program/AddBlockDialog';
import { ClientPreviewDialog } from '../../components/coach-portal/program/ClientPreviewDialog';
import { EditorSectionContent, type OpenBlock } from '../../components/coach-portal/program/EditorSectionContent';
import { sectionTitle, type EditorSection } from '../../components/coach-portal/program/editorSection';
import { EditorTopBar } from '../../components/coach-portal/program/EditorTopBar';
import { LibraryPanel } from '../../components/coach-portal/program/LibraryPanel';
import { ProgramOutlineDrawer } from '../../components/coach-portal/program/ProgramOutlineDrawer';
import { ProgramSetupSheet } from '../../components/coach-portal/program/ProgramSetupSheet';
import { PublishChecklist, type ChecklistStart } from '../../components/coach-portal/program/PublishChecklist';
import { useEditorState } from '../../components/coach-portal/program/useEditorState';
import { libraryPurpose, useLibraryPanel } from '../../components/coach-portal/program/useLibraryPanel';
import { useRailDrawer } from '../../components/coach-portal/program/useRailDrawer';
import { useCoachPortalScope } from '../../components/coach-portal/useCoachPortalScope';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { Button } from '../../components/ui/button';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining, type Exercise } from '../../context/TrainingContext';
import type { ClientJourney } from '../../domain/journey';
import { currentVersion, draftOf, type Block, type Program, type ProgramVersion } from '../../domain/program';
import { blockWithLibraryPick } from '../../domain/programEditing';
import { plannedId, plannedSessions } from '../../domain/weekEditing';
import { useJourneyClient } from '../../hooks/useJourneyClient';

function openSessionOf(block: Block, chosen: string | undefined): string | undefined {
  const ids = plannedSessions(block).map(plannedId);
  return chosen && ids.includes(chosen) ? chosen : ids[0];
}

type EditorProps = { journey: ClientJourney; program: Program; draft: ProgramVersion; programPath: string };

function ProgramEditor(props: EditorProps) {
  const { journey, program, draft } = props;
  const editor = useEditorState(props);
  const rail = useRailDrawer();
  const panel = useLibraryPanel();
  const { exercises } = useTraining();
  const [addingBlock, setAddingBlock] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistStart | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [openSessions, setOpenSessions] = useState<Record<string, string>>({});
  const { content } = draft;
  const { today, ruleContext } = editor;
  const { cycleMode } = program;
  const selected: EditorSection = editor.selected.kind === 'cycle' && cycleMode === 'general' ? { kind: 'header' } : editor.selected;
  const blockIndex = selected.kind === 'block' ? content.plan.blocks.findIndex(block => block.id === selected.blockId) : -1;
  const block = blockIndex >= 0 ? content.plan.blocks[blockIndex] : undefined;
  const openSessionId = block && openSessionOf(block, openSessions[block.id]);
  const openBlock: OpenBlock | undefined = block && {
    block,
    index: blockIndex,
    openSessionId,
    onOpenSession: sessionId => setOpenSessions(current => ({ ...current, [block.id]: sessionId })),
    onOpenLibrary: panel.openFor,
  };

  function addFromLibrary(exercise: Exercise) {
    if (!block) return;
    const pick = { exercise, target: panel.panelTarget?.target ?? null, openSessionId };
    editor.replaceBlock(blockWithLibraryPick(block, pick, { blockType: block.type, library: exercises, equipment: editor.equipment }));
    panel.finishTarget();
  }

  function requestPublish() {
    if (editor.problems.length > 0 || editor.warnings.length > 0) setChecklist('top');
    else editor.publish();
  }

  function selectFromRail(section: EditorSection) {
    editor.select(section);
    rail.hide();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle" data-parity-root="ProgramEditorPage">
      <EditorTopBar
        journey={journey}
        version={draft}
        basedOn={currentVersion(program)}
        currentTitle={selected.kind === 'plan' ? null : sectionTitle(selected, content.plan.blocks)}
        onOverview={() => editor.select({ kind: 'plan' })}
        onOpenWarnings={() => setChecklist('warnings')}
        libraryToggle={
          block && (
            <Button onClick={panel.toggle} variant="ghost" size="icon-sm" aria-label="Exercise library" aria-pressed={panel.visible}>
              <Library size={20} />
            </Button>
          )
        }
        railToggle={
          <Button ref={rail.openButton} onClick={rail.show} variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Program sections">
            <ListTree size={20} />
          </Button>
        }
        onPreview={() => setPreviewing(true)}
        onPublish={requestPublish}
        onDiscard={editor.discard}
        opensOn={editor.opensOn}
        warningsCount={editor.warnings.length}
      />
      <div className="flex min-h-0 flex-1">
        <ProgramOutlineDrawer
          rail={rail}
          content={content}
          cycleMode={cycleMode}
          dayOne={ruleContext.dayOne}
          today={today}
          selected={selected}
          onSelect={selectFromRail}
          onAddBlock={() => {
            rail.hide();
            setAddingBlock(true);
          }}
        />
        <main aria-label="Program editor" className="min-w-0 flex-1 overflow-y-auto bg-surface-page p-4 [overflow-anchor:none] lg:p-6">
          <div className="mx-auto w-full max-w-5xl">
            <EditorSectionContent section={selected} journey={journey} program={program} draft={draft} editor={editor} openBlock={openBlock} />
          </div>
        </main>
        {block && panel.visible && (
          <LibraryPanel
            presentation={panel.isWide ? 'pane' : 'drawer'}
            purpose={libraryPurpose(block, panel.panelTarget, exercises)}
            library={exercises}
            equipment={editor.equipment}
            asideRef={panel.aside}
            searchRef={panel.search}
            onAdd={addFromLibrary}
            onDismissPurpose={panel.dismissTarget}
            onClose={panel.close}
          />
        )}
      </div>
      <PublishChecklist
        open={checklist !== null}
        onOpenChange={open => {
          if (!open) setChecklist(null);
        }}
        startAt={checklist ?? 'top'}
        problems={editor.problems}
        warnings={editor.warnings}
        onPublish={editor.publish}
        onOpenBlock={blockId => editor.select({ kind: 'block', blockId })}
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
        onAdd={(type, weeks) => {
          setAddingBlock(false);
          editor.addBlock(type, weeks);
        }}
      />
    </div>
  );
}

export function ProgramEditorPage() {
  useCoachPortalScope();
  const { id = '' } = useParams();
  const journey = useJourneyClient(id);
  const { hydrated, programFor } = usePrograms();
  const navigate = useNavigate();
  const isSetup = useLocation().pathname.endsWith('/new');
  const programPath = `/coach/clients/${id}/program`;
  const draftPath = `${programPath}/draft`;

  if (!hydrated) return null;
  if (!journey) return <Navigate to="/coach/clients" replace />;
  const program = programFor(journey.callId);
  if (isSetup && program) return <Navigate to={draftPath} replace />;
  if (isSetup) {
    return (
      <main className="min-h-screen bg-surface-subtle px-4 py-10">
        <ProgramSetupSheet journey={journey} onCreated={() => navigate(draftPath)} />
      </main>
    );
  }
  if (!program) return <ClientNotFound />;
  const draft = draftOf(program);
  if (!draft) return <Navigate to={programPath} replace />;

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <ProgramEditor journey={journey} program={program} draft={draft} programPath={programPath} />
    </DndProvider>
  );
}
