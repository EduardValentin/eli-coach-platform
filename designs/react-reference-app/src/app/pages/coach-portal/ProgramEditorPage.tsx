import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { ListTree, X } from 'lucide-react';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { AddBlockDialog } from '../../components/coach-portal/program/AddBlockDialog';
import { BlockWorkspace } from '../../components/coach-portal/program/BlockWorkspace';
import { EditorRail } from '../../components/coach-portal/program/EditorRail';
import { EditorTopBar } from '../../components/coach-portal/program/EditorTopBar';
import { CycleRulesEditor } from '../../components/coach-portal/program/CycleRulesEditor';
import type { EditorSection } from '../../components/coach-portal/program/editorSection';
import { HeaderSection } from '../../components/coach-portal/program/HeaderSection';
import { LifestyleSection } from '../../components/coach-portal/program/LifestyleSection';
import { NutritionSection } from '../../components/coach-portal/program/NutritionSection';
import { PublishChecklist } from '../../components/coach-portal/program/PublishChecklist';
import { PlanOverview } from '../../components/coach-portal/program/PlanOverview';
import { ClientPreviewDialog } from '../../components/coach-portal/program/ClientPreviewDialog';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { ProgramSetupSheet } from '../../components/coach-portal/program/ProgramSetupSheet';
import { useEditorState } from '../../components/coach-portal/program/useEditorState';
import { useRailDrawer } from '../../components/coach-portal/program/useRailDrawer';
import { useLibraryPicker } from '../../components/coach-portal/program/useLibraryPicker';
import { LibraryDrawer } from '../../components/coach-portal/program/LibraryDrawer';
import { blockWithPick } from '../../domain/programEditing';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { useCoachPortalScope } from '../../components/coach-portal/useCoachPortalScope';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import type { ClientJourney } from '../../domain/journey';
import { currentVersion, draftOf, type Program, type ProgramVersion } from '../../domain/program';
import { recurringSymptoms } from '../../domain/programOnboarding';
import { useJourneyClient } from '../../hooks/useJourneyClient';

type EditorProps = { journey: ClientJourney; program: Program; draft: ProgramVersion; programPath: string };

function ProgramEditor(props: EditorProps) {
  const { journey, program, draft } = props;
  const editor = useEditorState(props);
  const rail = useRailDrawer();
  const picker = useLibraryPicker();
  const { programs, updateSetup } = usePrograms();
  const { journeys } = useClientJourneys();
  const { exercises } = useTraining();
  const [addingBlock, setAddingBlock] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const { content } = draft;
  const { today, ctx } = editor;
  const { cycleMode } = program;
  const selected = editor.selected.kind === 'cycle' && cycleMode === 'general' ? { kind: 'header' as const } : editor.selected;
  const blockIndex = selected.kind === 'block' ? content.plan.blocks.findIndex(block => block.id === selected.blockId) : -1;

  const pickedBlock = content.plan.blocks.find(block => block.sessions.some(session => session.id === picker.target?.sessionId));
  const pickedSlot = pickedBlock?.sessions.flatMap(session => session.rows).find(row => row.id === picker.target?.rowId)?.slot;

  function pickExercise(exerciseId: string) {
    const exercise = exercises.find(item => item.id === exerciseId);
    if (picker.target && pickedBlock && exercise) {
      editor.replaceBlock(blockWithPick(pickedBlock, picker.target, exercise, exercises, program.equipment));
    }
    picker.close();
  }

  function requestPublish() {
    if (editor.problems.length > 0 || editor.warnings.length > 0) setChecklistOpen(true);
    else editor.publish();
  }

  function selectFromRail(section: EditorSection) {
    editor.select(section);
    rail.hide();
  }

  function renderSection() {
    if (selected.kind === 'plan') {
      return (
        <PlanOverview
          content={content}
          dayOne={ctx.dayOne}
          preferredWeekday={ctx.preferredWeekday}
          today={today}
          level={program.level}
          onChange={editor.updateBlocks}
          onOpenBlock={blockId => editor.select({ kind: 'block', blockId })}
          onUseSuggestion={editor.applySuggestion}
        />
      );
    }
    if (selected.kind === 'block') {
      return (
        <BlockWorkspace
          block={content.plan.blocks[blockIndex]}
          blockIndex={blockIndex}
          content={content}
          program={program}
          dayOne={ctx.dayOne}
          today={today}
          library={exercises}
          equipment={program.equipment}
          onChange={editor.replaceBlock}
          otherPrograms={programs().filter(other => other.callId !== program.callId)}
          journeys={journeys}
          onPickExercise={picker.open}
        />
      );
    }
    if (selected.kind === 'header') {
      return (
        <HeaderSection
          journey={journey}
          program={program}
          version={draft}
          content={content}
          onContentChange={editor.replaceContent}
          onSetupChange={patch => updateSetup(program.callId, patch)}
        />
      );
    }
    if (selected.kind === 'cycle') {
      return (
        <CycleRulesEditor
          rules={content.cycleRules}
          symptoms={recurringSymptoms(journey)}
          onChange={cycleRules => editor.replaceContent({ ...content, cycleRules })}
        />
      );
    }
    if (selected.kind === 'nutrition') {
      return <NutritionSection notes={content.nutritionNotes} onChange={nutritionNotes => editor.replaceContent({ ...content, nutritionNotes })} />;
    }
    return <LifestyleSection notes={content.lifestyleNotes} onChange={lifestyleNotes => editor.replaceContent({ ...content, lifestyleNotes })} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle" data-parity-root="ProgramEditorPage">
      <EditorTopBar
        journey={journey}
        version={draft}
        basedOn={currentVersion(program)}
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
        {rail.open && (
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-overlay-medium lg:hidden" data-parity="drawer-backdrop" onClick={rail.hide} />
        )}
        <aside
          ref={rail.aside}
          aria-label="Program outline"
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-80 shrink-0 flex-col overflow-y-auto border-r border-border bg-card duration-300 ease-out motion-reduce:transition-none lg:visible lg:relative lg:z-auto lg:w-72 lg:translate-x-0',
            {
              'translate-x-0 shadow-drawer transition-[translate]': rail.open,
              'invisible -translate-x-full transition-[translate,visibility]': !rail.open,
            },
          )}
        >
          <div className="flex justify-end p-2 lg:hidden">
            <Button ref={rail.closeButton} onClick={rail.hide} variant="ghost" size="icon-sm" aria-label="Close program sections">
              <X size={18} />
            </Button>
          </div>
          <EditorRail
            content={content}
            cycleMode={cycleMode}
            dayOne={ctx.dayOne}
            today={today}
            selected={selected}
            onSelect={selectFromRail}
            onAddBlock={() => {
              rail.hide();
              setAddingBlock(true);
            }}
          />
        </aside>
        <main aria-label="Program editor" className="min-w-0 flex-1 overflow-y-auto bg-surface-page p-4 lg:p-6">
          <div className="mx-auto w-full max-w-5xl">{renderSection()}</div>
        </main>
        {picker.target && (
          <LibraryDrawer
            key={[picker.target.rowId, picker.target.field, picker.target.index].join(':')}
            target={picker.target}
            slot={pickedSlot}
            library={exercises}
            equipment={program.equipment}
            onPick={pickExercise}
            onClose={picker.close}
          />
        )}
      </div>
      <PublishChecklist
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
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
  const { programFor } = usePrograms();
  const navigate = useNavigate();
  const isSetup = useLocation().pathname.endsWith('/new');
  const programPath = `/coach/clients/${id}/program`;
  const draftPath = `${programPath}/draft`;

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
