import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type DialogDismissal,
} from '../ui/dialog';
import { BottomSheet } from '../ui/bottom-sheet';
import { useIsMobile } from '../ui/use-mobile';
import { cn } from '../ui/utils';

interface ResponsiveSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  contentClassName?: string;
  dismissal?: DialogDismissal;
  children: ReactNode;
}

export function ResponsiveSheetDialog({
  open,
  onOpenChange,
  title,
  description,
  contentClassName,
  dismissal = 'allowed',
  children,
}: ResponsiveSheetDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BottomSheet
        description={description}
        dismissal={dismissal}
        onOpenChange={onOpenChange}
        open={open}
        title={title}
      >
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dismissal={dismissal}
        size="md"
        className={cn(
          'gap-0 p-0 overflow-hidden max-h-[85vh] flex flex-col',
          contentClassName
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function SheetDialogHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="shrink-0 border-b border-border-subtle px-5 pt-6 pb-4 md:px-8 md:pt-8">
      {eyebrow}
      <h3 className="pr-10 text-lg font-semibold leading-snug text-text-primary md:text-xl">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">{description}</p>
      )}
    </div>
  );
}

export function SheetDialogBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
      {children}
    </div>
  );
}

export function SheetDialogActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">{children}</div>;
}
