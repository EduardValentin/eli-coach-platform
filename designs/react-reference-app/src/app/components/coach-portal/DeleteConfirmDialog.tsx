import { useState } from 'react';
import { ConfirmDialog } from '../ui/confirm-dialog';

export type DeletionSubject = {
  name: string;
};

export function DeleteConfirmDialog({
  subject,
  onConfirm,
  onCancel,
}: {
  subject: DeletionSubject | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [shownName, setShownName] = useState(subject?.name ?? '');
  if (subject && subject.name !== shownName) {
    setShownName(subject.name);
  }

  return (
    <ConfirmDialog
      open={subject !== null}
      onOpenChange={(open) => !open && onCancel()}
      title={`Delete “${shownName}”?`}
      description="It’s removed for good. This can’t be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      tone="destructive"
    />
  );
}
