import {
  revokePendingInvitations,
  type ClerkInvitationsApi,
  type RevocationReport,
} from "./clerk-invitations";
import {
  deleteRecordedClerkUsers,
  hasDeletionFailures,
  type ClerkUsersApi,
  type EmailDeletionResult,
} from "./clerk-users";

export type ClerkAccountsApi = {
  users: ClerkUsersApi;
  invitations: ClerkInvitationsApi;
};

export type ClerkAccountsRelease = {
  deletions: EmailDeletionResult[];
  revocations: RevocationReport;
  released: boolean;
};

export async function releaseClerkAccounts(
  clerk: ClerkAccountsApi,
  emails: readonly string[],
): Promise<ClerkAccountsRelease> {
  const deletions = await deleteRecordedClerkUsers(clerk.users, emails);
  const revocations = await revokePendingInvitations(clerk.invitations, emails);

  return {
    deletions,
    revocations,
    released:
      !hasDeletionFailures(deletions) && revocations.failed.length === 0,
  };
}
