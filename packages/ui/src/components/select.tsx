import * as React from "react";
import { cva } from "class-variance-authority";
import { Select as RadixSelect } from "radix-ui";

import { cn } from "../lib/cn";

function ChevronDownIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" {...props}>
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
    </svg>
  );
}

function ChevronUpIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" {...props}>
      <path d="m5 12.5 5-5 5 5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
    </svg>
  );
}

function CheckIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" {...props}>
      <path d="m5.5 10 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
    </svg>
  );
}

const selectTriggerVariants = cva(
  "flex w-full items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-base px-4 py-2 text-left text-text-primary shadow-soft transition-[background-color,border-color,color,box-shadow] outline-none data-[placeholder]:text-text-muted focus-visible:border-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary aria-invalid:border-feedback-danger aria-invalid:outline-feedback-danger disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-muted disabled:shadow-none",
  {
    variants: {
      size: {
        sm: "min-h-[var(--size-control-sm)] text-body-sm",
        md: "min-h-[var(--size-control-md)] text-body-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type SelectProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Root>;

export function Select(props: SelectProps) {
  return <RadixSelect.Root {...props} />;
}

export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

export type SelectTriggerProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger> & {
  size?: "sm" | "md";
};

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Trigger>,
  SelectTriggerProps
>(({ children, className, size = "md", ...props }, ref) => (
  <RadixSelect.Trigger
    ref={ref}
    className={cn(selectTriggerVariants({ size }), className)}
    {...props}
  >
    {children}
    <RadixSelect.Icon className="shrink-0 text-text-muted">
      <ChevronDownIcon className="size-4" />
    </RadixSelect.Icon>
  </RadixSelect.Trigger>
));

SelectTrigger.displayName = "SelectTrigger";

export type SelectContentProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Content>;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  SelectContentProps
>(({ children, className, position = "popper", ...props }, ref) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      ref={ref}
      position={position}
      className={cn(
        "relative z-50 max-h-[var(--radix-select-content-available-height)] overflow-hidden rounded-md border border-border-subtle bg-surface-base text-text-primary shadow-raised",
        "min-w-[calc(var(--space-10)+var(--space-6))]",
        position === "popper" && "min-w-[var(--radix-select-trigger-width)]",
        className,
      )}
      {...props}
    >
      <RadixSelect.ScrollUpButton className="flex items-center justify-center py-2 text-text-muted">
        <ChevronUpIcon className="size-4" />
      </RadixSelect.ScrollUpButton>
      <RadixSelect.Viewport
        className={cn("p-1", position === "popper" && "w-full")}
      >
        {children}
      </RadixSelect.Viewport>
      <RadixSelect.ScrollDownButton className="flex items-center justify-center py-2 text-text-muted">
        <ChevronDownIcon className="size-4" />
      </RadixSelect.ScrollDownButton>
    </RadixSelect.Content>
  </RadixSelect.Portal>
));

SelectContent.displayName = "SelectContent";

export const SelectScrollUpButton = RadixSelect.ScrollUpButton;
export const SelectScrollDownButton = RadixSelect.ScrollDownButton;

export type SelectLabelProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Label>;

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Label>,
  SelectLabelProps
>(({ className, ...props }, ref) => (
  <RadixSelect.Label
    ref={ref}
    className={cn("px-3 py-2 text-label text-text-secondary", className)}
    {...props}
  />
));

SelectLabel.displayName = "SelectLabel";

export type SelectItemProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Item>;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  SelectItemProps
>(({ children, className, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-3 pr-8 text-body-sm text-text-primary outline-none focus:bg-brand-primary-soft focus:text-text-primary data-[disabled]:pointer-events-none data-[disabled]:text-text-muted",
      className,
    )}
    {...props}
  >
    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    <span className="absolute right-3 flex size-4 items-center justify-center text-brand-primary">
      <RadixSelect.ItemIndicator>
        <CheckIcon className="size-4" />
      </RadixSelect.ItemIndicator>
    </span>
  </RadixSelect.Item>
));

SelectItem.displayName = "SelectItem";

export type SelectSeparatorProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Separator>;

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Separator>,
  SelectSeparatorProps
>(({ className, ...props }, ref) => (
  <RadixSelect.Separator
    ref={ref}
    className={cn("my-1 h-px bg-border-subtle", className)}
    {...props}
  />
));

SelectSeparator.displayName = "SelectSeparator";
