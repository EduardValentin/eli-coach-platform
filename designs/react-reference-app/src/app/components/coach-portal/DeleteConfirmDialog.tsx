import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

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
    <AlertDialog open={subject !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="sm:max-w-md rounded-card">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-text-primary">
            Delete this {subject?.noun}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            <span className="font-medium text-text-primary">"{subject?.name}"</span> will be permanently
            removed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
          <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive" className="flex-1">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
