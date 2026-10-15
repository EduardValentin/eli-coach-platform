import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';

import { cn } from './utils';

const Sheet = SheetPrimitive.Root;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-[70] bg-overlay-strong motion-safe:transition-opacity', className)}
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

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>
>(({ children, className, ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-0 z-[71] flex h-dvh w-full translate-x-full flex-col overflow-y-auto bg-surface-base p-6 text-text-primary shadow-floating outline-none motion-safe:transition-transform data-[state=open]:translate-x-0 motion-reduce:transition-none sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:max-w-lg',
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-5 top-5 inline-flex size-control-md items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary">
        <span aria-hidden="true" className="text-2xl leading-none">
          ×
        </span>
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
));

SheetContent.displayName = 'SheetContent';

export { Sheet, SheetContent, SheetDescription, SheetTitle };
