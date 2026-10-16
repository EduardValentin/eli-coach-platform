import { useState } from 'react';
import { toast } from 'sonner';
import type { DeletionSubject } from '../components/coach-portal/DeleteConfirmDialog';
import type { LibraryDeletion } from '../domain/libraryLifecycle';

type LibraryItem = {
  id: string;
  name: string;
};

type LibraryOperations = {
  noun: string;
  archive: (id: string) => void;
  restore: (id: string) => LibraryItem;
  remove: (id: string) => LibraryDeletion;
};

export function useLibraryLifecycle(operations: LibraryOperations) {
  const [pendingDeletion, setPendingDeletion] = useState<LibraryItem | null>(null);

  const archive = (item: LibraryItem) => {
    operations.archive(item.id);
    toast.success(`"${item.name}" archived`);
  };

  const restore = (item: LibraryItem) => {
    const restored = operations.restore(item.id);
    toast.success(
      restored.name === item.name
        ? `"${item.name}" restored`
        : `"${item.name}" restored as "${restored.name}"`,
    );
  };

  const confirmDeletion = () => {
    if (!pendingDeletion) return;
    if (operations.remove(pendingDeletion.id) === 'deleted') {
      toast.success(`"${pendingDeletion.name}" deleted`);
    } else {
      toast.error(`"${pendingDeletion.name}" is in use, so it was not deleted`);
    }
    setPendingDeletion(null);
  };

  const deletionSubject: DeletionSubject | null = pendingDeletion
    ? { noun: operations.noun, name: pendingDeletion.name }
    : null;

  return {
    archive,
    restore,
    requestDeletion: setPendingDeletion,
    deletionSubject,
    confirmDeletion,
    cancelDeletion: () => setPendingDeletion(null),
  };
}
