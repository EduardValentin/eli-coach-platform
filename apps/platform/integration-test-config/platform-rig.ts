import type { ApiIntegrationTestSuite } from "./api-integration-test-suite";
import { mintSessionToken } from "./clerk-session";

export type AccountSession = { sessionId: string; subjectId: string };

export const COACH_SESSION: AccountSession = {
  sessionId: "sess_platformrigcoach",
  subjectId: "user_platformrigcoach",
};

export const CLIENT_SESSION: AccountSession = {
  sessionId: "sess_platformrigclient",
  subjectId: "user_platformrigclient",
};

const WAITLIST_MODE_FLAG = "WAITLIST_MODE";

/**
 * The state a case sets on the running instance before it drives an entry
 * point: its clock, its waiting-list mode and the accounts it signs in as.
 * The mode and the client account are written straight to Postgres, as an
 * operator would set them; no entry point exists for either.
 */
export class PlatformRig {
  private heldInstant: Date | null = null;

  constructor(readonly suite: ApiIntegrationTestSuite) {}

  now(): Date {
    return this.heldInstant ?? new Date();
  }

  async holdClock(instant: Date): Promise<void> {
    this.heldInstant = instant;
    await this.suite.setServerClock(instant);
  }

  releaseClock(): void {
    this.heldInstant = null;
  }

  async switchWaitlistModeOff(): Promise<void> {
    await this.suite.postgres.executeSql({
      sql: "update app.feature_flags set enabled = false, updated_at = now() where name = $1",
      values: [WAITLIST_MODE_FLAG],
    });
  }

  async switchWaitlistModeOn(): Promise<void> {
    await this.suite.postgres.executeSql({
      sql: "update app.feature_flags set enabled = true, updated_at = now() where name = $1",
      values: [WAITLIST_MODE_FLAG],
    });
  }

  async provisionCoach(): Promise<void> {
    const response = await this.requestAs(COACH_SESSION, "/api/account");

    if (!response.ok) {
      throw new Error(`Provisioning the coach answered ${response.status}.`);
    }
  }

  async provisionClient(): Promise<void> {
    await this.suite.postgres.executeSql({
      sql: "insert into app.accounts (auth_subject_id, role) values ($1, $2)",
      values: [CLIENT_SESSION.subjectId, "CLIENT"],
    });
  }

  async requestAs(
    session: AccountSession,
    target: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const token = mintSessionToken({ ...session, issuedAt: this.now() });
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);

    return this.suite.request(
      new Request(this.suite.url(target), { ...init, headers }),
    );
  }
}
