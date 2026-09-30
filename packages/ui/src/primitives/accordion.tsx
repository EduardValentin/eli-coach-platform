import { ChevronDown } from "lucide-react";
import * as React from "react";
import { Accordion as RadixAccordion } from "radix-ui";

import { cn } from "../lib/cn";

export function Accordion(
  props: React.ComponentPropsWithoutRef<typeof RadixAccordion.Root>,
) {
  return <RadixAccordion.Root data-slot="accordion" {...props} />;
}

export function AccordionItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixAccordion.Item>) {
  return (
    <RadixAccordion.Item
      className={cn("border-b border-border-subtle last:border-b-0", className)}
      data-slot="accordion-item"
      {...props}
    />
  );
}

type AccordionHeadingTag = "h2" | "h3";

type AccordionTriggerProps = React.ComponentPropsWithoutRef<
  typeof RadixAccordion.Trigger
> & {
  headingTag?: AccordionHeadingTag;
  headingId?: string;
};

export function AccordionTrigger({
  children,
  className,
  headingTag: HeadingTag = "h3",
  headingId,
  ...props
}: AccordionTriggerProps) {
  return (
    <RadixAccordion.Header asChild>
      <HeadingTag className="flex" id={headingId}>
        <RadixAccordion.Trigger
          className={cn(
            "flex flex-1 items-start justify-between gap-4 rounded-field py-4 text-left text-sm font-medium transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
            className,
          )}
          data-slot="accordion-trigger"
          {...props}
        >
          {children}
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-text-secondary motion-safe:transition-transform motion-safe:duration-200"
          />
        </RadixAccordion.Trigger>
      </HeadingTag>
    </RadixAccordion.Header>
  );
}

export function AccordionContent({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixAccordion.Content>) {
  return (
    <RadixAccordion.Content
      className="overflow-hidden text-sm motion-safe:data-[state=closed]:animate-[ui-accordion-up_200ms_ease-out] motion-safe:data-[state=open]:animate-[ui-accordion-down_200ms_ease-out]"
      data-slot="accordion-content"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </RadixAccordion.Content>
  );
}
