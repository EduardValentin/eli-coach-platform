import { ArrowRight, GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "~/shared/design-system/lib";
import {
  Badge,
  Button,
  InlineProblem,
} from "~/shared/design-system/primitives";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { useDrag, useDragLayer, useDrop } from "react-dnd";

import {
  BLOCK_TYPE_LABELS,
  BlockFilling,
  SplitTemplate,
  type Block,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BlockNumber } from "./block-number";
import { BlockTypeSelect, filledSessionsText } from "./block-parts";
import { blockEditing } from "./builder-editing";
import {
  removeBlockRequest,
  useDestructiveConfirm,
} from "./destructive-confirm";
import { DragPreview, InsertionLine } from "./dnd-parts";
import { useEditorAnnouncer } from "./editor-announcer";
import { weeksText } from "./plan-weeks";
import { useWeeksField, WeeksField, WeeksFieldNotes } from "./weeks-field";

export type BlocksUpdate = (blocks: Block[]) => Block[];

type PlanBlockListProps = {
  blocks: Block[];
  problems: ReadonlyMap<string, readonly string[]>;
  onChange: (update: BlocksUpdate) => void;
  onOpenBlock: (blockId: string) => void;
  onAddBlock: () => void;
};

type DraggedBlock = { id: string; index: number; label: string };

type DropState = { isOver: boolean; canDrop: boolean };

const PLAN_BLOCK = "PLAN_BLOCK";

function moved(blocks: Block[], from: number, to: number): Block[] {
  const next = [...blocks];
  const [block] = next.splice(from, 1);
  next.splice(to, 0, block);

  return next;
}

function replaceAt(blocks: Block[], index: number, block: Block): Block[] {
  return blocks.map((other, at) => (at === index ? block : other));
}

function splitLabel(block: Block): string {
  return block.split.name || SplitTemplate.of(block.split.shape).label;
}

function DropLine({
  index,
  onDrop,
}: {
  index: number;
  onDrop: (item: DraggedBlock, index: number) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop<DraggedBlock, void, DropState>(
    () => ({
      accept: PLAN_BLOCK,
      canDrop: (item) => index !== item.index && index !== item.index + 1,
      drop: (item) => onDrop(item, index),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [index, onDrop],
  );

  return (
    <div
      aria-hidden="true"
      className="py-1.5"
      data-parity="block-drop-line"
      ref={(node) => {
        drop(node);
      }}
    >
      <InsertionLine canDrop={canDrop} isOver={isOver} />
    </div>
  );
}

function BlockDragLayer() {
  const { item, offset, type } = useDragLayer((monitor) => ({
    item: monitor.getItem<DraggedBlock | null>(),
    offset: monitor.getSourceClientOffset(),
    type: monitor.getItemType(),
  }));
  if (type !== PLAN_BLOCK || !item || !offset) return null;

  return <DragPreview label={item.label} offset={offset} />;
}

type BlockRowProps = {
  blocks: Block[];
  index: number;
  instructionsId: string;
  problems: readonly string[] | undefined;
  handleRef: (element: HTMLButtonElement | null) => void;
  openRef: (element: HTMLButtonElement | null) => void;
  onHandleKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onChange: (update: BlocksUpdate) => void;
  onOpen: () => void;
  onRemove: (trigger: HTMLElement) => void;
};

function BlockRow({
  blocks,
  index,
  instructionsId,
  problems,
  handleRef,
  openRef,
  onHandleKey,
  onChange,
  onOpen,
  onRemove,
}: BlockRowProps) {
  const block = blocks[index];
  const problemId = useId();
  const position = index + 1;
  const typeLabel = BLOCK_TYPE_LABELS[block.type];
  const filled = BlockFilling.filledSessionCount(block);
  const total = block.sessions.length;
  const weeks = useWeeksField({
    block,
    onCommit: (value) =>
      onChange((current) =>
        replaceAt(current, index, { ...current[index], weeks: value }),
      ),
  });
  const [{ isDragging }, drag] = useDrag<
    DraggedBlock,
    void,
    { isDragging: boolean }
  >(
    () => ({
      type: PLAN_BLOCK,
      item: {
        id: block.id,
        index,
        label: `${position} ${typeLabel} · ${weeksText(block.weeks)}`,
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [block.id, index, typeLabel, block.weeks, position],
  );

  return (
    <div
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-card border border-border-default bg-surface-base p-2.5 shadow-card transition-opacity [grid-template-areas:"lead_open_remove"_"fields_fields_fields"] motion-reduce:transition-none @3xl:grid-cols-[auto_auto_minmax(0,1fr)_auto] @3xl:[grid-template-areas:"lead_fields_open_remove"]',
        { "opacity-40": isDragging },
      )}
      data-parity="block-row"
    >
      <div
        className="flex items-center gap-2 [grid-area:lead]"
        data-parity="block-row-lead"
      >
        <button
          aria-describedby={instructionsId}
          aria-label={`Reorder ${typeLabel} block`}
          className="relative hit-area flex size-(--size-control-sm) shrink-0 cursor-grab touch-none items-center justify-center rounded-field text-text-secondary hover:bg-surface-quiet hover:text-text-primary active:cursor-grabbing"
          onKeyDown={onHandleKey}
          ref={(element) => {
            drag(element);
            handleRef(element);
          }}
          type="button"
        >
          <GripVertical
            aria-hidden="true"
            data-parity="block-handle-icon"
            size={18}
          />
        </button>
        <BlockNumber block={block} index={index} size="sm" />
      </div>
      <div
        className="grid grid-cols-[minmax(0,16rem)_auto] items-center justify-start gap-x-3 [grid-area:fields] @3xl:flex @3xl:flex-wrap @3xl:gap-y-2"
        data-parity="block-row-fields"
      >
        <BlockTypeSelect
          appearance="field"
          label={`Type of block ${position}`}
          onChange={(type) =>
            onChange((current) =>
              replaceAt(
                current,
                index,
                blockEditing.blockWithType(current[index], type),
              ),
            )
          }
          problemId={problems ? problemId : undefined}
          value={block.type}
        />
        <WeeksField
          field={weeks}
          name={{ label: `Weeks of block ${position}` }}
        />
      </div>
      <button
        className="group/open flex min-h-(--size-hit-target) min-w-0 items-center gap-x-3 gap-y-1 rounded-field px-2 py-1 text-left [grid-area:open] hover:bg-surface-quiet"
        onClick={onOpen}
        ref={openRef}
        type="button"
      >
        <span
          className="grid min-w-0 flex-1 justify-items-start gap-1 @3xl:flex @3xl:flex-wrap @3xl:items-center @3xl:gap-x-3"
          data-parity="block-row-open-body"
        >
          <span
            className="text-sm break-words text-text-label"
            data-parity="block-row-split"
          >
            <span className="sr-only">{`Open block ${position}, ${typeLabel}: `}</span>
            {splitLabel(block)}
            <span className="sr-only">,</span>
          </span>
          <Badge
            className="tabular-nums"
            data-parity="block-row-sessions"
            tone={filled < total ? "pending" : "muted"}
          >
            {filledSessionsText(filled, total)}
          </Badge>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="shrink-0 text-text-secondary group-hover/open:text-text-primary"
          data-parity="block-row-arrow"
          size={16}
        />
      </button>
      <div className="ml-1 [grid-area:remove]" data-parity="block-row-remove">
        <Button
          aria-label={`Remove block ${position}, ${typeLabel}`}
          onClick={(event) => onRemove(event.currentTarget)}
          size="icon-xs"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <WeeksFieldNotes
        className="col-span-full -mt-2 @3xl:col-start-2"
        field={weeks}
      />
      {problems && (
        <div
          className="col-span-full grid gap-1"
          data-parity="block-row-problems"
          id={problemId}
        >
          {problems.map((problem) => (
            <InlineProblem key={problem}>{problem}</InlineProblem>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanBlockList({
  blocks,
  problems,
  onChange,
  onOpenBlock,
  onAddBlock,
}: PlanBlockListProps) {
  const instructionsId = useId();
  const announce = useEditorAnnouncer();
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const openers = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const confirm = useDestructiveConfirm();
  const focusAfterMove = useRef<string | null>(null);

  useEffect(() => {
    if (!focusAfterMove.current) return;
    handles.current.get(focusAfterMove.current)?.focus();
    focusAfterMove.current = null;
  }, [blocks]);

  function move(from: number, to: number) {
    const block = blocks[from];
    focusAfterMove.current = block.id;
    onChange((current) => moved(current, from, to));
    announce(
      `${BLOCK_TYPE_LABELS[block.type]} block moved to position ${to + 1} of ${blocks.length}`,
    );
  }

  function remove(index: number, trigger: HTMLElement) {
    const block = blocks[index];
    const neighbour = blocks[index + 1] ?? blocks[index - 1];
    confirm.request({
      ...removeBlockRequest({
        block,
        index,
        apply: () =>
          onChange((current) =>
            current.filter((other) => other.id !== block.id),
          ),
      }),
      returnFocus: trigger,
      focusAfterApply:
        (neighbour && openers.current.get(neighbour.id)) ?? addButton.current,
    });
  }

  function dropAt(item: DraggedBlock, index: number) {
    move(item.index, index > item.index ? index - 1 : index);
  }

  function handleKey(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    const target = { ArrowUp: index - 1, ArrowDown: index + 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    if (target >= 0 && target < blocks.length) move(index, target);
  }

  return (
    <div data-parity="block-list">
      <BlockDragLayer />
      <p className="sr-only" id={instructionsId}>
        Press arrow up or arrow down to move the block.
      </p>
      <ol aria-label="Blocks" className="@container">
        {blocks.map((block, index) => (
          <li key={block.id}>
            <DropLine index={index} onDrop={dropAt} />
            <BlockRow
              blocks={blocks}
              handleRef={(element) => {
                if (element) handles.current.set(block.id, element);
                else handles.current.delete(block.id);
              }}
              index={index}
              instructionsId={instructionsId}
              onChange={onChange}
              onHandleKey={(event) => handleKey(index, event)}
              onOpen={() => onOpenBlock(block.id)}
              onRemove={(trigger) => remove(index, trigger)}
              openRef={(element) => {
                if (element) openers.current.set(block.id, element);
                else openers.current.delete(block.id);
              }}
              problems={problems.get(block.id)}
            />
            {index === blocks.length - 1 && (
              <DropLine index={blocks.length} onDrop={dropAt} />
            )}
          </li>
        ))}
      </ol>
      <Button
        className="mt-2"
        onClick={onAddBlock}
        ref={addButton}
        variant="ghost"
      >
        <Plus aria-hidden="true" />
        Add block
      </Button>
      {confirm.dialog}
    </div>
  );
}
