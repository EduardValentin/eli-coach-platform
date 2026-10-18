import type { ComponentProps, Ref } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button as ThemeButton } from "./ThemeButton";

type MediaOverlayActionsProps = {
  subject: string;
  onReplace: () => void;
  onRemove: () => void;
  disabled?: boolean;
  replaceRef?: Ref<HTMLButtonElement>;
  replaceProps?: Pick<
    ComponentProps<"button">,
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
}: MediaOverlayActionsProps) {
  return (
    <div
      className="absolute inset-x-0 top-0 flex justify-end gap-2 bg-gradient-to-b from-surface-inverted/80 via-surface-inverted/40 to-transparent px-2 pt-2 pb-12"
      data-surface="inverted"
      data-parity="media-overlay-actions"
    >
      <ThemeButton
        ref={replaceRef}
        type="button"
        aria-label={`Replace ${subject}`}
        onClick={onReplace}
        disabled={disabled}
        variant="glass"
        size="xs"
        {...replaceProps}
      >
        <RefreshCw size={12} aria-hidden="true" />
        Replace
      </ThemeButton>
      <ThemeButton
        type="button"
        aria-label={`Remove ${subject}`}
        onClick={onRemove}
        disabled={disabled}
        variant="glass"
        size="xs"
      >
        <X size={12} aria-hidden="true" />
        Remove
      </ThemeButton>
    </div>
  );
}
