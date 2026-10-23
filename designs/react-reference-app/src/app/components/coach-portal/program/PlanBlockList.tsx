import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { useDrag, useDragLayer, useDrop } from 'react-dnd';
import { ArrowRight, GripVertical, Trash2 } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { blockWithType } from '../../../domain/programEditing';
import { splitLabel } from '../../../domain/splitTemplates';
import { InlineProblem } from '../../InlineProblem';
import { RowActionsMenu } from '../../RowActionsMenu';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { BlockNumber, blockProgress, BlockTypeSelect, filledSessionsText, STARTED_BLOCK_REASON } from './blockParts';
import { useWeeksField } from './weeksField';

export type BlocksUpdate = (blocks: Block[]) => Block[];

type PlanBlockListProps = {
  blocks: Block[];
  statuses: BlockStatus[];
  dayOne: Date | null;
  today: Date;
  onChange: (update: BlocksUpdate) => void;
  onOpenBlock: (blockId: string) => void;
};

type DraggedBlock = { id: string; index: number; label: string };

const PLAN_BLOCK = 'PLAN_BLOCK';

function moved(blocks: Block[], from: number, to: number): Block[] {
  const next = [...blocks];
  const [block] = next.splice(from, 1);
  next.splice(to, 0, block);
  return next;
}

function replaceAt(blocks: Block[], index: number, block: Block): Block[] {
  return blocks.map((other, at) => (at === index ? block : other));
}

function DropLine({ index, firstMovable, onDrop }: { index: number; firstMovable: number; onDrop: (item: DraggedBlock, index: number) => void }) {
  const [{ isOver, canDrop }, drop] = useDrop<DraggedBlock, void, { isOver: boolean; canDrop: boolean }>(
    () => ({
      accept: PLAN_BLOCK,
      canDrop: item => index >= firstMovable && index !== item.index && index !== item.index + 1,
      drop: item => onDrop(item, index),
      collect: monitor => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [index, firstMovable, onDrop],
  );
  return (
    <div ref={drop as unknown as Ref<HTMLDivElement>} aria-hidden="true" className="py-1.5">
      <div
        className={cn('mx-3 h-0.5 rounded-full transition-all duration-200 motion-reduce:transition-none', {
          'h-1 bg-primary': isOver && canDrop,
          'bg-border': canDrop && !isOver,
          'bg-transparent': !canDrop,
        })}
      />
    </div>
  );
}

function BlockDragLayer() {
  const { item, offset, type } = useDragLayer(monitor => ({
    item: monitor.getItem() as DraggedBlock | null,
    offset: monitor.getSourceClientOffset(),
    type: monitor.getItemType(),
  }));
  if (type !== PLAN_BLOCK || !item || !offset) return null;
  return (
    <div className="pointer-events-none fixed top-0 left-0 z-[100]" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className="inline-flex items-center gap-2 rounded-control border border-primary bg-card px-3 py-2 shadow-raised">
        <GripVertical aria-hidden="true" size={14} className="text-text-secondary" />
        <span className="text-sm font-medium text-text-primary">{item.label}</span>
      </div>
    </div>
  );
}

type BlockRowProps = {
  blocks: Block[];
  index: number;
  status: BlockStatus;
  dayOne: Date | null;
  today: Date;
  instructionsId: string;
  handleRef: (element: HTMLButtonElement | null) => void;
  onHandleKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onChange: (update: BlocksUpdate) => void;
  onOpen: () => void;
};

function BlockRow({ blocks, index, status, dayOne, today, instructionsId, handleRef, onHandleKey, onChange, onOpen }: BlockRowProps) {
  const block = blocks[index];
  const position = index + 1;
  const movable = status.kind === 'upcoming';
  const typeLabel = BLOCK_TYPE_LABELS[block.type];
  const filled = filledSessionCount(block);
  const total = block.sessions.length;
  const line = blockProgress(block, status);
  const weeks = useWeeksField({
    blocks,
    index,
    status,
    dayOne,
    today,
    onCommit: value => onChange(current => replaceAt(current, index, { ...current[index], weeks: value })),
  });
  const [{ isDragging }, drag] = useDrag<DraggedBlock, void, { isDragging: boolean }>(
    () => ({
      type: PLAN_BLOCK,
      item: {
        id: block.id,
        index,
        label: `${position} ${typeLabel} · ${block.weeks} wk`,
      },
      canDrag: movable,
      collect: monitor => ({ isDragging: monitor.isDragging() }),
    }),
    [block.id, index, movable, typeLabel, block.weeks],
  );

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-card border border-border bg-surface-base py-2.5 pr-2 pl-1.5 shadow-card transition-opacity motion-reduce:transition-none sm:gap-3',
        {
          'opacity-40': isDragging,
          'bg-surface-subtle': status.kind === 'ended',
        },
      )}
    >
      {movable ? (
        <button
          ref={element => {
            drag(element);
            handleRef(element);
          }}
          type="button"
          aria-label={`Reorder ${typeLabel} block`}
          aria-describedby={instructionsId}
          onKeyDown={onHandleKey}
          className="flex size-(--size-control-sm) shrink-0 cursor-grab touch-none items-center justify-center rounded-field text-text-secondary hover:bg-surface-quiet hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" size={18} />
        </button>
      ) : (
        <span aria-hidden="true" className="size-(--size-control-sm) shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        <BlockNumber block={block} index={index} size="sm" />
        {status.kind === 'ended' ? (
          <span className="w-40 text-sm font-medium text-text-primary">{typeLabel}</span>
        ) : (
          <BlockTypeSelect
            value={block.type}
            label={`Type of block ${position}`}
            appearance="field"
            onChange={type => onChange(current => replaceAt(current, index, blockWithType(current[index], type)))}
          />
        )}
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Input size="sm" className="w-16 tabular-nums" aria-label={`Weeks of block ${position}`} {...weeks.inputProps} />
          wk
        </span>
        <span className="min-w-0 flex-1 basis-28 truncate text-sm text-text-label">
          {splitLabel(block)}
          {line && <span className="text-text-secondary">{` · ${line}`}</span>}
        </span>
        <span
          className={cn('text-sm tabular-nums', {
            'text-warning': filled < total,
            'text-text-secondary': filled === total,
          })}
        >
          {filledSessionsText(filled, total)}
        </span>
        {weeks.problem && (
          <div className="basis-full">
            <InlineProblem id={weeks.problemId}>{weeks.problem}</InlineProblem>
          </div>
        )}
      </div>
      <RowActionsMenu
        label={`Block ${position} actions`}
        actions={[
          { name: 'open', label: 'Open', icon: ArrowRight, onSelect: onOpen },
          {
            name: 'remove',
            label: 'Remove',
            icon: Trash2,
            tone: 'destructive',
            disabledReason: movable ? undefined : STARTED_BLOCK_REASON,
            onSelect: () => onChange(current => current.filter(other => other.id !== block.id)),
          },
        ]}
      />
    </div>
  );
}

export function PlanBlockList({ blocks, statuses, dayOne, today, onChange, onOpenBlock }: PlanBlockListProps) {
  const instructionsId = useId();
  const [announcement, setAnnouncement] = useState('');
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterMove = useRef<string | null>(null);
  const firstMovable = statuses.reduce((first, status, index) => (status.kind === 'upcoming' ? first : index + 1), 0);

  useEffect(() => {
    if (!focusAfterMove.current) return;
    handles.current.get(focusAfterMove.current)?.focus();
    focusAfterMove.current = null;
  }, [blocks]);

  function move(from: number, to: number) {
    const block = blocks[from];
    focusAfterMove.current = block.id;
    onChange(current => moved(current, from, to));
    setAnnouncement(`${BLOCK_TYPE_LABELS[block.type]} block moved to position ${to + 1} of ${blocks.length}`);
  }

  function dropAt(item: DraggedBlock, index: number) {
    move(item.index, index > item.index ? index - 1 : index);
  }

  function handleKey(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    const target = { ArrowUp: index - 1, ArrowDown: index + 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    if (target >= firstMovable && target < blocks.length) move(index, target);
  }

  return (
    <div>
      <BlockDragLayer />
      <p id={instructionsId} className="sr-only">
        Press arrow up or arrow down to move the block.
      </p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <ol aria-label="Blocks">
        {blocks.map((block, index) => (
          <li key={block.id}>
            <DropLine index={index} firstMovable={firstMovable} onDrop={dropAt} />
            <BlockRow
              key={block.id}
              blocks={blocks}
              index={index}
              status={statuses[index]}
              dayOne={dayOne}
              today={today}
              instructionsId={instructionsId}
              handleRef={element => {
                if (element) handles.current.set(block.id, element);
                else handles.current.delete(block.id);
              }}
              onHandleKey={event => handleKey(index, event)}
              onChange={onChange}
              onOpen={() => onOpenBlock(block.id)}
            />
            {index === blocks.length - 1 && <DropLine index={blocks.length} firstMovable={firstMovable} onDrop={dropAt} />}
          </li>
        ))}
      </ol>
    </div>
  );
}
