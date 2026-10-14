import { Ellipsis, type LucideIcon } from "lucide-react";
import { useRef } from "react";

import { Button } from "./button";
import { DisabledActionHint } from "./disabled-action-hint";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type RowMenuAction = {
  disabled?: boolean;
  disabledReason?: string;
  icon: LucideIcon;
  label: string;
  name: string;
  onSelect: () => void;
  tone?: "default" | "destructive";
};

type RowActionsMenuSize = "xs" | "sm";

const TRIGGER_SIZE: Record<RowActionsMenuSize, "icon-xs" | "icon-sm"> = {
  sm: "icon-sm",
  xs: "icon-xs",
};

type RowActionsMenuProps = {
  actions: ReadonlyArray<RowMenuAction>;
  label: string;
  size?: RowActionsMenuSize;
};

export function RowActionsMenu({
  actions,
  label,
  size = "sm",
}: RowActionsMenuProps) {
  const chosenAction = useRef<(() => void) | null>(null);

  if (actions.length === 0) {
    return null;
  }

  const runOnceFocusIsBackOnTheTrigger = () => {
    const action = chosenAction.current;
    chosenAction.current = null;
    action?.();
  };

  const chooseAction = (action: RowMenuAction) => (event: Event) => {
    if (action.disabledReason) {
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
          size={TRIGGER_SIZE[size]}
          variant="ghost"
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40"
        data-parity-root="RowActionsMenu"
        onCloseAutoFocus={runOnceFocusIsBackOnTheTrigger}
      >
        {actions.map((action) => {
          const { disabled, disabledReason, icon: Icon, name, tone } = action;
          const item = (
            <DropdownMenuItem
              data-parity={`row-action-${name}`}
              disabled={disabled}
              key={name}
              onSelect={chooseAction(action)}
              variant={tone}
            >
              <Icon aria-hidden="true" />
              <span>{action.label}</span>
            </DropdownMenuItem>
          );

          return disabledReason ? (
            <DisabledActionHint key={name} reason={disabledReason}>
              {item}
            </DisabledActionHint>
          ) : (
            item
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
