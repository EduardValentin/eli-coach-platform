import { VALUE_CLASS } from "@eli-coach-platform/ui/lib";
import { IconHint } from "@eli-coach-platform/ui/primitives";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

type ReadOnlyValueProps = {
  value: ReactNode;
  hint: { text: string; label: string };
  parity: string;
};

export function ReadOnlyValue({ value, hint, parity }: ReadOnlyValueProps) {
  return (
    <span className="flex items-center gap-2">
      <span className={VALUE_CLASS} data-parity={parity}>
        {value}
      </span>
      <IconHint
        icon={<Info aria-hidden="true" size={16} />}
        label={hint.label}
        parity={`${parity}-hint`}
        tone="muted"
      >
        {hint.text}
      </IconHint>
    </span>
  );
}
