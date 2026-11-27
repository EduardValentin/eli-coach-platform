import { Ellipsis, TriangleAlert, type LucideIcon } from "lucide-react";
import { useRef, type Ref } from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";
import { DisabledActionHint } from "./disabled-action-hint";
import { HintPopover } from "./hint-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type RowMenuAction = {
  disabled?: boolean;
  disabledHint?: string;
  disabledReason?: string;
  icon?: LucideIcon;
  label: string;
  name: string;
  onSelect: () => void;
  tone?: "default" | "destructive";
};

type RowMenuSubmenu = {
  actions: ReadonlyArray<RowMenuAction>;
  icon: LucideIcon;
  label: string;
  name: string;
};

type RowMenuEntry = RowMenuAction | RowMenuSubmenu;

type RowActionsMenuSize = "xs" | "sm";

const TRIGGER_SIZE: Record<RowActionsMenuSize, "icon-xs" | "icon-sm"> = {
  sm: "icon-sm",
  xs: "icon-xs",
};

type RowActionsMenuProps = {
  actions: ReadonlyArray<RowMenuEntry>;
  label: string;
  parityRoot?: string;
  size?: RowActionsMenuSize;
  triggerRef?: Ref<HTMLButtonElement>;
};

type ChooseAction = (action: RowMenuAction) => (event: Event) => void;

function isHeldBack({ disabledHint, disabledReason }: RowMenuAction): boolean {
  return Boolean(disabledReason) || disabledHint !== undefined;
}

function isSubmenu(entry: RowMenuEntry): entry is RowMenuSubmenu {
  return "actions" in entry;
}

function RowMenuItem(props: {
  action: RowMenuAction;
  chooseAction: ChooseAction;
}) {
  const { action, chooseAction } = props;
  const {
    disabled,
    disabledHint,
    disabledReason,
    icon: Icon,
    name,
    tone,
  } = action;
  const flagged = disabledHint !== undefined;
  const heldBack = isHeldBack(action);
  const item = (
    <DropdownMenuItem
      aria-disabled={flagged ? true : undefined}
      className={cn({
        "aria-disabled:opacity-100": heldBack,
        "data-[variant=destructive]:focus:bg-primary-soft": flagged,
      })}
      data-parity={`row-action-${name}`}
      disabled={disabled}
      onSelect={chooseAction(action)}
      variant={tone}
    >
      {Icon && (
        <Icon aria-hidden="true" className={cn({ "opacity-50": heldBack })} />
      )}
      <span className={cn({ "opacity-50": heldBack })}>{action.label}</span>
      {flagged && (
        <span className="ml-auto flex pl-2">
          <TriangleAlert aria-hidden="true" className="text-feedback-warning" />
        </span>
      )}
    </DropdownMenuItem>
  );

  if (disabledReason) {
    return (
      <DisabledActionHint reason={disabledReason}>{item}</DisabledActionHint>
    );
  }

  return flagged ? (
    <HintPopover
      align="end"
      contentParity={`row-action-${name}-hint`}
      hint={disabledHint}
    >
      {item}
    </HintPopover>
  ) : (
    item
  );
}

function RowMenuSub(props: {
  chooseAction: ChooseAction;
  submenu: RowMenuSubmenu;
}) {
  const { chooseAction, submenu } = props;
  const { actions, icon: Icon, label, name } = submenu;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-parity={`row-action-${name}`}>
        <Icon aria-hidden="true" />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {actions.map((action) => (
          <RowMenuItem
            action={action}
            chooseAction={chooseAction}
            key={action.name}
          />
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function RowActionsMenu({
  actions,
  label,
  parityRoot = "RowActionsMenu",
  size = "sm",
  triggerRef,
}: RowActionsMenuProps) {
  const chosenAction = useRef<(() => void) | null>(null);

  if (actions.length === 0) {
    return null;
  }

  const runChosenAction = (event: Event) => {
    const action = chosenAction.current;
    chosenAction.current = null;
    if (!action) return;

    const focusedBefore = document.activeElement;
    action();
    if (document.activeElement !== focusedBefore) event.preventDefault();
  };

  const chooseAction: ChooseAction = (action) => (event) => {
    if (isHeldBack(action)) {
      event.preventDefault();
      return;
    }
    chosenAction.current = action.onSelect;
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          data-parity="row-actions-trigger"
          ref={triggerRef}
          size={TRIGGER_SIZE[size]}
          variant="ghost"
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40"
        data-parity-root={parityRoot}
        onCloseAutoFocus={runChosenAction}
      >
        {actions.map((entry) =>
          isSubmenu(entry) ? (
            <RowMenuSub
              chooseAction={chooseAction}
              key={entry.name}
              submenu={entry}
            />
          ) : (
            <RowMenuItem
              action={entry}
              chooseAction={chooseAction}
              key={entry.name}
            />
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
