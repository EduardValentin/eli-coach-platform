import type { ComponentPropsWithoutRef } from "react";

type FieldHintProps = Omit<ComponentPropsWithoutRef<"p">, "className"> & {
  id: string;
};

export function FieldHint(props: FieldHintProps) {
  return <p className="text-sm text-text-muted" {...props} />;
}
