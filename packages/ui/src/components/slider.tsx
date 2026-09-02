import * as React from "react";
import { Slider as RadixSlider } from "radix-ui";

import { cn } from "../lib/cn";

export type SliderProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixSlider.Root>,
  "children"
>;

/**
 * A single-thumb range control. Radix puts `role="slider"` on the thumb rather
 * than the root, so the id and the labelling go there too — left on the root
 * they would name a plain wrapper and the control itself would be announced as
 * a bare number.
 */
export function Slider({
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SliderProps) {
  return (
    <RadixSlider.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      {...props}
    >
      <RadixSlider.Track className="relative h-2 w-full grow overflow-hidden rounded-pill bg-surface-subtle">
        <RadixSlider.Range className="absolute h-full bg-brand-primary" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="block size-5 shrink-0 rounded-pill border-2 border-brand-primary bg-surface-base shadow-soft transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50"
      />
    </RadixSlider.Root>
  );
}
