import { X } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";

type MediaRemoveButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-label" | "children"
> & {
  "aria-label": string;
};

export function MediaRemoveButton({
  className,
  ...props
}: MediaRemoveButtonProps) {
  return (
    <Button
      className={cn("not-aria-disabled:hover:bg-surface-muted", className)}
      elevation="card"
      size="icon-xs"
      variant="outline"
      {...props}
    >
      <X aria-hidden="true" />
    </Button>
  );
}
