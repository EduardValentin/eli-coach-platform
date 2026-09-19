import * as React from "react";

import { cn } from "../lib/cn";

type LabelProps = React.ComponentPropsWithoutRef<"label"> & {
  htmlFor: string;
};

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      htmlFor={htmlFor}
      {...props}
    />
  ),
);

Label.displayName = "Label";
