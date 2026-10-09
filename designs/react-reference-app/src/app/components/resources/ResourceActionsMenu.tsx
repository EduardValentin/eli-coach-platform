import { Pencil, Trash2 } from 'lucide-react';
import { RowActionsMenu } from '../RowActionsMenu';

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
  return (
    <RowActionsMenu
      label={`Actions for ${title}`}
      parityRoot="ResourceActionsMenu"
      actions={[
        { name: 'edit', label: 'Edit details', icon: Pencil, onSelect: management.onEdit },
        {
          name: 'delete',
          label: 'Delete',
          icon: Trash2,
          tone: 'destructive',
          onSelect: management.onDelete,
        },
      ]}
    />
  );
}
