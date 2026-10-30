import { IconHint } from "~/shared/design-system/primitives";
import { Info } from "lucide-react";

import { CYCLE_MODE_LABELS } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/profile-fields";

const CYCLE_MODE_DEFINITIONS = [
  {
    term: CYCLE_MODE_LABELS.adapted,
    meaning:
      "the program keeps the same sessions all cycle and adds adjustment rules for the days she reports symptoms.",
  },
  {
    term: CYCLE_MODE_LABELS.general,
    meaning:
      "no cycle-driven adjustments; the low-energy session stays available.",
  },
] as const;

export function CycleModeInfo() {
  return (
    <IconHint
      contentParityRoot="CycleModeTooltip"
      icon={<Info aria-hidden="true" size={14} />}
      label="What cycle mode means"
      parity="cycle-mode-info"
      size="compact"
      tone="muted"
    >
      <dl className="space-y-1">
        {CYCLE_MODE_DEFINITIONS.map(({ term, meaning }) => (
          <div key={term}>
            <dt className="inline font-semibold">{term}</dt>{" "}
            <dd className="inline">— {meaning}</dd>
          </div>
        ))}
      </dl>
    </IconHint>
  );
}
