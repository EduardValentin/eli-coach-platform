import type pg from "pg";

const FIND_CHECK_IN = `
  select id from app.check_ins
  where client_id = $1 and starts_at = $2
  order by requested_at desc
  limit 1
`;
const COUNT_WAITING_REQUESTS = `
  select count(*)::int as waiting from app.check_ins
  where status = 'pending' and proposed_by = 'client' and starts_at > now()
`;
const COUNT_CHECK_INS_OF = `
  select count(*)::int as recorded from app.check_ins where client_id = $1
`;
const MARK_APPROVED = `
  update app.check_ins set status = 'approved', answered_at = now()
  where id = $1
`;
const MOVE_CHECK_IN = `
  update app.check_ins set starts_at = now() + make_interval(mins => $2)
  where id = $1
`;
const MOVE_CHECK_IN_RESERVATION = `
  update app.coach_time_reservations
  set starts_at = now() + make_interval(mins => $2),
      ends_at = now() + make_interval(mins => $2) + (ends_at - starts_at)
  where check_in_id = $1
`;
const HOLD_HOUR = `
  with held as (
    insert into app.check_ins (
      id, client_id, starts_at, client_time_zone, coach_time_zone,
      kind, status, initiated_by, proposed_by, requested_at
    )
    values (
      gen_random_uuid(), $1, $2, $3, $3,
      'ad_hoc', 'pending', 'client', 'client', now()
    )
    returning id, starts_at
  )
  insert into app.coach_time_reservations (starts_at, ends_at, check_in_id)
  select starts_at, starts_at + interval '1 hour', id from held
`;

export class CheckInRecords {
  constructor(private readonly pool: pg.Pool) {}

  async idOf(clientId: string, startsAt: Date): Promise<string> {
    const { rows } = await this.pool.query<{ id: string }>(FIND_CHECK_IN, [
      clientId,
      startsAt,
    ]);
    const [row] = rows;

    if (!row) {
      throw new Error(`No check-in for client ${clientId} at ${startsAt}.`);
    }

    return row.id;
  }

  async countOf(clientId: string): Promise<number> {
    const { rows } = await this.pool.query<{ recorded: number }>(
      COUNT_CHECK_INS_OF,
      [clientId],
    );

    return rows[0]?.recorded ?? 0;
  }

  async markApproved(checkInId: string): Promise<void> {
    await this.pool.query(MARK_APPROVED, [checkInId]);
  }

  async moveStart(checkInId: string, minutesFromNow: number): Promise<void> {
    await this.pool.query(MOVE_CHECK_IN, [checkInId, minutesFromNow]);
    await this.pool.query(MOVE_CHECK_IN_RESERVATION, [
      checkInId,
      minutesFromNow,
    ]);
  }

  async holdHourFor(
    clientId: string,
    startsAt: Date,
    timeZone: string,
  ): Promise<void> {
    await this.pool.query(HOLD_HOUR, [clientId, startsAt, timeZone]);
  }

  async waitingRequestCount(): Promise<number> {
    const { rows } = await this.pool.query<{ waiting: number }>(
      COUNT_WAITING_REQUESTS,
    );

    return rows[0]?.waiting ?? 0;
  }
}
