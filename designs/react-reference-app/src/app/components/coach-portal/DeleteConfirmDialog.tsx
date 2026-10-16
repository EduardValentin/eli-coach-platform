import { ConfirmDialog } from '../ui/confirm-dialog';

export type DeletionSubject = {
  noun: string;
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
  return (
    <ConfirmDialog
      open={subject !== null}
      onOpenChange={(open) => !open && onCancel()}
      title={`Delete “${subject?.name}”?`}
      description="It’s removed for good. This can’t be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      tone="destructive"
    />
  );
}
