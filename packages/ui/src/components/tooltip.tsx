import * as React from "react";
import { Tooltip as RadixTooltip } from "radix-ui";

import { cn } from "../lib/cn";

export type TooltipProps = {
  children: React.ReactNode;
  className?: string;
  /** Names the trigger for anyone who cannot see the icon on it. */
  label: string;
};

/**
 * An explanation attached to the control it explains, rather than sitting under
 * every field whether or not it is wanted.
 *
 * The trigger is a real button so it is reachable by keyboard: Radix opens the
 * tooltip on focus as well as hover, which a `title` attribute or a bare icon
 * would not do. `label` is what a screen reader announces on the trigger, and
 * the content is wired to it as the description.
 */
export function Tooltip({ children, className, label }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex size-[13px] shrink-0 items-center justify-center rounded-pill text-text-muted outline-none transition-colors hover:text-text-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
              className,
            )}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-full"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 7.2v4" strokeLinecap="round" />
              <circle cx="8" cy="4.9" r="0.7" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side="top"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 max-w-72 rounded-field bg-surface-inverted px-3 py-2 text-label text-text-inverted shadow-raised"
          >
            {children}
            <RadixTooltip.Arrow className="fill-surface-inverted" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
