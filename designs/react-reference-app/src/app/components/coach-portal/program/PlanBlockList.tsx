import { useEffect, useId, useRef, type KeyboardEvent, type Ref } from 'react';
import { useDrag, useDragLayer, useDrop } from 'react-dnd';
import { ArrowRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import type { DeloadSource } from '../../../domain/programDefaults';
import { blockWithType } from '../../../domain/programEditing';
import { splitLabel } from '../../../domain/splitTemplates';
import { InlineProblem } from '../../ui/inline-problem';
import { IconActionButton } from '../../IconActionButton';
import { counted } from '../../../utils/counted';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { DragPreview, InsertionLine } from './dndParts';
import { useEditorAnnouncer } from './editorAnnouncer';
import { blockProgress, BlockTypeSelect, filledSessionsText, STARTED_BLOCK_REASON } from './blockParts';
import { BlockNumber } from '../../program-view/BlockNumber';
import { useDestructiveConfirm, removeBlockRequest } from './DestructiveConfirm';
import { usePlaceHeading } from './placeHeading';
import { useWeeksField, WeeksField, WeeksFieldNotes } from './weeksField';

export type BlocksUpdate = (blocks: Block[]) => Block[];

type PlanBlockListProps = {
  blocks: Block[];
  statuses: BlockStatus[];
  dayOne: Date | null;
  today: Date;
  problems: ReadonlyMap<string, readonly string[]>;
  deload: DeloadSource;
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
    <div ref={drop as unknown as Ref<HTMLDivElement>} data-parity={`block-drop-line-${index}`} aria-hidden="true" className="py-1.5">
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
  deload: DeloadSource;
  handleRef: (element: HTMLButtonElement | null) => void;
  openRef: (element: HTMLButtonElement | null) => void;
  onHandleKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onChange: (update: BlocksUpdate) => void;
  onOpen: () => void;
  onRemove: (trigger: HTMLElement) => void;
};

function BlockRow({ blocks, index, status, dayOne, today, instructionsId, problems, deload, handleRef, openRef, onHandleKey, onChange, onOpen, onRemove }: BlockRowProps) {
  const block = blocks[index];
  const problemId = useId();
  const position = index + 1;
  const movable = status.kind === 'upcoming';
  const typeLabel = BLOCK_TYPE_LABELS[block.type];
  const filled = filledSessionCount(block);
  const total = block.sessions.length;
  const line = blockProgress(block, status);
  const removeLabel = `Remove block ${position}, ${typeLabel}`;
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
        label: `${position} ${typeLabel} · ${counted(block.weeks, 'week')}`,
      },
      canDrag: movable,
      collect: monitor => ({ isDragging: monitor.isDragging() }),
    }),
    [block.id, index, movable, typeLabel, block.weeks],
  );

  return (
    <div
      data-parity="block-row"
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-card border border-border bg-surface-base p-2.5 shadow-card transition-opacity [grid-template-areas:"lead_open_remove"_"fields_fields_fields"] motion-reduce:transition-none @3xl:grid-cols-[auto_auto_minmax(0,1fr)_auto] @3xl:[grid-template-areas:"lead_fields_open_remove"]',
        {
          'opacity-40': isDragging,
          'bg-surface-subtle': status.kind === 'ended',
        },
      )}
    >
      <div data-parity="block-row-lead" className="flex items-center gap-2 [grid-area:lead]">
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
            <GripVertical aria-hidden="true" data-parity="block-handle-icon" size={18} />
          </button>
        ) : (
          <span aria-hidden="true" className="size-(--size-control-sm) shrink-0" />
        )}
        <BlockNumber block={block} index={index} size="sm" />
      </div>
      <div data-parity="block-row-fields" className="grid grid-cols-[minmax(0,16rem)_auto] items-center justify-start gap-x-3 [grid-area:fields] @3xl:flex @3xl:flex-wrap @3xl:gap-y-2">
        {status.kind === 'ended' ? (
          <span className="text-sm font-medium text-text-primary @3xl:min-w-40">{typeLabel}</span>
        ) : (
          <BlockTypeSelect
            value={block.type}
            label={`Type of block ${position}`}
            appearance="field"
            problemId={problems ? problemId : undefined}
            onChange={type => onChange(current => replaceAt(current, index, blockWithType(current[index], type, { ...deload, previous: current[index - 1] })))}
          />
        )}
        <WeeksField field={weeks} name={{ label: `Weeks of block ${position}` }} />
      </div>
      <button
        ref={openRef}
        type="button"
        onClick={onOpen}
        className="group/open flex min-h-(--size-hit-target) min-w-0 items-center gap-x-3 gap-y-1 rounded-field px-2 py-1 text-left [grid-area:open] hover:bg-surface-quiet"
      >
        <span data-parity="block-row-open-body" className="grid min-w-0 flex-1 justify-items-start gap-1 @3xl:flex @3xl:flex-wrap @3xl:items-center @3xl:gap-x-3">
          <span data-parity="block-row-split" className="text-sm break-words text-text-label">
            <span className="sr-only">{`Open block ${position}, ${typeLabel}: `}</span>
            {splitLabel(block)}
            {line && <span className="text-text-secondary">{` · ${line}`}</span>}
            <span className="sr-only">,</span>
          </span>
          <Badge data-parity="block-row-sessions" tone={filled < total ? 'pending' : 'muted'} className="tabular-nums">
            {filledSessionsText(filled, total)}
          </Badge>
        </span>
        <ArrowRight aria-hidden="true" data-parity="block-row-arrow" size={16} className="shrink-0 text-text-secondary group-hover/open:text-text-primary" />
      </button>
      <div data-parity="block-row-remove" className="ml-1 [grid-area:remove]">
        <IconActionButton
          icon={Trash2}
          label={removeLabel}
          hint="Remove block"
          disabledReason={movable ? undefined : STARTED_BLOCK_REASON}
          onClick={event => onRemove(event.currentTarget)}
        />
      </div>
      <WeeksFieldNotes field={weeks} className="col-span-full -mt-2 @3xl:col-start-2" />
      {problems && (
        <div id={problemId} data-parity="block-row-problems" className="col-span-full grid gap-1">
          {problems.map(problem => (
            <InlineProblem key={problem}>{problem}</InlineProblem>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanBlockList({ blocks, statuses, dayOne, today, problems, deload, onChange, onOpenBlock, onAddBlock }: PlanBlockListProps) {
  const instructionsId = useId();
  const announce = useEditorAnnouncer();
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const openers = useRef(new Map<string, HTMLButtonElement>());
  const confirm = useDestructiveConfirm();
  const placeHeading = usePlaceHeading();
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

  function remove(index: number, trigger: HTMLElement) {
    const block = blocks[index];
    const neighbour = blocks[index + 1] ?? blocks[index - 1];
    confirm.request({
      ...removeBlockRequest(block, index, () => onChange(current => current.filter(other => other.id !== block.id))),
      returnFocus: trigger,
      focusAfterApply: () => (neighbour ? (openers.current.get(neighbour.id) ?? null) : placeHeading.current),
    });
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
    <div data-parity="block-list">
      <BlockDragLayer />
      <p id={instructionsId} className="sr-only">
        Press arrow up or arrow down to move the block.
      </p>
      <ol aria-label="Blocks" className="@container">
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
              deload={deload}
              handleRef={element => {
                if (element) handles.current.set(block.id, element);
                else handles.current.delete(block.id);
              }}
              openRef={element => {
                if (element) openers.current.set(block.id, element);
                else openers.current.delete(block.id);
              }}
              onHandleKey={event => handleKey(index, event)}
              onChange={onChange}
              onOpen={() => onOpenBlock(block.id)}
              onRemove={trigger => remove(index, trigger)}
            />
            {index === blocks.length - 1 && <DropLine index={blocks.length} firstMovable={firstMovable} onDrop={dropAt} />}
          </li>
        ))}
      </ol>
      <Button variant="ghost" className="mt-2" onClick={onAddBlock}>
        <Plus aria-hidden="true" />
        Add block
      </Button>
      {confirm.dialog}
    </div>
  );
}
