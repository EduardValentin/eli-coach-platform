import { cloneElement, type HTMLAttributes, type ReactElement } from "react";

import { HintPopover } from "./hint-popover";

type DisabledActionHintProps = {
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  reason: string;
};

export function DisabledActionHint({
  children,
  reason,
}: DisabledActionHintProps) {
  return (
    <HintPopover
      align="center"
      contentParity="disabled-action-hint"
      hint={reason}
      side="top"
    >
      {cloneElement(children, { "aria-disabled": true, onClick: undefined })}
    </HintPopover>
  );
}
