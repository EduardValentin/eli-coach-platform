import { CheckIn } from "./check-in";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInSeriesOccurrence } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import type { HeldCheckIn } from "./check-ins";
import type { CoachTime } from "./coach-time";

type CheckInWeekRecorderOptions = {
  coachTime: Pick<CoachTime, "reserve">;
  series: Pick<CheckInSeriesRecords, "recordWeeks">;
};

export class CheckInWeekRecorder {
  constructor(private readonly options: CheckInWeekRecorderOptions) {}

  async record(
    occurrences: readonly CheckInSeriesOccurrence[],
  ): Promise<CheckIn[]> {
    const weeks: HeldCheckIn[] = [];

    for (const occurrence of occurrences) {
      weeks.push(await this.held(occurrence));
    }

    await this.options.series.recordWeeks(weeks);

    return weeks.map((week) => week.checkIn);
  }

  private async held({
    checkIn,
    availability,
  }: CheckInSeriesOccurrence): Promise<HeldCheckIn> {
    if (availability === "closed") {
      return {
        checkIn: CheckIn.decideOccurrence({
          occurrence: checkIn,
          availability,
          coachTime: "not_attempted",
        }),
        reservationId: null,
      };
    }

    const held = await this.options.coachTime.reserve(
      CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
    );

    return {
      checkIn: CheckIn.decideOccurrence({
        occurrence: checkIn,
        availability,
        coachTime: held.status,
      }),
      reservationId: held.status === "reserved" ? held.reservationId : null,
    };
  }
}
