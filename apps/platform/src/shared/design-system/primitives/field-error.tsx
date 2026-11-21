import { AlertCircle } from "lucide-react";
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
      className={cn(
        "flex items-start gap-1.5 text-sm leading-snug font-medium text-feedback-danger",
        className,
      )}
      role="alert"
      {...props}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
      {message}
    </p>
  );
}
