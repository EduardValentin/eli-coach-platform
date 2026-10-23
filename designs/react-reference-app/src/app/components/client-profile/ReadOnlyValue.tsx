import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { IconHint } from '../IconHint';
import { VALUE_CLASS } from '../typography';

type ReadOnlyValueProps = {
  value: ReactNode;
  hint: string;
  hintLabel: string;
  parity: string;
};

export function ReadOnlyValue({ value, hint, hintLabel, parity }: ReadOnlyValueProps) {
  return (
    <span className="flex items-center gap-2">
      <span className={VALUE_CLASS} data-parity={parity}>
        {value}
      </span>
      <IconHint
        label={hintLabel}
        icon={<Info aria-hidden="true" size={16} />}
        tone="muted"
        parity={`${parity}-hint`}
      >
        {hint}
      </IconHint>
    </span>
  );
}
