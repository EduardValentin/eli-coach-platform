import { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from './drawer';
import { cn } from './utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn('rounded-t-3xl max-h-[90vh]', className)}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {description && <DrawerDescription className="sr-only">{description}</DrawerDescription>}
        {children}
      </DrawerContent>
    </Drawer>
  );
}
