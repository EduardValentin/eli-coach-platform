import * as React from "react";

import { cn } from "./utils";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm font-medium text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
