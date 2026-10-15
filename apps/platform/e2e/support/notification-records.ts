import type pg from "pg";

const MARK_COACH_NOTIFICATIONS_READ = `
  update app.notifications set read_at = now()
  where recipient_party = 'coach' and read_at is null
`;

const DELETE_COACH_NOTIFICATIONS = `
  delete from app.notifications where recipient_party = 'coach'
`;

const INSERT_COACH_NOTIFICATION = `
  insert into app.notifications (recipient_party, kind, facts, arrived_at)
  values ('coach', $1, $2::jsonb, now())
`;

export class NotificationRecords {
  constructor(private readonly pool: pg.Pool) {}

  async markCoachNotificationsRead(): Promise<void> {
    await this.pool.query(MARK_COACH_NOTIFICATIONS_READ);
  }

  async clearCoachNotifications(): Promise<void> {
    await this.pool.query(DELETE_COACH_NOTIFICATIONS);
  }

  async arriveForCoach(
    kind: string,
    facts: Readonly<Record<string, string | number>>,
  ): Promise<void> {
    await this.pool.query(INSERT_COACH_NOTIFICATION, [
      kind,
      JSON.stringify(facts),
    ]);
  }
}
