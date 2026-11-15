import { useEffect, useId, useRef, type KeyboardEvent, type Ref } from 'react';
import { useDrag, useDragLayer, useDrop } from 'react-dnd';
import { ArrowRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { blockWithType } from '../../../domain/programEditing';
import { splitLabel } from '../../../domain/splitTemplates';
import { InlineProblem } from '../../InlineProblem';
import { RowActionsMenu } from '../../RowActionsMenu';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { DragPreview, InsertionLine } from './dndParts';
import { useEditorAnnouncer } from './editorAnnouncer';
import { BlockNumber, blockProgress, BlockTypeSelect, filledSessionsText, STARTED_BLOCK_REASON } from './blockParts';
import { useWeeksField } from './weeksField';

export type BlocksUpdate = (blocks: Block[]) => Block[];

type PlanBlockListProps = {
  blocks: Block[];
  statuses: BlockStatus[];
  dayOne: Date | null;
  today: Date;
  problems: ReadonlyMap<string, readonly string[]>;
  onChange: (update: BlocksUpdate) => void;
  onOpenBlock: (blockId: string) => void;
  onAddBlock: () => void;
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
      <InsertionLine isOver={isOver} canDrop={canDrop} />
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
  return <DragPreview offset={offset} label={item.label} />;
}

type BlockRowProps = {
  blocks: Block[];
  index: number;
  status: BlockStatus;
  dayOne: Date | null;
  today: Date;
  instructionsId: string;
  problems: readonly string[] | undefined;
  handleRef: (element: HTMLButtonElement | null) => void;
  onHandleKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onChange: (update: BlocksUpdate) => void;
  onOpen: () => void;
};

function BlockRow({ blocks, index, status, dayOne, today, instructionsId, problems, handleRef, onHandleKey, onChange, onOpen }: BlockRowProps) {
  const block = blocks[index];
  const problemId = useId();
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
        'flex flex-wrap items-start gap-2 rounded-card border border-border bg-surface-base py-2.5 pr-2 pl-1.5 shadow-card transition-opacity motion-reduce:transition-none sm:gap-3',
        {
          'opacity-40': isDragging,
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
          className="relative hit-area flex size-(--size-control-sm) shrink-0 cursor-grab touch-none items-center justify-center rounded-field text-text-secondary hover:bg-surface-quiet hover:text-text-primary active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" size={18} />
        </button>
      ) : (
        <span aria-hidden="true" className="size-(--size-control-sm) shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-x-3 gap-y-3">
        <BlockNumber block={block} index={index} size="sm" />
        {status.kind === 'ended' ? (
          <span className="text-sm font-medium text-text-primary sm:min-w-40">{typeLabel}</span>
        ) : (
          <BlockTypeSelect
            value={block.type}
            label={`Type of block ${position}`}
            appearance="field"
            problemId={problems ? problemId : undefined}
            onChange={type => onChange(current => replaceAt(current, index, blockWithType(current[index], type)))}
          />
        )}
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Input size="sm" frameClassName="w-16" className="tabular-nums" aria-label={`Weeks of block ${position}`} {...weeks.inputProps} />
          wk
        </span>
        <span className="min-w-0 flex-1 basis-28 text-sm break-words text-text-label">
          {splitLabel(block)}
          {line && <span className="text-text-secondary">{` · ${line}`}</span>}
        </span>
        <Button
          variant="ghost"
          size="xs"
          aria-label={`Open block ${position}, ${typeLabel} · ${filledSessionsText(filled, total)}`}
          onClick={onOpen}
          className={cn('tabular-nums', {
            'text-warning': filled < total,
            'text-text-secondary': filled === total,
          })}
        >
          {`${filled}/${total}`}
          <ArrowRight aria-hidden="true" />
        </Button>
        {weeks.problem && (
          <div className="basis-full">
            <InlineProblem id={weeks.problemId}>{weeks.problem}</InlineProblem>
          </div>
        )}
        {problems && (
          <div id={problemId} className="grid basis-full gap-1">
            {problems.map(problem => (
              <InlineProblem key={problem}>{problem}</InlineProblem>
            ))}
          </div>
        )}
      </div>
      <RowActionsMenu
        label={`Block ${position} actions`}
        actions={[
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

export function PlanBlockList({ blocks, statuses, dayOne, today, problems, onChange, onOpenBlock, onAddBlock }: PlanBlockListProps) {
  const instructionsId = useId();
  const announce = useEditorAnnouncer();
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
    announce(`${BLOCK_TYPE_LABELS[block.type]} block moved to position ${to + 1} of ${blocks.length}`);
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
              problems={problems.get(block.id)}
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
      <Button variant="add" size="md" className="mt-1.5" onClick={onAddBlock}>
        <Plus aria-hidden="true" />
        Add block
      </Button>
    </div>
  );
}
