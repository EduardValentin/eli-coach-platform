import { useId, type Ref } from 'react';
import { ChevronDown, Eraser, PencilLine, Plus } from 'lucide-react';
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
import { counted } from '../../../utils/counted';
import { RowActionsMenu } from '../../RowActionsMenu';
import { LABEL_CLASS } from '../../typography';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { cn } from '../../ui/utils';
import { cardioSummary } from '../../program-view/programView';
import { CardioSegmentCard } from './CardioSegmentCard';
import { useEditorAnnouncer } from './editorAnnouncer';
import { useResetConfirm } from './ResetConfirm';
import {
  CollapsedSessionHeader,
  EXPANDED_SESSION_CLASS,
  SESSION_ARTICLE_CLASS,
  SESSION_CONTENT_CLASS,
  SessionNameInput,
  sessionHeaderHeightStyle,
  useNameFocusOnExpand,
} from './sessionCardParts';
import { useMeasuredHeight } from './useMeasuredHeight';
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

function acceptsCardioExercise(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE && dragged.item.exercise.type === 'cardio';
}

function PresetRow({ onChoose }: { onChoose: (kind: (typeof CARDIO_PRESET_KINDS)[number]) => void }) {
  const labelId = useId();
  return (
    <div className="grid gap-2 rounded-control border border-dashed border-border bg-card p-3">
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
  const { nameField, expand } = useNameFocusOnExpand(expanded, onExpand);
  const header = useMeasuredHeight();
  const confirm = useResetConfirm();
  const announce = useEditorAnnouncer();
  const edits = cardioEdits(cardio, library);
  const { segments } = cardio;

  function clear() {
    confirm.request({
      title: `Clear ${cardio.name}?`,
      confirmLabel: 'Clear segments',
      lines: [`${cardio.name} · ${counted(segments.length, 'segment')}`],
      apply: () => {
        onChange({ ...cardio, segments: [] });
        announce(`${cardio.name} cleared`);
      },
    });
  }

  if (!expanded) {
    return (
      <article ref={articleRef} aria-labelledby={headingId} className={SESSION_ARTICLE_CLASS}>
        <CollapsedSessionHeader headingId={headingId} name={cardio.name} summary={cardioSummary(cardio)} onExpand={expand} />
      </article>
    );
  }

  return (
    <article ref={articleRef} aria-labelledby={headingId} className={cn(SESSION_ARTICLE_CLASS, EXPANDED_SESSION_CLASS)} style={sessionHeaderHeightStyle(header.height)}>
      <header ref={header.measureRef} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-card border-b border-border-subtle bg-card px-3 py-2">
        <h3 id={headingId} className="sr-only">
          {cardio.name}
        </h3>
        <Badge tone="training-recovery">Cardio</Badge>
        <SessionNameInput value={cardio.name} inputRef={nameField} onChange={name => onChange({ ...cardio, name })} />
        {segments.length > 0 && <p className="text-sm text-text-secondary tabular-nums">{`${cardioMinutes(cardio)} min`}</p>}
        <RowActionsMenu
          label={`${cardio.name} actions`}
          size="xs"
          actions={[
            { name: 'rename', label: 'Rename', icon: PencilLine, onSelect: () => nameField.current?.select() },
            { name: 'clear', label: 'Clear segments', icon: Eraser, tone: 'destructive', disabled: segments.length === 0, onSelect: clear },
          ]}
        />
      </header>
      <DropZone
        rules={{ sessionId: cardio.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.addSteady(dragged.item.exercise.id)) }}
        accepts={acceptsCardioExercise}
        className={cn('grid gap-3 rounded-b-card p-3 sm:p-4', SESSION_CONTENT_CLASS)}
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
                  onAddRoundsItem={() => onOpenLibrary({ kind: 'rounds-item', sessionId: cardio.id, segmentId: segment.id })}
                />
              </li>
            ))}
          </ol>
        )}
        <AddSegmentMenu onAdd={kind => onChange(edits.addSegment(kind))} />
      </DropZone>
      {confirm.dialog}
    </article>
  );
}
