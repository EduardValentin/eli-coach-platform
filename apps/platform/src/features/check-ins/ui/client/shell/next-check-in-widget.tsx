import { PortalWidget, WidgetLink } from "~/shared/design-system/portal";
import { DateTimeLabel } from "~/shared/design-system/primitives";
import { CalendarCheck } from "lucide-react";
import { useId } from "react";

import type { ClientCheckIn } from "~/features/check-ins/public/check-ins";
import {
  CLIENT_CHECK_INS_PATH,
  clientCheckInJoinPath,
} from "~/features/check-ins/public/paths";
import { checkInMomentOf } from "~/features/check-ins/ui/shared/check-ins/check-in-listing";
import { JoinMeetLink } from "~/features/check-ins/ui/shared/check-ins/join-meet-link";

type NextCheckInWidgetProps = {
  checkIn: ClientCheckIn;
  timeZone: string;
};

export function NextCheckInWidget({
  checkIn,
  timeZone,
}: NextCheckInWidgetProps) {
  const headingId = useId();

  return (
    <PortalWidget
      data-parity-root="NextCheckinCard"
      density="compact"
      footer={
        <WidgetLink
          className="w-full justify-center"
          to={CLIENT_CHECK_INS_PATH}
        >
          Manage check-ins
        </WidgetLink>
      }
      headingId={headingId}
      hero={
        <DateTimeLabel
          size="sm"
          when={checkInMomentOf(checkIn.startsAt, timeZone)}
        />
      }
      icon={CalendarCheck}
      title="Next check-in"
    >
      <JoinMeetLink
        checkIn={checkIn}
        className="mt-3"
        size="sm"
        to={clientCheckInJoinPath(checkIn.id)}
        width="full"
      />
    </PortalWidget>
  );
}
