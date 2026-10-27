import { AlertCircle } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

type InlineProblemProps = ComponentPropsWithoutRef<"p">;

export function InlineProblem({
  children,
  className,
  ...props
}: InlineProblemProps) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm leading-snug text-feedback-danger",
        className,
      )}
      {...props}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
      {children}
    </p>
  );
}
