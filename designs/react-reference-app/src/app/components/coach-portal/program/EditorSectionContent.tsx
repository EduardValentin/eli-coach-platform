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
import { ProgramSettings } from './ProgramSettings';
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
  onAddBlock: () => void;
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
        <Link to={editor.locationOf('texts', { kind: 'plan' })}>
          Continue to texts
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function StructureOverview({ program, draft, editor, onAddBlock }: Pick<EditorSectionContentProps, 'program' | 'draft' | 'editor' | 'onAddBlock'>) {
  const { updateSetup } = usePrograms();
  return (
    <PlanOverview
      content={draft.content}
      dayOne={editor.ruleContext.dayOne}
      preferredWeekday={editor.ruleContext.preferredWeekday}
      today={editor.today}
      level={program.level}
      onChange={editor.updateBlocks}
      onOpenBlock={blockId => editor.select({ kind: 'block', blockId })}
      onAddBlock={onAddBlock}
      onUseSuggestion={editor.applySuggestion}
      settings={<ProgramSettings program={program} onChange={patch => updateSetup(program.callId, patch)} />}
    />
  );
}

export function EditorSectionContent(props: EditorSectionContentProps) {
  const { section, journey, program, draft, editor, openBlock, onAddBlock } = props;
  if (editor.mode === 'texts') {
    return <TextsWorkspace section={section} journey={journey} program={program} draft={draft} today={editor.today} editing={editor.textEditing} />;
  }
  if (section.kind === 'plan') return <StructureOverview program={program} draft={draft} editor={editor} onAddBlock={onAddBlock} />;
  if (!openBlock) return null;
  const isLastBlock = draft.content.plan.blocks.at(-1)?.id === openBlock.block.id;
  return (
    <div className="grid gap-6">
      <OpenBlockWorkspace program={program} draft={draft} editor={editor} openBlock={openBlock} />
      {isLastBlock && <ContinueToTexts editor={editor} />}
    </div>
  );
}
