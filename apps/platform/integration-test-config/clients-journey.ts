import type { PlatformRig } from "./platform-rig";

export const INVITATION_API = "/api/clients/invitation";
export const INVITATION_LINK = /https?:\/\/[^\s"<]+\/invitation#([\w-]+)/;

export type ClientStanding = {
  bookingTimeZone: string;
  coachingAccessEndsAt: Date | null;
  coachingBundleMonths: number | null;
  coachingRefundDue: boolean;
  coachingStatus: string;
};

export class ClientsJourney {
  constructor(private readonly rig: PlatformRig) {}

  async latestInvitationToken(): Promise<string> {
    const emails = await this.rig.suite.sentEmails();
    const token = emails
      .flatMap((email) => INVITATION_LINK.exec(email.text)?.[1] ?? [])
      .at(-1);

    if (!token) {
      throw new Error("No invitation email has been sent.");
    }

    return token;
  }

  async clientIdPaidFor(callId: string): Promise<string> {
    const [client] = await this.rig.suite.postgres.queryRows<{ id: string }>({
      sql: "select id from app.clients where assessment_call_id = $1",
      values: [callId],
    });

    if (!client) {
      throw new Error("The payment for that call created no client.");
    }

    return client.id;
  }

  async standingOf(email: string): Promise<ClientStanding | undefined> {
    const [client] = await this.rig.suite.postgres.queryRows<ClientStanding>({
      sql: `
        select
          booking_time_zone as "bookingTimeZone",
          coaching_status as "coachingStatus",
          coaching_access_ends_at as "coachingAccessEndsAt",
          coaching_refund_due as "coachingRefundDue",
          coaching_bundle_months as "coachingBundleMonths"
        from app.clients
        where email = $1
      `,
      values: [email],
    });

    return client;
  }
}
