/**
 * An account stores no email of its own, so matching a person by address asks
 * the provider. Unverified addresses are excluded: one proves nothing about
 * who controls the inbox.
 */
export type VerifiedEmailDirectory = {
  listVerifiedEmails(authSubjectId: string): Promise<readonly string[]>;
};
