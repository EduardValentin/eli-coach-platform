import * as React from "react";

import { fieldStateClass, fieldSurfaceClass } from "./input";
import { cn } from "./utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        fieldSurfaceClass,
        "resize-none placeholder:text-muted-foreground field-sizing-content min-h-16 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50",
        fieldStateClass,
        className,
      )}
      {...props}
    />
));
Textarea.displayName = "Textarea";

export { Textarea };
