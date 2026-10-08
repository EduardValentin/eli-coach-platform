import { WidgetLink } from "@eli-coach-platform/ui/portal";

import {
  MEASUREMENTS_COPY,
  type MeasurementsNudge as MeasurementsNudgeProps,
} from "~/features/client-profile/public/measurements";
import { CLIENT_PROFILE_PATH } from "~/features/client-profile/public/paths";

export function MeasurementsNudge({ dueLine }: MeasurementsNudgeProps) {
  if (!dueLine) return null;

  return (
    <p className="mb-8" data-parity-root="MeasurementsNudge">
      <WidgetLink to={CLIENT_PROFILE_PATH} trailing="arrow">
        {MEASUREMENTS_COPY.nudge[dueLine]}
      </WidgetLink>
    </p>
  );
}
