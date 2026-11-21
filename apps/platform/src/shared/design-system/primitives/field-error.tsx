import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";
import { InlineProblem } from "./inline-problem";

type FieldErrorProps = Omit<ComponentPropsWithoutRef<"p">, "children"> & {
  id: string;
  message: string | null | undefined;
};

export function FieldError({ message, className, ...props }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <InlineProblem
      className={cn("gap-1.5 font-medium", className)}
      role="alert"
      {...props}
    >
      {message}
    </InlineProblem>
  );
}
