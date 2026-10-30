import { Button, RowActionsMenu } from "~/shared/design-system/primitives";
import { Pencil, Trash2 } from "lucide-react";

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
  return (
    <RowActionsMenu
      actions={[
        {
          icon: Pencil,
          label: COPY.edit,
          name: "edit",
          onSelect: management.onEdit,
        },
        {
          icon: Trash2,
          label: COPY.delete,
          name: "delete",
          onSelect: management.onDelete,
          tone: "destructive",
        },
      ]}
      label={`Actions for ${title}`}
    />
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
