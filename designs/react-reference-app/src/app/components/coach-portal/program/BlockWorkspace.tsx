import type { Exercise } from '../../../context/TrainingContext';
import type { Equipment } from '../../../domain/exercises';
import { BLOCK_TYPE_LABELS, type Block, type Program, type ProgramContent } from '../../../domain/program';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Badge } from '../../ui/badge';
import { BLOCK_BADGE_TONE } from './program-constants';

export type RowTarget = { sessionId: string; rowId: string; field: 'exercise' | 'substitution' | 'mobility'; index?: number };

type BlockWorkspaceProps = {
  block: Block;
  blockIndex: number;
  content: ProgramContent;
  program: Program;
  dayOne: Date | null;
  today: Date;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  onChange: (block: Block) => void;
  onPickExercise: (target: RowTarget) => void;
};

export function BlockWorkspace({ block, blockIndex }: BlockWorkspaceProps) {
  return (
    <section className="grid gap-3">
      <Badge tone={BLOCK_BADGE_TONE[block.type]}>Block {blockIndex + 1}</Badge>
      <h2 className={WIDGET_TITLE_CLASS}>{BLOCK_TYPE_LABELS[block.type]}</h2>
      <p className="text-sm text-text-secondary">Sessions arrive in the next task</p>
    </section>
  );
}
