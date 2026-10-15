"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "./utils";

const LABEL_LAYOUT_CLASSES = {
  inline: "flex items-center gap-2",
  wrap: "flex flex-wrap items-baseline gap-1.5",
} as const;

const REQUIRED_MARK_PLACEMENTS = {
  inline: "-ml-1.5",
  wrap: "-ml-1",
  text: "ml-0.5",
} as const;

type LabelLayout = keyof typeof LABEL_LAYOUT_CLASSES;

type RequiredMarkPlacement = keyof typeof REQUIRED_MARK_PLACEMENTS;

function RequiredMark({
  placement = "text",
}: {
  placement?: RequiredMarkPlacement;
}) {
  return (
    <>
      <span aria-hidden="true" className={REQUIRED_MARK_PLACEMENTS[placement]}>
        *
      </span>{" "}
      <span className="sr-only">(required)</span>
    </>
  );
}

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  layout?: LabelLayout;
  required?: boolean;
  trailing?: React.ReactNode;
};

function Label({
  className,
  children,
  layout = "inline",
  required,
  trailing,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        LABEL_LAYOUT_CLASSES[layout],
        "text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required && <RequiredMark placement={layout} />}
      {trailing}
    </LabelPrimitive.Root>
  );
}

type LegendProps = React.ComponentProps<"legend"> & {
  required?: boolean;
  trailing?: React.ReactNode;
};

function Legend({
  className,
  children,
  required,
  trailing,
  ...props
}: LegendProps) {
  return (
    <legend
      className={cn(
        "text-sm font-medium text-text-label",
        LABEL_LAYOUT_CLASSES.wrap,
        "mb-1",
        className,
      )}
      {...props}
    >
      {children}
      {required && <RequiredMark placement="wrap" />}
      {trailing}
    </legend>
  );
}

function LabelSuffix({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("font-normal text-text-secondary", className)}
      {...props}
    />
  );
}

export { Label, LabelSuffix, Legend, RequiredMark };
export type { LabelProps };
