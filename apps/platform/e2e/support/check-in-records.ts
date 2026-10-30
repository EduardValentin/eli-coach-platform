import type pg from "pg";

const FIND_CHECK_IN = `
  select id from app.check_ins
  where client_id = $1 and starts_at = $2
  order by requested_at desc
  limit 1
`;
const LIST_WEEKS_TO_COME = `
  select starts_at from app.check_ins
  where client_id = $1 and series_id is not null
    and status <> 'cancelled' and starts_at > now()
  order by starts_at
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
const MARK_MOVED = `
  update app.check_ins
  set moves = $2, earlier_starts_at = starts_at - interval '1 day'
  where id = $1
`;
const MARK_CANCELLED = `
  update app.check_ins set status = 'cancelled' where id = $1
`;
const FREE_HOUR = `
  update app.check_ins check_in set reservation_id = null
  from app.check_ins held
  where held.id = check_in.id and check_in.id = $1
  returning held.reservation_id
`;
const DELETE_RESERVATIONS = `
  delete from app.coach_time_reservations where id = any($1::uuid[])
`;
const FIND_MOVES = `
  select moves, earlier_starts_at from app.check_ins where id = $1
`;
const MOVE_CHECK_IN = `
  update app.check_ins set starts_at = now() + make_interval(mins => $2)
  where id = $1
`;
const MOVE_CHECK_IN_RESERVATION = `
  update app.coach_time_reservations reservation
  set starts_at = now() + make_interval(mins => $2),
      ends_at = now() + make_interval(mins => $2)
        + (reservation.ends_at - reservation.starts_at)
  from app.check_ins check_in
  where check_in.reservation_id = reservation.id and check_in.id = $1
`;
const MOVE_CHECK_IN_TO = `
  update app.check_ins set starts_at = $2::timestamptz where id = $1
`;
const MOVE_CHECK_IN_RESERVATION_TO = `
  update app.coach_time_reservations reservation
  set starts_at = $2::timestamptz,
      ends_at = $2::timestamptz + (reservation.ends_at - reservation.starts_at)
  from app.check_ins check_in
  where check_in.reservation_id = reservation.id and check_in.id = $1
`;
const MOVE_BOOKING_ZONE = `
  with client as (
    update app.clients set booking_time_zone = $2 where id = $1
    returning assessment_call_id
  )
  update app.assessment_calls set visitor_time_zone = $2
  where id = (select assessment_call_id from client)
`;
const HOLD_HOUR = `
  with reservation as (
    insert into app.coach_time_reservations (starts_at, ends_at)
    values ($2, $2::timestamptz + interval '1 hour')
    returning id
  )
  insert into app.check_ins (
    id, client_id, starts_at, client_time_zone, coach_time_zone,
    kind, status, initiated_by, proposed_by, requested_at, reservation_id
  )
  select
    gen_random_uuid(), $1, $2, $3, $3,
    'ad_hoc', 'pending', 'client', 'client', now(), id
  from reservation
`;

const PROPOSE_HOUR = `
  with reservation as (
    insert into app.coach_time_reservations (starts_at, ends_at)
    values ($2, $2::timestamptz + interval '1 hour')
    returning id
  )
  insert into app.check_ins (
    id, client_id, starts_at, client_time_zone, coach_time_zone,
    kind, status, initiated_by, proposed_by, requested_at, reservation_id
  )
  select
    gen_random_uuid(), $1, $2, $3, $3,
    'ad_hoc', 'pending', 'coach', 'coach', now(), id
  from reservation
`;
const CANCEL_WAITING_REQUESTS = `
  update app.check_ins check_in
  set status = 'cancelled', reservation_id = null
  from app.check_ins held
  where held.id = check_in.id
    and check_in.status = 'pending' and check_in.proposed_by = 'client'
    and check_in.starts_at > now()
  returning held.reservation_id
`;

const CANCEL_EVERY_UNFINISHED_CHECK_IN = `
  update app.check_ins check_in
  set status = 'cancelled', reservation_id = null
  from app.check_ins held
  where held.id = check_in.id
    and check_in.status in ('pending', 'approved', 'clash')
    and check_in.starts_at > now() - interval '1 hour'
  returning held.reservation_id
`;

const CANCEL_UPCOMING_CLASHES = `
  update app.check_ins set status = 'cancelled'
  where status = 'clash' and starts_at > now()
`;

type MovesRow = { moves: number; earlier_starts_at: Date | null };

type HeldRow = { reservation_id: string | null };

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

  async weeksToComeOf(clientId: string): Promise<Date[]> {
    const { rows } = await this.pool.query<{ starts_at: Date }>(
      LIST_WEEKS_TO_COME,
      [clientId],
    );

    return rows.map((row) => row.starts_at);
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

  async markCancelled(checkInId: string): Promise<void> {
    await this.pool.query(MARK_CANCELLED, [checkInId]);
    await this.freeHourOf(checkInId);
  }

  async freeHourOf(checkInId: string): Promise<void> {
    await this.freeHoursHeldBy(FREE_HOUR, [checkInId]);
  }

  async markMoved(checkInId: string, times: number): Promise<void> {
    await this.pool.query(MARK_MOVED, [checkInId, times]);
  }

  async movesOf(checkInId: string): Promise<number> {
    return (await this.movesRowOf(checkInId)).moves;
  }

  async earlierStartOf(checkInId: string): Promise<Date | null> {
    return (await this.movesRowOf(checkInId)).earlier_starts_at;
  }

  private async movesRowOf(checkInId: string): Promise<MovesRow> {
    const { rows } = await this.pool.query<MovesRow>(FIND_MOVES, [checkInId]);
    const [row] = rows;

    if (!row) {
      throw new Error(`No check-in ${checkInId}.`);
    }

    return row;
  }

  async moveStart(checkInId: string, minutesFromNow: number): Promise<void> {
    await this.pool.query(MOVE_CHECK_IN, [checkInId, minutesFromNow]);
    await this.pool.query(MOVE_CHECK_IN_RESERVATION, [
      checkInId,
      minutesFromNow,
    ]);
  }

  async moveStartTo(checkInId: string, startsAt: Date): Promise<void> {
    await this.pool.query(MOVE_CHECK_IN_TO, [checkInId, startsAt]);
    await this.pool.query(MOVE_CHECK_IN_RESERVATION_TO, [checkInId, startsAt]);
  }

  async holdHourFor(
    clientId: string,
    startsAt: Date,
    timeZone: string,
  ): Promise<void> {
    await this.pool.query(HOLD_HOUR, [clientId, startsAt, timeZone]);
  }

  async proposeHourFor(
    clientId: string,
    startsAt: Date,
    timeZone: string,
  ): Promise<void> {
    await this.pool.query(PROPOSE_HOUR, [clientId, startsAt, timeZone]);
  }

  async cancelWaitingRequests(): Promise<void> {
    await this.freeHoursHeldBy(CANCEL_WAITING_REQUESTS, []);
  }

  async cancelEveryUnfinishedCheckIn(): Promise<void> {
    await this.freeHoursHeldBy(CANCEL_EVERY_UNFINISHED_CHECK_IN, []);
  }

  async cancelUpcomingClashes(): Promise<void> {
    await this.pool.query(CANCEL_UPCOMING_CLASHES);
  }

  async moveBookingZone(clientId: string, timeZone: string): Promise<void> {
    await this.pool.query(MOVE_BOOKING_ZONE, [clientId, timeZone]);
  }

  private async freeHoursHeldBy(
    detaching: string,
    values: unknown[],
  ): Promise<void> {
    const { rows } = await this.pool.query<HeldRow>(detaching, values);
    const reservationIds = rows.flatMap(({ reservation_id }) =>
      reservation_id === null ? [] : [reservation_id],
    );

    await this.pool.query(DELETE_RESERVATIONS, [reservationIds]);
  }

  async waitingRequestCount(): Promise<number> {
    const { rows } = await this.pool.query<{ waiting: number }>(
      COUNT_WAITING_REQUESTS,
    );

    return rows[0]?.waiting ?? 0;
  }
}
