import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { BottomSheet } from '../ui/bottom-sheet';
import { useIsMobile } from '../ui/use-mobile';
import { cn } from '../ui/utils';

interface ResponsiveSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function ResponsiveSheetDialog({
  open,
  onOpenChange,
  title,
  description,
  contentClassName,
  children,
}: ResponsiveSheetDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-2xl gap-0 p-0 overflow-hidden max-h-[85vh] flex flex-col',
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
