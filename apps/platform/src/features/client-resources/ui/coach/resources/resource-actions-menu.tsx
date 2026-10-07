import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@eli-coach-platform/ui/primitives";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useRef } from "react";

export type ResourceManagement = {
  onEdit: () => void;
  onDelete: () => void;
};

const COPY = {
  edit: "Edit details",
  delete: "Delete",
} as const;

type ResourceActionsMenuProps = {
  title: string;
  management: ResourceManagement;
};

export function ResourceActionsMenu({
  title,
  management,
}: ResourceActionsMenuProps) {
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
          variant="ghost"
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40"
        data-parity-root="ResourceActionsMenu"
        onCloseAutoFocus={runOnceFocusIsBackOnTheTrigger}
      >
        <DropdownMenuItem
          onSelect={() => {
            chosenAction.current = management.onEdit;
          }}
        >
          <Pencil aria-hidden="true" />
          {COPY.edit}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            chosenAction.current = management.onDelete;
          }}
          variant="destructive"
        >
          <Trash2 aria-hidden="true" />
          {COPY.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ResourceDetailsActionsProps = {
  management: ResourceManagement;
};

export function ResourceDetailsActions({
  management,
}: ResourceDetailsActionsProps) {
  return (
    <div className="flex gap-2" data-parity="viewer-management">
      <Button
        className="flex-1"
        onClick={management.onEdit}
        size="sm"
        variant="outline"
      >
        {COPY.edit}
      </Button>
      <Button
        className="flex-1"
        onClick={management.onDelete}
        size="sm"
        variant="destructive-outline"
      >
        {COPY.delete}
      </Button>
    </div>
  );
}
