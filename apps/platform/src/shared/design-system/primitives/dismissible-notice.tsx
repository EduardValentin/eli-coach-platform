import { X } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";

type DismissibleNoticeProps = Omit<ComponentPropsWithoutRef<"div">, "role"> & {
  onDismiss: () => void;
};

export function DismissibleNotice({
  children,
  className,
  onDismiss,
  ...props
}: DismissibleNoticeProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-control border border-border-subtle bg-surface-base px-4 py-3 text-left",
        className,
      )}
      role="status"
      {...props}
    >
      <p className="flex-1 text-sm text-text-secondary">{children}</p>
      <Button
        aria-label="Dismiss"
        className="-mt-1 -mr-2 text-text-secondary"
        onClick={onDismiss}
        size="icon-xs"
        variant="outline"
      >
        <X aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}
