import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { Select as RadixSelect } from "radix-ui";

import { cn } from "../lib/cn";
import { fieldSizeClasses, type FieldSize } from "./field-size";

export const Select = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;

type SelectTriggerProps = React.ComponentPropsWithoutRef<
  typeof RadixSelect.Trigger
> & {
  size?: FieldSize;
};

// Safari's default Tab order visits text fields only and skips buttons unless
// they carry an explicit tabindex; a control that stands in for a form field
// must stay reachable like the native field it replaces.
const FIELD_TAB_INDEX = 0;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Trigger>,
  SelectTriggerProps
>(({ children, className, size = "md", ...props }, ref) => (
  <RadixSelect.Trigger
    className={cn(
      "flex w-full min-w-0 items-center justify-between gap-2 whitespace-nowrap rounded-field border border-control-border-soft bg-surface-base py-1 outline-none transition-[color,box-shadow] data-[placeholder]:text-text-muted focus-visible:border-border-focus aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-2 [&>span:first-child]:overflow-hidden [&>span:first-child]:whitespace-nowrap",
      fieldSizeClasses({ size }),
      className,
    )}
    ref={ref}
    tabIndex={FIELD_TAB_INDEX}
    {...props}
  >
    {children}
    <RadixSelect.Icon asChild>
      <ChevronDown
        aria-hidden="true"
        className="size-4 shrink-0 text-text-muted opacity-50"
      />
    </RadixSelect.Icon>
  </RadixSelect.Trigger>
));

SelectTrigger.displayName = "SelectTrigger";

type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof RadixSelect.Content
>;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  SelectContentProps
>(({ children, className, position = "popper", ...props }, ref) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      className={cn(
        "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-field border bg-surface-base text-text-primary shadow-action motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out] motion-safe:data-[state=open]:animate-[ui-popover-in_150ms_ease-out]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      ref={ref}
      {...props}
    >
      <SelectScrollUpButton />
      <RadixSelect.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
        )}
      >
        {children}
      </RadixSelect.Viewport>
      <SelectScrollDownButton />
    </RadixSelect.Content>
  </RadixSelect.Portal>
));

SelectContent.displayName = "SelectContent";

function SelectScrollUpButton(
  props: React.ComponentPropsWithoutRef<typeof RadixSelect.ScrollUpButton>,
) {
  const { className, ...rest } = props;

  return (
    <RadixSelect.ScrollUpButton
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...rest}
    >
      <ChevronUp aria-hidden="true" className="size-4 text-text-muted" />
    </RadixSelect.ScrollUpButton>
  );
}

function SelectScrollDownButton(
  props: React.ComponentPropsWithoutRef<typeof RadixSelect.ScrollDownButton>,
) {
  const { className, ...rest } = props;

  return (
    <RadixSelect.ScrollDownButton
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...rest}
    >
      <ChevronDown aria-hidden="true" className="size-4 text-text-muted" />
    </RadixSelect.ScrollDownButton>
  );
}

type SelectItemProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Item>;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  SelectItemProps
>(({ children, className, ...props }, ref) => (
  <RadixSelect.Item
    className={cn(
      "relative flex w-full cursor-default items-center gap-2 rounded-tile py-1.5 pr-8 pl-2 text-sm outline-none select-none focus:bg-surface-neutral focus:text-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
      className,
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute right-2 flex size-3.5 items-center justify-center">
      <RadixSelect.ItemIndicator>
        <Check aria-hidden="true" className="size-4 text-text-muted" />
      </RadixSelect.ItemIndicator>
    </span>
    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
  </RadixSelect.Item>
));

SelectItem.displayName = "SelectItem";
