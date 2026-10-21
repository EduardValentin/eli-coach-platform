import { useId, type Ref } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { CardioSession } from '../../../domain/program';
import {
  CARDIO_PRESET_KINDS,
  CARDIO_PRESET_NAMES,
  cardioEdits,
  cardioMinutes,
  SEGMENT_KIND_LABELS,
  SEGMENT_KINDS,
} from '../../../domain/programCardio';
import type { LibraryTarget } from '../../../domain/programEditing';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { CardioSegmentCard } from './CardioSegmentCard';
import { DropZone, LIBRARY_EXERCISE, type DraggedItem } from './sessionDnd';

type CardioSessionCardProps = {
  cardio: CardioSession;
  expanded: boolean;
  articleRef: Ref<HTMLElement>;
  library: readonly Exercise[];
  onExpand: () => void;
  onChange: (cardio: CardioSession) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
};

const ARTICLE_CLASS = 'rounded-card border border-border bg-card shadow-card';

function acceptsCardioExercise(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE && dragged.item.exercise.type === 'cardio';
}

function summary(cardio: CardioSession): string {
  if (cardio.segments.length === 0) return 'Cardio · no segments';
  return `Cardio · ${cardioMinutes(cardio)} min`;
}

function PresetRow({ onChoose }: { onChoose: (kind: (typeof CARDIO_PRESET_KINDS)[number]) => void }) {
  const labelId = useId();
  return (
    <div className="grid gap-2 rounded-control border border-dashed border-border bg-surface-subtle p-3">
      <p id={labelId} className={LABEL_CLASS}>
        Start from
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {CARDIO_PRESET_KINDS.map(kind => (
          <Button key={kind} variant="outline" size="xs" className="rounded-full" onClick={() => onChoose(kind)}>
            {CARDIO_PRESET_NAMES[kind]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function AddSegmentMenu({ onAdd }: { onAdd: (kind: (typeof SEGMENT_KINDS)[number]) => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="xs" className="w-fit">
          <Plus aria-hidden="true" />
          Add segment
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        {SEGMENT_KINDS.map(kind => (
          <DropdownMenuItem key={kind} onSelect={() => onAdd(kind)}>
            {SEGMENT_KIND_LABELS[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CardioSessionCard({ cardio, expanded, articleRef, library, onExpand, onChange, onOpenLibrary }: CardioSessionCardProps) {
  const headingId = useId();
  const edits = cardioEdits(cardio, library);
  const { segments } = cardio;

  if (!expanded) {
    return (
      <article ref={articleRef} aria-labelledby={headingId} className={ARTICLE_CLASS}>
        <h3>
          <button
            type="button"
            aria-expanded={false}
            onClick={onExpand}
            className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded-card px-4 py-3 text-left outline-none hover:bg-surface-quiet focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span id={headingId} className="font-serif text-lg text-text-primary">
              {cardio.name}
            </span>
            <span className="text-sm text-text-secondary tabular-nums">{summary(cardio)}</span>
          </button>
        </h3>
      </article>
    );
  }

  return (
    <article ref={articleRef} aria-labelledby={headingId} className={cn(ARTICLE_CLASS, 'scroll-mt-4 lg:scroll-mt-(--block-header-height)')}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-card border-b border-border-subtle bg-card px-3 py-2">
        <h3 id={headingId} className="sr-only">
          {cardio.name}
        </h3>
        <span className="rounded-field bg-training-recovery-soft px-2 py-0.5 text-xs font-medium text-training-recovery">Cardio</span>
        <Input
          aria-label="Session name"
          value={cardio.name}
          onChange={event => onChange({ ...cardio, name: event.target.value })}
          className="h-auto w-auto min-w-0 flex-1 basis-40 border-transparent bg-transparent px-1 font-serif text-xl text-text-primary shadow-none hover:border-control-border-soft md:text-xl"
        />
        {segments.length > 0 && <p className="text-sm text-text-secondary tabular-nums">{`${cardioMinutes(cardio)} min`}</p>}
      </header>
      <DropZone
        rules={{ sessionId: cardio.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.addSteady(dragged.item.exercise.id)) }}
        accepts={acceptsCardioExercise}
        className="grid gap-3 rounded-b-card p-3 sm:p-4"
        activeClassName="ring-2 ring-inset ring-primary/40"
      >
        {segments.length === 0 && <PresetRow onChoose={kind => onChange(edits.applyPreset(kind))} />}
        {segments.length > 0 && (
          <ol aria-label="Segments" className="grid gap-2">
            {segments.map((segment, index) => (
              <li key={segment.id}>
                <CardioSegmentCard
                  cardioId={cardio.id}
                  segment={segment}
                  position={index + 1}
                  count={segments.length}
                  library={library}
                  edits={edits}
                  onChange={onChange}
                  onReplaceExercise={() => onOpenLibrary({ kind: 'cardio-exercise', sessionId: cardio.id, segmentId: segment.id })}
                  onAddCircuitItem={() => onOpenLibrary({ kind: 'circuit-item', sessionId: cardio.id, segmentId: segment.id })}
                />
              </li>
            ))}
          </ol>
        )}
        <AddSegmentMenu onAdd={kind => onChange(edits.addSegment(kind))} />
      </DropZone>
    </article>
  );
}
