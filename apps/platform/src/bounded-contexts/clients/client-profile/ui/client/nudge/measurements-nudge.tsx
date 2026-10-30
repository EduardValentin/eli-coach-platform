import { WidgetLink } from "~/shared/design-system/portal";

import {
  MEASUREMENTS_COPY,
  type MeasurementsNudge as MeasurementsNudgeProps,
} from "~/bounded-contexts/clients/client-profile/public/measurements";
import { CLIENT_PROFILE_PATH } from "~/bounded-contexts/clients/client-profile/public/paths";

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
