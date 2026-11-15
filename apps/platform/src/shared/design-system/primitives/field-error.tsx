import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

type FieldErrorProps = Omit<ComponentPropsWithoutRef<"p">, "children"> & {
  id: string;
  message: string | null | undefined;
};

export function FieldError({ message, className, ...props }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={cn("text-sm font-medium text-feedback-danger", className)}
      role="alert"
      {...props}
    >
      {message}
    </p>
  );
}
