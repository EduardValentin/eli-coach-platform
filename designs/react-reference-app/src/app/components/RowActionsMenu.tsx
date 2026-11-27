import { useRef, type Ref } from 'react';
import { MoreHorizontal, TriangleAlert, type LucideIcon } from 'lucide-react';
import { DisabledActionHint } from './DisabledActionHint';
import { HintPopover } from './HintPopover';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from './ui/utils';

export type RowMenuAction = {
  name: string;
  label: string;
  icon?: LucideIcon;
  tone?: 'default' | 'destructive';
  disabled?: boolean;
  disabledHint?: string;
  disabledReason?: string;
  onSelect: () => void;
};

type RowMenuSubmenu = {
  name: string;
  label: string;
  icon: LucideIcon;
  actions: readonly RowMenuAction[];
};

type RowMenuEntry = RowMenuAction | RowMenuSubmenu;

type RowActionsMenuSize = 'xs' | 'sm';

const TRIGGER_SIZE: Record<RowActionsMenuSize, 'icon-xs' | 'icon-sm'> = {
  xs: 'icon-xs',
  sm: 'icon-sm',
};

function RowMenuItem({
  action,
  onChoose,
}: {
  action: RowMenuAction;
  onChoose: (run: () => void) => void;
}) {
  const { name, label, icon: Icon, tone, disabled, disabledHint, disabledReason, onSelect } = action;
  const flagged = disabledHint !== undefined;
  const blocked = flagged || Boolean(disabledReason);

  const item = (
    <DropdownMenuItem
      data-parity={`row-action-${name}`}
      disabled={disabled}
      aria-disabled={flagged ? true : undefined}
      className={cn({
        'aria-disabled:opacity-100': blocked,
        'data-[variant=destructive]:focus:bg-accent dark:data-[variant=destructive]:focus:bg-accent': flagged,
      })}
      onSelect={(event) => {
        if (blocked) {
          event.preventDefault();
          return;
        }
        onChoose(onSelect);
      }}
      variant={tone}
    >
      {Icon && <Icon aria-hidden="true" className={cn({ 'opacity-50': blocked })} />}
      <span className={cn({ 'opacity-50': blocked })}>{label}</span>
      {flagged && (
        <span className="ml-auto flex pl-2">
          <TriangleAlert aria-hidden="true" className="text-warning" />
        </span>
      )}
    </DropdownMenuItem>
  );

  if (disabledReason) {
    return <DisabledActionHint reason={disabledReason}>{item}</DisabledActionHint>;
  }

  if (!flagged) return item;

  return (
    <HintPopover hint={disabledHint} align="end" contentParity={`row-action-${name}-hint`}>
      {item}
    </HintPopover>
  );
}

function RowMenuSub({
  submenu,
  onChoose,
}: {
  submenu: RowMenuSubmenu;
  onChoose: (run: () => void) => void;
}) {
  const { name, label, icon: Icon, actions } = submenu;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-parity={`row-action-${name}`}>
        <Icon aria-hidden="true" />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {actions.map((action) => (
          <RowMenuItem key={action.name} action={action} onChoose={onChoose} />
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function isSubmenu(entry: RowMenuEntry): entry is RowMenuSubmenu {
  return 'actions' in entry;
}

export function RowActionsMenu({
  label,
  actions,
  size = 'sm',
  parityRoot = 'RowActionsMenu',
  triggerRef,
}: {
  label: string;
  actions: readonly RowMenuEntry[];
  size?: RowActionsMenuSize;
  parityRoot?: string;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const chosenAction = useRef<(() => void) | null>(null);

  if (actions.length === 0) return null;

  const chooseAction = (run: () => void) => {
    chosenAction.current = run;
  };

  const runOnceFocusIsBackOnTheTrigger = () => {
    const action = chosenAction.current;
    chosenAction.current = null;
    action?.();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
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
        {actions.map((entry) =>
          isSubmenu(entry) ? (
            <RowMenuSub key={entry.name} submenu={entry} onChoose={chooseAction} />
          ) : (
            <RowMenuItem key={entry.name} action={entry} onChoose={chooseAction} />
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
