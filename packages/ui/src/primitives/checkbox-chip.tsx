import * as React from "react";

import { cn } from "../lib/cn";
import { chipVariants } from "./chip";

type CheckboxChipProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "checked"
> & {
  children: React.ReactNode;
  isChecked: boolean;
};

export const CheckboxChip = React.forwardRef<
  HTMLInputElement,
  CheckboxChipProps
>(({ children, className, isChecked, ...props }, ref) => (
  <label
    className={cn(
      chipVariants({ tone: "checkbox" }),
      "relative justify-center",
      className,
    )}
    data-chip-control=""
    data-state={isChecked ? "on" : "off"}
  >
    <input
      checked={isChecked}
      className="absolute inset-0 cursor-pointer opacity-0"
      ref={ref}
      type="checkbox"
      {...props}
    />
    <span aria-hidden="true">{children}</span>
  </label>
));

CheckboxChip.displayName = "CheckboxChip";
