import { useClientJourneys } from '../../../context/ClientJourneyContext';
import { usePrograms } from '../../../context/ProgramContext';
import { useTraining } from '../../../context/TrainingContext';
import type { ClientJourney } from '../../../domain/journey';
import type { Block, Program, ProgramVersion } from '../../../domain/program';
import type { LibraryTarget } from '../../../domain/programEditing';
import { recurringSymptoms } from '../../../domain/programOnboarding';
import { BlockWorkspace } from './BlockWorkspace';
import { CycleRulesEditor } from './CycleRulesEditor';
import type { EditorSection } from './editorSection';
import { HeaderSection } from './HeaderSection';
import { LifestyleSection } from './LifestyleSection';
import { NutritionSection } from './NutritionSection';
import { PlanOverview } from './PlanOverview';
import type { useEditorState } from './useEditorState';

export type OpenBlock = {
  block: Block;
  index: number;
  openSessionId: string | undefined;
  onOpenSession: (sessionId: string) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
};

type EditorSectionContentProps = {
  section: EditorSection;
  journey: ClientJourney;
  program: Program;
  draft: ProgramVersion;
  editor: ReturnType<typeof useEditorState>;
  openBlock: OpenBlock | undefined;
};

function OpenBlockWorkspace({ program, draft, editor, openBlock }: Pick<EditorSectionContentProps, 'program' | 'draft' | 'editor'> & { openBlock: OpenBlock }) {
  const { programs } = usePrograms();
  const { journeys } = useClientJourneys();
  const { exercises } = useTraining();
  const { block } = openBlock;
  return (
    <BlockWorkspace
      block={block}
      blockIndex={openBlock.index}
      blocks={draft.content.plan.blocks}
      language={program.language}
      equipment={program.equipment}
      dayOne={editor.ruleContext.dayOne}
      today={editor.today}
      library={exercises}
      otherPrograms={programs().filter(other => other.callId !== program.callId)}
      journeys={journeys}
      openSessionId={openBlock.openSessionId}
      onOpenSession={openBlock.onOpenSession}
      onChange={editor.replaceBlock}
      onRemove={() => editor.removeBlock(block.id)}
      onOpenLibrary={openBlock.onOpenLibrary}
    />
  );
}

export function EditorSectionContent({ section, journey, program, draft, editor, openBlock }: EditorSectionContentProps) {
  const { updateSetup } = usePrograms();
  const { content } = draft;
  if (section.kind === 'plan') {
    return (
      <PlanOverview
        content={content}
        dayOne={editor.ruleContext.dayOne}
        preferredWeekday={editor.ruleContext.preferredWeekday}
        today={editor.today}
        level={program.level}
        onChange={editor.updateBlocks}
        onOpenBlock={blockId => editor.select({ kind: 'block', blockId })}
        onUseSuggestion={editor.applySuggestion}
      />
    );
  }
  if (section.kind === 'block') return openBlock ? <OpenBlockWorkspace program={program} draft={draft} editor={editor} openBlock={openBlock} /> : null;
  if (section.kind === 'header') {
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
  if (section.kind === 'cycle') {
    return <CycleRulesEditor rules={content.cycleRules} symptoms={recurringSymptoms(journey)} onChange={cycleRules => editor.replaceContent({ ...content, cycleRules })} />;
  }
  if (section.kind === 'nutrition') {
    return <NutritionSection notes={content.nutritionNotes} onChange={nutritionNotes => editor.replaceContent({ ...content, nutritionNotes })} />;
  }
  return <LifestyleSection notes={content.lifestyleNotes} onChange={lifestyleNotes => editor.replaceContent({ ...content, lifestyleNotes })} />;
}
