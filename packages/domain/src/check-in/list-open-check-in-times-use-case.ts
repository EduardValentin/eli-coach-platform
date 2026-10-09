import type {
  CoachAvailabilitySource,
  CoachCalendar,
} from "../coach-availability";
import type { Clock } from "../shared";

import { CHECK_IN_RULES } from "./check-in-rules";

type ListOpenCheckInTimesUseCaseOptions = {
  availability: CoachAvailabilitySource;
  calendar: CoachCalendar;
  clock: Clock;
};

export class ListOpenCheckInTimesUseCase {
  constructor(private readonly options: ListOpenCheckInTimesUseCaseOptions) {}

  async execute(): Promise<Date[]> {
    const now = this.options.clock.now();
    const [availability, busy] = await Promise.all([
      this.options.availability.current(),
      this.options.calendar.busyFrom(now),
    ]);

    return availability.openSlotStarts({ now, policy: CHECK_IN_RULES, busy });
  }
}
