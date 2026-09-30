import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { IconHint } from "@eli-coach-platform/ui/primitives";
import { Info } from "lucide-react";

import {
  CYCLE_MODE_INFO_LABEL,
  cycleModeDefinitions,
} from "~/features/client-onboarding/contracts/onboarding-review-copy";

type CycleModeInfoProps = {
  gender: VisitorGender;
};

export function CycleModeInfo({ gender }: CycleModeInfoProps) {
  return (
    <IconHint
      className="-my-1.5"
      contentParityRoot="CycleModeTooltip"
      icon={<Info aria-hidden="true" size={16} />}
      label={CYCLE_MODE_INFO_LABEL}
      parity="fact-cycle-mode-info"
    >
      <dl className="space-y-1">
        {cycleModeDefinitions(gender).map(({ meaning, term }) => (
          <div key={term}>
            <dt className="inline font-semibold">{term}</dt>{" "}
            <dd className="inline">— {meaning}</dd>
          </div>
        ))}
      </dl>
    </IconHint>
  );
}
