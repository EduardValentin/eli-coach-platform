import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@eli-coach-platform/ui/primitives";
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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={CYCLE_MODE_INFO_LABEL}
          className="-my-1.5 inline-flex size-6 items-center justify-center rounded-full"
          data-parity="fact-cycle-mode-info"
          type="button"
        >
          <Info aria-hidden="true" size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        align="start"
        className="max-w-sm text-pretty"
        collisionPadding={16}
        data-parity-root="CycleModeTooltip"
        side="bottom"
      >
        <dl className="space-y-1">
          {cycleModeDefinitions(gender).map(({ meaning, term }) => (
            <div key={term}>
              <dt className="inline font-semibold">{term}</dt>{" "}
              <dd className="inline">— {meaning}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}
