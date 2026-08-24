export interface DeletableAccountRepository {
  /**
   * Keeps the subject id rather than detaching it: a token minted just before
   * deletion stays valid, and only a row still reachable by subject refuses it.
   */
  markDeletedByAuthSubjectId(authSubjectId: string): Promise<void>;
}

export class AccountDeletionService {
  constructor(private readonly repository: DeletableAccountRepository) {}

  async forgetIdentity(authSubjectId: string): Promise<void> {
    await this.repository.markDeletedByAuthSubjectId(authSubjectId);
  }
}
