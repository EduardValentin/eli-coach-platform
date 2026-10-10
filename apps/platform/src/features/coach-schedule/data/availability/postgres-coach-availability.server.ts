import {
  CoachAvailability,
  type CoachAvailabilityChanges,
  type CoachAvailabilityResult,
  type CoachAvailabilitySource,
  type Weekday,
} from "@eli-coach-platform/domain/coach-availability";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { DatabaseClient } from "@eli-coach-platform/db";
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
  clock: Clock;
};

export class PostgresCoachAvailability
  implements CoachAvailabilitySource, CoachAvailabilityChanges
{
  constructor(private readonly options: PostgresCoachAvailabilityOptions) {}

  async current(): Promise<CoachAvailability> {
    const [row] = await this.options.database
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

    await this.options.database
      .insert(coachAvailabilityTable)
      .values(values)
      .onConflictDoUpdate({
        target: coachAvailabilityTable.id,
        set: values,
      });
  }
}
