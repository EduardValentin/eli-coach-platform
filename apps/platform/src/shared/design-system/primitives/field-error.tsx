import type { ComponentPropsWithoutRef } from "react";

type FieldErrorProps = Omit<
  ComponentPropsWithoutRef<"p">,
  "children" | "className"
> & {
  id: string;
  message: string | undefined;
};

export function FieldError({ message, ...props }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-feedback-danger" {...props}>
      {message}
    </p>
  );
}
