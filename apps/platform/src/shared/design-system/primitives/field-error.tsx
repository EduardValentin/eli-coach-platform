import type { ComponentPropsWithoutRef } from "react";

import { InlineProblem } from "./inline-problem";

type FieldErrorProps = Omit<ComponentPropsWithoutRef<"p">, "children"> & {
  id: string;
  message: string | null | undefined;
};

export function FieldError({ message, ...props }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <InlineProblem role="alert" {...props}>
      {message}
    </InlineProblem>
  );
}
