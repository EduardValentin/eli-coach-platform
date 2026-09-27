import { isClerkTestEmail } from "./clerk-users";

export type ClerkInvitationsApi = {
  getInvitationList(params: {
    query: string;
    status: "pending";
  }): Promise<{ data: Array<{ emailAddress: string; id: string }> }>;
  revokeInvitation(invitationId: string): Promise<unknown>;
};

export type RevocationReport = { failed: string[]; revoked: string[] };

export async function revokePendingInvitations(
  invitationsApi: ClerkInvitationsApi,
  emails: readonly string[],
): Promise<RevocationReport> {
  const report: RevocationReport = { failed: [], revoked: [] };

  for (const email of emails.filter(isClerkTestEmail)) {
    try {
      await revokePendingInvitationsFor({ email, invitationsApi, report });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      report.failed.push(`${email} (${reason})`);
    }
  }

  return report;
}

async function revokePendingInvitationsFor(request: {
  email: string;
  invitationsApi: ClerkInvitationsApi;
  report: RevocationReport;
}): Promise<void> {
  const { email, invitationsApi, report } = request;
  const pending = await invitationsApi.getInvitationList({
    query: email,
    status: "pending",
  });
  const invitationsForEmail = pending.data.filter(
    (invitation) => invitation.emailAddress === email,
  );

  for (const invitation of invitationsForEmail) {
    await invitationsApi.revokeInvitation(invitation.id);
    report.revoked.push(`${invitation.id} (${email})`);
  }
}

export function summarizeRevocations(report: RevocationReport): string {
  const parts = [`${report.revoked.length} pending invitations revoked`];

  if (report.revoked.length > 0) {
    parts.push(`revoked: ${report.revoked.join("; ")}`);
  }

  if (report.failed.length > 0) {
    parts.push(`${report.failed.length} failed: ${report.failed.join("; ")}`);
  }

  return parts.join(", ");
}
