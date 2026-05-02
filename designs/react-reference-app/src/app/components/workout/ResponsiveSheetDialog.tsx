import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { useIsMobile } from '../ui/use-mobile';

interface ResponsiveSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function ResponsiveSheetDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveSheetDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          {description && <DrawerDescription className="sr-only">{description}</DrawerDescription>}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors z-10"
          >
            <X size={18} className="text-neutral-500" />
          </button>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
        {children}
      </DialogContent>
    </Dialog>
  );
}
