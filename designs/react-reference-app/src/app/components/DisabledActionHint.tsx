import { cloneElement, type ReactElement } from 'react';
import { HintPopover } from './HintPopover';

interface DisabledActionHintProps {
  reason: string;
  children: ReactElement;
}

export function DisabledActionHint({ reason, children }: DisabledActionHintProps) {
  return (
    <HintPopover
      hint={reason}
      side="top"
      align="center"
      contentParity="disabled-action-hint"
    >
      {cloneElement(children, { 'aria-disabled': true, onClick: undefined })}
    </HintPopover>
  );
}
