import { toast } from 'sonner';

interface ShowUndoToastArgs {
  message: string;
  onUndo: () => void;
  duration?: number;
  undoLabel?: string;
}

export function showUndoToast({ message, onUndo, duration = 6000, undoLabel = 'Undo' }: ShowUndoToastArgs) {
  toast.success(message, {
    duration,
    action: {
      label: undoLabel,
      onClick: onUndo,
    },
  });
}
