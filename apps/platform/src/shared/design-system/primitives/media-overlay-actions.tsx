import { RefreshCw, X } from "lucide-react";
import type { ComponentPropsWithoutRef, Ref } from "react";

import type { DataAttributes } from "../lib/data-attributes";
import { Button } from "./button";

type MediaOverlayActionsProps = DataAttributes & {
  subject: string;
  onReplace: () => void;
  onRemove: () => void;
  disabled?: boolean;
  replaceRef?: Ref<HTMLButtonElement>;
  replaceProps?: Pick<
    ComponentPropsWithoutRef<"button">,
    "aria-invalid" | "aria-describedby"
  >;
};

export function MediaOverlayActions({
  subject,
  onReplace,
  onRemove,
  disabled,
  replaceRef,
  replaceProps,
  ...data
}: MediaOverlayActionsProps) {
  return (
    <div
      data-parity="media-overlay-actions"
      {...data}
      className="absolute inset-x-0 top-0 flex justify-end gap-2 bg-gradient-to-b from-surface-inverted/80 via-surface-inverted/40 to-transparent px-2 pt-2 pb-12"
      data-surface="inverted"
    >
      <Button
        aria-label={`Replace ${subject}`}
        disabled={disabled}
        onClick={onReplace}
        ref={replaceRef}
        size="xs"
        variant="glass"
        {...replaceProps}
      >
        <RefreshCw aria-hidden="true" size={12} />
        Replace
      </Button>
      <Button
        aria-label={`Remove ${subject}`}
        disabled={disabled}
        onClick={onRemove}
        size="xs"
        variant="glass"
      >
        <X aria-hidden="true" size={12} />
        Remove
      </Button>
    </div>
  );
}
