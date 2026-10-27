import * as React from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";

type AlertProps = React.ComponentPropsWithoutRef<"div"> & {
  action?: React.ReactNode;
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ action, children, className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      data-slot="alert"
      className={cn(
        "rounded-control border border-feedback-danger/30 bg-feedback-danger/5 px-4 py-3 text-left text-sm font-medium text-feedback-danger",
        { "flex flex-wrap items-center gap-x-4 gap-y-3": action },
        className,
      )}
      {...props}
    >
      {action ? (
        <>
          <div data-slot="alert-message" className="min-w-48 flex-1">
            {children}
          </div>
          {action}
        </>
      ) : (
        children
      )}
    </div>
  ),
);

Alert.displayName = "Alert";

export function AlertAction(
  props: Omit<
    React.ComponentPropsWithoutRef<typeof Button>,
    "variant" | "size" | "type"
  >,
) {
  return (
    <Button
      data-slot="alert-action"
      type="button"
      variant="outline"
      size="xs"
      {...props}
    />
  );
}
