export interface DeletableAccountRepository {
  /**
   * Marks the account deleted and answers whether one matched. The identity is
   * kept rather than detached: a session token minted just before Clerk removed
   * the user stays valid for its remaining lifetime, and only a row still
   * reachable by subject can refuse it.
   */
  markDeletedByAuthSubjectId(authSubjectId: string): Promise<boolean>;
}

export class AccountDeletionService {
  constructor(private readonly repository: DeletableAccountRepository) {}

  /**
   * Idempotent by construction. Clerk retries a webhook it did not see accepted,
   * and an identity that never signed in here has no account at all, so neither
   * a repeat nor a stranger is an error.
   */
  async forgetIdentity(authSubjectId: string): Promise<void> {
    await this.repository.markDeletedByAuthSubjectId(authSubjectId);
  }
}
