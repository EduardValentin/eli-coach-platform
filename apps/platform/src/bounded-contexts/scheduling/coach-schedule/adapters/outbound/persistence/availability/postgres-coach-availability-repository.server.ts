import {
  CoachAvailability,
  type CoachAvailabilityChangesPort,
  type CoachAvailabilityResult,
  type CoachAvailabilitySourcePort,
  type Weekday,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { ClockPort } from "~/bounded-contexts/scheduling/coach-schedule/domain/clock-port";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { eq } from "drizzle-orm";

import {
  coachAvailabilityTable,
  SINGLETON_COACH_AVAILABILITY_ID,
} from "../schema.server";

function configuredAvailabilityOrThrow(
  result: CoachAvailabilityResult,
): CoachAvailability {
  if (result.status === "invalid") {
    throw new Error(
      `Coach availability failed validation: ${result.problems.join(", ")}`,
    );
  }

  return result.availability;
}

const DEFAULT_COACH_AVAILABILITY = configuredAvailabilityOrThrow(
  CoachAvailability.from({
    timeZone: "Europe/Bucharest",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    startHour: 17,
    endHour: 20,
  }),
);

type PostgresCoachAvailabilityOptions = {
  database: DatabaseClient;
  clock: ClockPort;
};

export class PostgresCoachAvailabilityRepository
  implements CoachAvailabilitySourcePort, CoachAvailabilityChangesPort
{
  constructor(private readonly options: PostgresCoachAvailabilityOptions) {}

  private get executor() {
    return executorOf(this.options.database);
  }

  async current(): Promise<CoachAvailability> {
    const [row] = await this.executor
      .select()
      .from(coachAvailabilityTable)
      .where(eq(coachAvailabilityTable.id, SINGLETON_COACH_AVAILABILITY_ID))
      .limit(1);

    if (!row) {
      return DEFAULT_COACH_AVAILABILITY;
    }

    return configuredAvailabilityOrThrow(
      CoachAvailability.from({
        timeZone: row.timeZone,
        weekdays: row.weekdays as Weekday[],
        startHour: row.startHour,
        endHour: row.endHour,
      }),
    );
  }

  async save(availability: CoachAvailability): Promise<void> {
    const values = {
      id: SINGLETON_COACH_AVAILABILITY_ID,
      timeZone: availability.timeZone,
      weekdays: [...availability.weekdays],
      startHour: availability.startHour,
      endHour: availability.endHour,
      updatedAt: this.options.clock.now(),
    };

    await this.executor
      .insert(coachAvailabilityTable)
      .values(values)
      .onConflictDoUpdate({
        target: coachAvailabilityTable.id,
        set: values,
      });
  }
}
