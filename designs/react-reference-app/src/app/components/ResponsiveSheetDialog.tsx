import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type DialogDismissal,
} from './ui/dialog';
import { BottomSheet } from './ui/bottom-sheet';
import { Button } from './ui/button';
import { useIsMobile } from './ui/use-mobile';
import { cn } from './ui/utils';

type SheetDialogWidth = 'full' | 'fit' | 'media';

type SheetDialogRule = 'subtle' | 'faint';

const DIALOG_WIDTH_CLASS: Record<SheetDialogWidth, string> = {
  full: '',
  fit: 'sm:w-fit',
  media: 'sm:max-w-4xl',
};

const RULE_COLOR_CLASS: Record<SheetDialogRule, string> = {
  subtle: 'border-border-subtle',
  faint: 'border-stroke-faint',
};

type ShownHeader = { description?: string };

const ShownHeaderContext = createContext<(header: ShownHeader | null) => void>(() => {});

type SheetClose = 'none' | 'shown';

const SheetCloseContext = createContext<SheetClose>('none');

interface ResponsiveSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  width?: SheetDialogWidth;
  sheetClose?: SheetClose;
  dismissal?: DialogDismissal;
  initialFocus?: RefObject<HTMLElement | null>;
  returnFocusTo?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export function ResponsiveSheetDialog({
  open,
  onOpenChange,
  title,
  description,
  width = 'full',
  sheetClose = 'none',
  dismissal = 'allowed',
  initialFocus,
  returnFocusTo,
  children,
}: ResponsiveSheetDialogProps) {
  const isMobile = useIsMobile();
  const [shownHeader, setShownHeader] = useState<ShownHeader | null>(null);
  const spokenDescription = shownHeader ? shownHeader.description : description;

  const focusInitialTarget = (event: Event) => {
    const target = initialFocus?.current;
    if (!target) return;

    event.preventDefault();
    target.focus();
  };

  if (isMobile) {
    return (
      <BottomSheet
        description={spokenDescription}
        dismissal={dismissal}
        initialFocus={initialFocus}
        returnFocusTo={returnFocusTo}
        labels={shownHeader ? 'shown' : 'spoken'}
        onOpenChange={onOpenChange}
        open={open}
        title={title}
      >
        <SheetCloseContext.Provider value={dismissal === 'allowed' ? sheetClose : 'none'}>
          <ShownHeaderContext.Provider value={setShownHeader}>{children}</ShownHeaderContext.Provider>
        </SheetCloseContext.Provider>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dismissal={dismissal}
        returnFocusTo={returnFocusTo}
        onOpenAutoFocus={focusInitialTarget}
        size="md"
        className={cn(
          'gap-0 p-0 overflow-hidden max-h-[85vh] flex flex-col',
          DIALOG_WIDTH_CLASS[width]
        )}
        {...(spokenDescription ? {} : { 'aria-describedby': undefined })}
      >
        {!shownHeader && (
          <>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
          </>
        )}
        <ShownHeaderContext.Provider value={setShownHeader}>{children}</ShownHeaderContext.Provider>
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
  const announceHeader = useContext(ShownHeaderContext);
  const close = useContext(SheetCloseContext);

  useLayoutEffect(() => {
    announceHeader({ description });
    return () => announceHeader(null);
  }, [announceHeader, description]);

  return (
    <div
      data-parity="sheet-header"
      className={cn('relative shrink-0 border-b px-5 pt-6 pb-4 md:px-8 md:pt-8', RULE_COLOR_CLASS[rule])}
    >
      {close === 'shown' && (
        <DialogPrimitive.Close asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Close" className="absolute top-4 right-3">
            <XIcon aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
      )}
      {eyebrow}
      <DialogPrimitive.Title
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
        className="pr-10 text-lg font-semibold leading-snug text-text-primary outline-none md:text-xl"
      >
        {title}
      </DialogPrimitive.Title>
      {description && (
        <DialogPrimitive.Description
          data-parity="sheet-description"
          className="mt-1 text-xs text-text-secondary sm:text-sm"
        >
          {description}
        </DialogPrimitive.Description>
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
    <div
      className={cn('shrink-0 border-t bg-surface-base px-5 py-3 md:px-8 md:py-4', RULE_COLOR_CLASS[rule])}
      data-parity="sheet-footer"
    >
      {children}
    </div>
  );
}

export function SheetDialogActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">{children}</div>;
}
