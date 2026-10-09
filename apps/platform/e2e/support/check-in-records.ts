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

  async waitingRequestCount(): Promise<number> {
    const { rows } = await this.pool.query<{ waiting: number }>(
      COUNT_WAITING_REQUESTS,
    );

    return rows[0]?.waiting ?? 0;
  }
}
