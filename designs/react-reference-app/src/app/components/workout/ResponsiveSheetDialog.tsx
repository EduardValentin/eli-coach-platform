import { ReactNode, type RefObject } from 'react';
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

type SheetDialogWidth = 'full' | 'fit';

type SheetDialogRule = 'subtle' | 'faint';

const DIALOG_WIDTH_CLASS: Record<SheetDialogWidth, string> = {
  full: '',
  fit: 'sm:w-fit',
};

const RULE_COLOR_CLASS: Record<SheetDialogRule, string> = {
  subtle: 'border-border-subtle',
  faint: 'border-stroke-faint',
};

interface ResponsiveSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  width?: SheetDialogWidth;
  dismissal?: DialogDismissal;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export function ResponsiveSheetDialog({
  open,
  onOpenChange,
  title,
  description,
  width = 'full',
  dismissal = 'allowed',
  initialFocus,
  children,
}: ResponsiveSheetDialogProps) {
  const isMobile = useIsMobile();

  const focusInitialTarget = (event: Event) => {
    const target = initialFocus?.current;
    if (!target) return;

    event.preventDefault();
    target.focus();
  };

  if (isMobile) {
    return (
      <BottomSheet
        description={description}
        dismissal={dismissal}
        initialFocus={initialFocus}
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
        onOpenAutoFocus={focusInitialTarget}
        size="md"
        className={cn(
          'gap-0 p-0 overflow-hidden max-h-[85vh] flex flex-col',
          DIALOG_WIDTH_CLASS[width]
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
  rule = 'subtle',
  titleRef,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  rule?: SheetDialogRule;
  titleRef?: RefObject<HTMLHeadingElement>;
}) {
  return (
    <div
      data-parity="sheet-header"
      className={cn('shrink-0 border-b px-5 pt-6 pb-4 md:px-8 md:pt-8', RULE_COLOR_CLASS[rule])}
    >
      {eyebrow}
      <h3
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
        className="pr-10 text-lg font-semibold leading-snug text-text-primary outline-none md:text-xl"
      >
        {title}
      </h3>
      {description && (
        <p data-parity="sheet-description" className="mt-1 text-xs text-text-secondary sm:text-sm">
          {description}
        </p>
      )}
    </div>
  );
}

export function SheetDialogBody({ children }: { children: ReactNode }) {
  return (
    <div data-parity="sheet-body" className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
      {children}
    </div>
  );
}

export function SheetDialogFooter({
  rule = 'subtle',
  children,
}: {
  rule?: SheetDialogRule;
  children: ReactNode;
}) {
  return (
    <div className={cn('shrink-0 border-t bg-surface-base px-5 py-3 md:px-8 md:py-4', RULE_COLOR_CLASS[rule])}>
      {children}
    </div>
  );
}

export function SheetDialogActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">{children}</div>;
}
