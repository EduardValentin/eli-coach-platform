import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react';
import {
  LIBRARY_ITEM_STATUSES,
  type LibraryItemStatus,
} from '../../domain/libraryLifecycle';
import { STATUS_LABELS } from '../../utils/libraryListing';
import { CountedSelect } from '../CountedSelect';
import { RowActionsMenu, type RowMenuAction } from '../RowActionsMenu';

export function LibraryStatusFilter({
  status,
  counts,
  onChoose,
}: {
  status: LibraryItemStatus;
  counts: Record<LibraryItemStatus, number>;
  onChoose: (status: LibraryItemStatus) => void;
}) {
  return (
    <CountedSelect
      label="Status"
      value={status}
      options={LIBRARY_ITEM_STATUSES}
      labels={STATUS_LABELS}
      counts={counts}
      onChoose={onChoose}
    />
  );
}

type LibraryItemActionsProps = {
  itemName: string;
  status: LibraryItemStatus;
  usage: string | undefined;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
};

export function LibraryItemActions({
  itemName,
  status,
  usage,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: LibraryItemActionsProps) {
  const lifecycleActions: RowMenuAction[] =
    status === 'active'
      ? [
          { name: 'edit', label: 'Edit', icon: Pencil, onSelect: onEdit },
          { name: 'archive', label: 'Archive', icon: Archive, onSelect: onArchive },
        ]
      : [{ name: 'restore', label: 'Restore', icon: ArchiveRestore, onSelect: onRestore }];
  const deleteAction: RowMenuAction = {
    name: 'delete',
    label: 'Delete',
    icon: Trash2,
    tone: 'destructive',
    disabledHint: usage,
    onSelect: onDelete,
  };

  return (
    <div className="flex items-center justify-end" data-parity="library-item-actions">
      <RowActionsMenu
        label={`Actions for ${itemName}`}
        parityRoot="LibraryItemActions"
        actions={[...lifecycleActions, deleteAction]}
      />
    </div>
  );
}
