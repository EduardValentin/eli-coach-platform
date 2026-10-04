import { useRef } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export type ResourceManagement = {
  onEdit: () => void;
  onDelete: () => void;
};

export function ResourceActionsMenu({
  title,
  management,
}: {
  title: string;
  management: ResourceManagement;
}) {
  const chosenAction = useRef<(() => void) | null>(null);

  const runOnceFocusIsBackOnTheTrigger = () => {
    const action = chosenAction.current;
    chosenAction.current = null;
    action?.();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Actions for ${title}`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40"
        onCloseAutoFocus={runOnceFocusIsBackOnTheTrigger}
      >
        <DropdownMenuItem
          onSelect={() => {
            chosenAction.current = management.onEdit;
          }}
        >
          <Pencil aria-hidden="true" />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            chosenAction.current = management.onDelete;
          }}
          variant="destructive"
        >
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
