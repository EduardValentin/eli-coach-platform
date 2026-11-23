import { ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type Ref } from "react";

import {
  cn,
  useIsDesktopViewport,
  WIDGET_TITLE_CLASS,
} from "~/shared/design-system/lib";
import { Button, RowActionsMenu } from "~/shared/design-system/primitives";

import {
  BLOCK_TYPE_LABELS,
  BlockLoss,
  type Block,
  type BlockType,
  type ProgramLanguage,
  type SplitShape,
  type TrainingDays,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BlockNumber } from "./block-number";
import { BlockTypeSelect } from "./block-parts";
import { BlockSettings } from "./block-settings";
import { blockEditing } from "./builder-editing";
import {
  removeBlockRequest,
  useDestructiveConfirm,
} from "./destructive-confirm";
import { usePlaceHeading } from "./place-heading";
import { useWeeksField } from "./weeks-field";

type BlockHeaderProps = {
  blocks: Block[];
  index: number;
  language: ProgramLanguage;
  onChange: (block: Block) => void;
  onRemove: () => void;
  measureRef: (header: HTMLElement | null) => void;
};

const REBUILD = "Rebuild sessions";

type Rebuild = {
  title: string;
  next: Block;
  lines: string[];
  returnFocus?: HTMLElement | null;
};
const COLLAPSE_AFTER_PX = 80;

function useScrolledPast(threshold: number) {
  const ref = useRef<HTMLElement | null>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    function onScroll(event: Event) {
      const container = event.target;
      if (
        !(container instanceof Element) ||
        !ref.current ||
        !container.contains(ref.current)
      ) {
        return;
      }
      setPast(container.scrollTop > threshold);
    }
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });

    return () =>
      document.removeEventListener("scroll", onScroll, { capture: true });
  }, [threshold]);

  return { ref, past };
}

function useCollapsingSettings() {
  const scroll = useScrolledPast(COLLAPSE_AFTER_PX);
  const isDesktop = useIsDesktopViewport();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const refocusToggle = useRef(false);
  const collapsible = isDesktop && scroll.past;

  useEffect(() => {
    if (!scroll.past) setSettingsOpen(false);
  }, [scroll.past]);

  useEffect(() => {
    if (!refocusToggle.current) return;
    refocusToggle.current = false;
    toggleButton.current?.focus();
  }, [settingsOpen]);

  function toggle() {
    refocusToggle.current = true;
    setSettingsOpen((open) => !open);
  }

  return {
    headerRef: scroll.ref,
    collapsible,
    collapsed: collapsible && !settingsOpen,
    toggleButton,
    toggle,
  };
}

type SettingsToggleProps = {
  expanded: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onToggle: () => void;
};

function SettingsToggle({
  expanded,
  buttonRef,
  onToggle,
}: SettingsToggleProps) {
  return (
    <Button
      aria-expanded={expanded}
      aria-label="Block settings"
      onClick={onToggle}
      ref={buttonRef}
      size="icon-sm"
      variant="ghost"
    >
      <ChevronDown
        aria-hidden="true"
        className={cn("transition-transform motion-reduce:transition-none", {
          "rotate-180": expanded,
        })}
      />
    </Button>
  );
}

type BarProps = { block: Block; index: number };

function CollapsedBlockBar({
  block,
  index,
  toggle,
}: BarProps & { toggle: SettingsToggleProps }) {
  return (
    <div
      className="flex items-center gap-3 py-2 pr-2 pl-4"
      data-parity="block-collapsed-bar"
    >
      <BlockNumber block={block} index={index} size="md" />
      <p className={cn(WIDGET_TITLE_CLASS, "truncate")}>
        {`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}
      </p>
      <div className="ml-auto">
        <SettingsToggle {...toggle} />
      </div>
    </div>
  );
}

type BlockActions = { onReset: () => void; onRemove: () => void };

type BlockTitleBarProps = BarProps & {
  toggle: SettingsToggleProps | null;
  actions: BlockActions;
  onChangeType: (type: BlockType) => void;
};

function BlockTitleBar({
  block,
  index,
  toggle,
  actions,
  onChangeType,
}: BlockTitleBarProps) {
  return (
    <div
      className="flex min-w-0 items-center gap-3 border-b border-border-subtle py-2.5 pr-2 pl-4"
      data-parity="block-title-bar"
    >
      <BlockNumber block={block} index={index} size="md" />
      <BlockTypeSelect
        appearance="title"
        label="Block type"
        onChange={onChangeType}
        value={block.type}
      />
      <div className="ml-auto flex items-center gap-1">
        {toggle && <SettingsToggle {...toggle} />}
        <RowActionsMenu
          actions={[
            {
              name: "reset",
              label: "Reset to split",
              icon: RotateCcw,
              onSelect: actions.onReset,
            },
            {
              name: "remove",
              label: "Remove block",
              icon: Trash2,
              tone: "destructive",
              onSelect: actions.onRemove,
            },
          ]}
          label="Block actions"
          parityRoot="BlockActionsMenu"
          size="xs"
        />
      </div>
    </div>
  );
}

export function BlockHeader({
  blocks,
  index,
  language,
  onChange,
  onRemove,
  measureRef,
}: BlockHeaderProps) {
  const block = blocks[index];
  const confirm = useDestructiveConfirm();
  const placeHeading = usePlaceHeading();
  const weeks = useWeeksField({
    block,
    onCommit: (value) => onChange({ ...block, weeks: value }),
  });
  const settings = useCollapsingSettings();

  function rebuild({ next, ...request }: Rebuild) {
    confirm.request({
      ...request,
      confirmLabel: REBUILD,
      apply: () => onChange(next),
    });
  }

  const changeShape = (shape: SplitShape, trigger: HTMLElement | null) =>
    rebuild({
      title: "Change the split?",
      next: blockEditing.blockWithSplit(block, shape, language),
      lines: BlockLoss.describe(block, { kind: "split" }),
      returnFocus: trigger,
    });
  const changeTrainingDays = (
    days: TrainingDays,
    trigger: HTMLElement | null,
  ) =>
    rebuild({
      title: "Change training days?",
      next: blockEditing.relayoutBlock(block, days),
      lines: BlockLoss.describe(block, { kind: "training-days", days }),
      returnFocus: trigger,
    });
  const actions: BlockActions = {
    onReset: () =>
      rebuild({
        title: "Reset to the split?",
        next: blockEditing.blockWithSplit(block, block.split.shape, language),
        lines: BlockLoss.describe(block, { kind: "reset" }),
      }),
    onRemove: () =>
      confirm.request({
        ...removeBlockRequest({ block, index, apply: onRemove }),
        focusAfterApply: () => placeHeading.current,
      }),
  };
  const { headerRef: scrollRef } = settings;
  const headerRef = useCallback(
    (element: HTMLElement | null) => {
      scrollRef.current = element;
      measureRef(element);
    },
    [scrollRef, measureRef],
  );
  const toggleControl = {
    buttonRef: settings.toggleButton,
    onToggle: settings.toggle,
  };

  return (
    <header
      className={cn(
        "z-10 rounded-card border border-border-default bg-surface-base shadow-card lg:sticky lg:-top-6",
        { "lg:rounded-t-none lg:border-t-0": settings.collapsed },
      )}
      data-parity="block-header"
      ref={headerRef}
    >
      <h2 className="sr-only">{BLOCK_TYPE_LABELS[block.type]}</h2>
      {settings.collapsed ? (
        <CollapsedBlockBar
          block={block}
          index={index}
          toggle={{ ...toggleControl, expanded: false }}
        />
      ) : (
        <>
          <BlockTitleBar
            actions={actions}
            block={block}
            index={index}
            onChangeType={(type) =>
              onChange(blockEditing.blockWithType(block, type))
            }
            toggle={
              settings.collapsible ? { ...toggleControl, expanded: true } : null
            }
          />
          <BlockSettings
            block={block}
            onChange={onChange}
            onChangeShape={changeShape}
            onChangeTrainingDays={changeTrainingDays}
            weeks={weeks}
          />
        </>
      )}
      {confirm.dialog}
    </header>
  );
}
