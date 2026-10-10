import { useRef } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export type RowMenuAction = {
  name: string;
  label: string;
  icon: LucideIcon;
  tone?: 'default' | 'destructive';
  disabled?: boolean;
  onSelect: () => void;
};

type RowActionsMenuSize = 'xs' | 'sm';

const TRIGGER_SIZE: Record<RowActionsMenuSize, 'icon-xs' | 'icon-sm'> = {
  xs: 'icon-xs',
  sm: 'icon-sm',
};

export function RowActionsMenu({
  label,
  actions,
  size = 'sm',
  parityRoot = 'RowActionsMenu',
}: {
  label: string;
  actions: readonly RowMenuAction[];
  size?: RowActionsMenuSize;
  parityRoot?: string;
}) {
  const chosenAction = useRef<(() => void) | null>(null);

  if (actions.length === 0) return null;

  const runOnceFocusIsBackOnTheTrigger = () => {
    const action = chosenAction.current;
    chosenAction.current = null;
    action?.();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          size={TRIGGER_SIZE[size]}
          type="button"
          variant="ghost"
          data-parity="row-actions-trigger"
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40"
        data-parity-root={parityRoot}
        onCloseAutoFocus={runOnceFocusIsBackOnTheTrigger}
      >
        {actions.map(({ name, label: itemLabel, icon: Icon, tone, disabled, onSelect }) => (
          <DropdownMenuItem
            key={name}
            data-parity={`row-action-${name}`}
            disabled={disabled}
            onSelect={() => {
              chosenAction.current = onSelect;
            }}
            variant={tone}
          >
            <Icon aria-hidden="true" />
            {itemLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
