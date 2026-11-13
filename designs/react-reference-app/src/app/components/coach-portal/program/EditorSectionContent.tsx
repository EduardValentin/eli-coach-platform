import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import { usePrograms } from '../../../context/ProgramContext';
import { useTraining } from '../../../context/TrainingContext';
import type { Block, Program, ProgramVersion } from '../../../domain/program';
import type { ClientJourney } from '../../../domain/journey';
import type { LibraryTarget } from '../../../domain/programEditing';
import { Button } from '../../ui/button';
import { BlockWorkspace } from './BlockWorkspace';
import type { EditorSection } from './editorSection';
import { PlanOverview } from './PlanOverview';
import { SetupSection } from './SetupSection';
import { TextsWorkspace } from './TextsWorkspace';
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
      equipment={editor.equipment}
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

function ContinueToTexts({ editor }: { editor: ReturnType<typeof useEditorState> }) {
  return (
    <div className="flex justify-end">
      <Button asChild variant="outline">
        <Link to={editor.textsLocation}>
          Continue to texts
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function StructureSectionContent({ section, program, draft, editor, openBlock }: EditorSectionContentProps) {
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
  return <SetupSection program={program} onSetupChange={patch => updateSetup(program.callId, patch)} />;
}

function leadsToTexts(section: EditorSection, blocks: readonly Block[]): boolean {
  if (section.kind === 'block') return blocks.at(-1)?.id === section.blockId;
  return section.kind !== 'texts';
}

export function EditorSectionContent(props: EditorSectionContentProps) {
  const { section, journey, program, draft, editor } = props;
  if (section.kind === 'texts') {
    return <TextsWorkspace journey={journey} program={program} draft={draft} today={editor.today} editing={editor.textEditing} />;
  }
  return (
    <div className="grid gap-6">
      <StructureSectionContent {...props} />
      {leadsToTexts(section, draft.content.plan.blocks) && <ContinueToTexts editor={editor} />}
    </div>
  );
}
