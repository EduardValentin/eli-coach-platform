import type pg from "pg";

const MARK_COACH_NOTIFICATIONS_READ = `
  update app.notifications set read_at = now()
  where recipient_party = 'coach' and read_at is null
`;

export class NotificationRecords {
  constructor(private readonly pool: pg.Pool) {}

  async markCoachNotificationsRead(): Promise<void> {
    await this.pool.query(MARK_COACH_NOTIFICATIONS_READ);
  }
}
