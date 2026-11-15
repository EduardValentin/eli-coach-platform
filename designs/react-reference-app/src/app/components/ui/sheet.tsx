import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';

import { OpenStateContext, useOpenState, useTriggerControls } from './open-state';
import { useReturnFocusToOpener } from './use-return-focus-to-opener';
import { cn } from './utils';

function Sheet({ open, defaultOpen, onOpenChange, ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const openState = useOpenState({ open, defaultOpen, onOpenChange });

  return (
    <OpenStateContext.Provider value={openState.open}>
      <SheetPrimitive.Root {...props} {...openState} />
    </OpenStateContext.Provider>
  );
}

const SheetTrigger = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>
>((props, ref) => {
  const controls = useTriggerControls();

  return <SheetPrimitive.Trigger ref={ref} {...controls} {...props} />;
});

SheetTrigger.displayName = 'SheetTrigger';

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-sheet-overlay bg-overlay-strong motion-safe:transition-opacity', className)}
    {...props}
  />
));

SheetOverlay.displayName = 'SheetOverlay';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('pr-12 font-serif text-display-sm font-medium text-text-primary', className)}
    {...props}
  />
));

SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('mt-2 text-sm text-text-secondary', className)}
    {...props}
  />
));

SheetDescription.displayName = 'SheetDescription';

const sheetContentVariants = cva(
  'fixed z-sheet flex h-dvh flex-col overflow-y-auto bg-surface-base text-text-primary shadow-floating outline-none motion-safe:transition-transform data-[state=open]:translate-x-0 motion-reduce:transition-none',
  {
    variants: {
      side: {
        right: 'inset-0 w-full translate-x-full p-6 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:max-w-lg',
        left: 'inset-y-0 left-0 w-80 max-w-full -translate-x-full pt-16',
      },
      padding: {
        default: '',
        flush: 'p-0',
      },
      width: {
        default: '',
        sm: 'sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
      padding: 'default',
      width: 'default',
    },
  },
);

type SheetContentProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetContentVariants> & {
    closeButtonRef?: React.Ref<HTMLButtonElement>;
  };

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ children, className, side, padding, width, closeButtonRef, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
    const { rememberOpener, returnFocusToOpener } = useReturnFocusToOpener();

    const openWithOpenerRemembered = (event: Event) => {
      rememberOpener();
      onOpenAutoFocus?.(event);
    };

    const closeWithFocusReturned = (event: Event) => {
      onCloseAutoFocus?.(event);
      if (!event.defaultPrevented) returnFocusToOpener(event);
    };

    return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetContentVariants({ side, padding, width }), className)}
        onOpenAutoFocus={openWithOpenerRemembered}
        onCloseAutoFocus={closeWithFocusReturned}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          ref={closeButtonRef}
          className="absolute right-5 top-4 inline-flex size-control-md items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            ×
          </span>
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
    );
  },
);

SheetContent.displayName = 'SheetContent';

export { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
