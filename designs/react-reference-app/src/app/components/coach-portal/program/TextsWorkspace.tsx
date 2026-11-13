import { useState } from 'react';
import { useTraining } from '../../../context/TrainingContext';
import type { ClientJourney } from '../../../domain/journey';
import { BLOCK_TYPE_LABELS, type Program, type ProgramVersion } from '../../../domain/program';
import { journeyProgramView, journeyProgramViewDuringBlock } from '../../program-view/journeyProgramView';
import { BLOCK_SWATCH } from '../../program-view/blockColours';
import type { DocumentEditing } from '../../program-view/documentEditing';
import { ProgramDocument } from '../../program-view/ProgramDocument';
import { currentBlock } from '../../program-view/programView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { cn } from '../../ui/utils';

type TextsWorkspaceProps = {
  journey: ClientJourney;
  program: Program;
  draft: ProgramVersion;
  today: Date;
  editing: DocumentEditing;
};

const SHEET_CLASS = 'mx-auto w-full max-w-[210mm] overflow-hidden border border-border bg-surface-base shadow-card';

export function TextsWorkspace({ journey, program, draft, today, editing }: TextsWorkspaceProps) {
  const { exercises } = useTraining();
  const [chosenBlockId, setChosenBlockId] = useState<string | null>(null);
  const { blocks } = draft.content.plan;
  const input = { journey, program, version: draft, exercises, today };
  const defaultBlockId = currentBlock(journeyProgramView({ ...input, fallbackDayOne: today }))?.id ?? null;
  const blockId = blocks.some(block => block.id === chosenBlockId) ? chosenBlockId : defaultBlockId;
  const view = journeyProgramViewDuringBlock({ ...input, blockId });
  const sheet = (
    <div className={SHEET_CLASS}>
      <ProgramDocument view={view} editing={editing} />
    </div>
  );

  if (blocks.length < 2 || !blockId) return sheet;

  return (
    <Tabs value={blockId} onValueChange={setChosenBlockId} variant="segmented" className="mx-auto w-full max-w-[210mm] gap-4">
      <TabsList aria-label="Her document during block" className="self-start max-sm:w-full max-sm:flex-nowrap max-sm:justify-start max-sm:overflow-x-auto">
        {blocks.map((block, index) => (
          <TabsTrigger key={block.id} value={block.id} className="gap-1.5 max-sm:flex-none max-sm:px-2.5">
            <span aria-hidden="true" className={cn('size-2 rounded-full', BLOCK_SWATCH[block.type])} />
            {`${index + 1} ${BLOCK_TYPE_LABELS[block.type]}`}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={blockId}>{sheet}</TabsContent>
    </Tabs>
  );
}
