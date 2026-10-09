import * as React from "react";

import { Button } from "./button";
import { cn } from "./utils";

function Alert({
  className,
  action,
  children,
  ...props
}: React.ComponentProps<"div"> & { action?: React.ReactNode }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        "rounded-control border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm font-medium text-destructive",
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
  );
}

function AlertAction(
  props: Omit<React.ComponentProps<typeof Button>, "variant" | "size" | "type">,
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

export { Alert, AlertAction };
