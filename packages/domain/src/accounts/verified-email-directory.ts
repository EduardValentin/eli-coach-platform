/**
 * The verified email addresses an identity provider holds for one auth
 * subject. An account deliberately stores no email of its own, so anything
 * that has to match a person by address — linking prior Store acquisitions,
 * for one — asks the provider rather than a column.
 *
 * Only addresses the provider has actually verified are returned: an
 * unverified address proves nothing about who controls the inbox, and
 * matching on one would hand a stranger's acquisitions to whoever typed it.
 */
export type VerifiedEmailDirectory = {
  listVerifiedEmails(authSubjectId: string): Promise<readonly string[]>;
};
