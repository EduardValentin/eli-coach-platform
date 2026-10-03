import { Button } from "@eli-coach-platform/ui/primitives";

import {
  LET_ELI_START_NOW_LABEL,
  START_SOONER_NOTE,
} from "./program-status-copy";
import type { StartNow } from "./use-start-now";

export function StartNowOfferNote() {
  return (
    <p
      className="mt-3 max-w-2xl text-sm text-text-secondary"
      data-parity="start-sooner-note"
    >
      {START_SOONER_NOTE}
    </p>
  );
}

export function StartNowOfferAction({ startNow }: { startNow: StartNow }) {
  return (
    <Button
      data-parity="start-now"
      disabled={startNow.dialog.starting}
      onClick={startNow.askToConfirm}
      size="sm"
      variant="outline"
      width="full-below-sm"
    >
      {LET_ELI_START_NOW_LABEL}
    </Button>
  );
}
