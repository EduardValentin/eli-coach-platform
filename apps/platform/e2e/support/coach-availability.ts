import type pg from "pg";

type AvailabilityRow = {
  time_zone: string;
  weekdays: string[];
  start_hour: number;
  end_hour: number;
  updated_at: Date;
};

const READ_AVAILABILITY = `
  select time_zone, weekdays, start_hour, end_hour, updated_at
  from app.coach_availability where id = 1
`;
const SAVE_AVAILABILITY = `
  insert into app.coach_availability (
    id, time_zone, weekdays, start_hour, end_hour, updated_at
  )
  values (1, $1, $2, $3, $4, $5)
  on conflict (id) do update set
    time_zone = excluded.time_zone,
    weekdays = excluded.weekdays,
    start_hour = excluded.start_hour,
    end_hour = excluded.end_hour,
    updated_at = excluded.updated_at
`;
const REMOVE_AVAILABILITY = "delete from app.coach_availability where id = 1";
const EVERY_DAY = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const FIRST_OPEN_HOUR = 8;
const END_HOUR = 20;

export const COACH_TIME_ZONE = "Europe/Bucharest";

export class CoachAvailability {
  private constructor(
    private readonly pool: pg.Pool,
    private readonly previous: AvailabilityRow | null,
  ) {}

  static async heldIn(pool: pg.Pool): Promise<CoachAvailability> {
    const { rows } = await pool.query<AvailabilityRow>(READ_AVAILABILITY);

    return new CoachAvailability(pool, rows[0] ?? null);
  }

  async openEveryDay(): Promise<void> {
    await this.pool.query(SAVE_AVAILABILITY, [
      COACH_TIME_ZONE,
      EVERY_DAY,
      FIRST_OPEN_HOUR,
      END_HOUR,
      new Date(),
    ]);
  }

  async restore(): Promise<void> {
    if (!this.previous) {
      await this.pool.query(REMOVE_AVAILABILITY);
      return;
    }

    await this.pool.query(SAVE_AVAILABILITY, [
      this.previous.time_zone,
      this.previous.weekdays,
      this.previous.start_hour,
      this.previous.end_hour,
      this.previous.updated_at,
    ]);
  }
}
