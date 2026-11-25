import type { CSSProperties } from "react";

import type {
  Block,
  ClientLevel,
  LibraryExercise,
  ProgramLanguage,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BlockHeader } from "./block-header";
import { useMeasuredHeight } from "./use-measured-height";
import { WeekDays } from "./week-days";

type BlockWorkspaceProps = {
  block: Block;
  blockIndex: number;
  blocks: Block[];
  language: ProgramLanguage;
  level: ClientLevel;
  libraryExercises: readonly LibraryExercise[];
  onChange: (block: Block) => void;
  onRemove: () => void;
};

export function BlockWorkspace({
  block,
  blockIndex,
  blocks,
  language,
  level,
  libraryExercises,
  onChange,
  onRemove,
}: BlockWorkspaceProps) {
  const header = useMeasuredHeight();

  return (
    <section
      className="grid grid-cols-[minmax(0,1fr)] gap-6"
      data-parity-root="BlockWorkspace"
      style={{ "--block-header-height": `${header.height}px` } as CSSProperties}
    >
      <BlockHeader
        blocks={blocks}
        index={blockIndex}
        key={block.id}
        language={language}
        level={level}
        libraryExercises={libraryExercises}
        measureRef={header.measureRef}
        onChange={onChange}
        onRemove={onRemove}
      />
      <WeekDays
        block={block}
        level={level}
        libraryExercises={libraryExercises}
        onChange={onChange}
      />
    </section>
  );
}
