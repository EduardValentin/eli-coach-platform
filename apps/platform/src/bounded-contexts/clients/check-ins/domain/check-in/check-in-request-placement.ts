import { CheckIn } from "./check-in";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInRequestResult, CheckInsPort } from "./check-ins-port";
import type { CoachTimePort } from "./coach-time-port";

type CheckInRequestPlacementOptions = {
  checkInsPort: Pick<CheckInsPort, "listForClientLocked" | "add">;
  coachTimePort: Pick<CoachTimePort, "reserve">;
};

type CheckInRequestCommand = { checkIn: CheckIn; at: Date };

export class CheckInRequestPlacement {
  constructor(private readonly options: CheckInRequestPlacementOptions) {}

  async place({
    checkIn,
    at,
  }: CheckInRequestCommand): Promise<CheckInRequestResult> {
    const { checkInsPort, coachTimePort } = this.options;
    const decision = CheckIn.decideRequest({
      initiatedBy: checkIn.initiatedBy,
      clientCheckIns: await checkInsPort.listForClientLocked(checkIn.clientId),
      at,
    });

    if (decision === "request_waiting") {
      return { status: decision };
    }

    const held = await coachTimePort.reserve(
      CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
    );

    if (held.status === "taken") {
      return { status: "time_taken" };
    }

    await checkInsPort.add({ checkIn, reservationId: held.reservationId });

    return { status: "requested", checkIn };
  }
}
