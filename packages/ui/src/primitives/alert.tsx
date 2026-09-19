import * as React from "react";

import { cn } from "../lib/cn";

type AlertProps = React.ComponentPropsWithoutRef<"div">;

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-control border border-feedback-danger/30 bg-feedback-danger/5 px-4 py-3 text-left text-sm font-medium text-feedback-danger",
        className,
      )}
      {...props}
    />
  ),
);

Alert.displayName = "Alert";
