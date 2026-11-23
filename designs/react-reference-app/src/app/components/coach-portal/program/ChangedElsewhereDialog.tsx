import type { RefObject } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';

type ChangedElsewhereDialogProps = {
  open: boolean;
  onReload: () => void;
  returnFocusTo: RefObject<HTMLElement | null>;
};

/** The builder's copy is older than the saved draft: nothing here counts any more, so Reload is the only way on. */
export function ChangedElsewhereDialog({ open, onReload, returnFocusTo }: ChangedElsewhereDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        returnFocusTo={returnFocusTo}
        onEscapeKeyDown={event => event.preventDefault()}
        className="max-h-[80vh] gap-6 overflow-y-auto p-6 sm:max-w-md"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="leading-none">This draft changed elsewhere</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            It was saved from another tab or device after you opened it here, so what you changed just now wasn’t saved. Reload to see the newer draft.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 pt-2">
          <AlertDialogAction autoFocus onClick={onReload}>
            Reload
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
