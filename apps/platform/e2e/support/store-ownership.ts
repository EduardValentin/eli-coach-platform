import type pg from "pg";

/**
 * Seeded rather than earned through the acquisition form: that form is covered
 * by the integration suite, and reaching it here would mean publishing a
 * product first.
 */
export class StoreOwnership {
  private readonly seededEmails: string[] = [];

  constructor(private readonly pool: pg.Pool) {}

  /**
   * Seeding the untagged form is what proves the fold: the tagged address
   * signed in with has to reach this row.
   */
  async seedGuestAcquisition(normalizedEmail: string): Promise<void> {
    this.seededEmails.push(normalizedEmail);
    await this.pool.query(
      `insert into app.store_recipients (normalized_email, delivery_limit_key)
       values ($1, $1)`,
      [normalizedEmail],
    );
  }

  async owningAuthSubjectId(normalizedEmail: string): Promise<string | null> {
    const result = await this.pool.query<{ authSubjectId: string }>(
      `select account.auth_subject_id as "authSubjectId"
       from app.store_recipients recipient
       join app.accounts account on account.id = recipient.account_id
       where recipient.normalized_email = $1`,
      [normalizedEmail],
    );

    return result.rows[0]?.authSubjectId ?? null;
  }

  /**
   * The only reliable signal a `user.deleted` delivery leaves. A soft-deleted
   * account reaches the failure page only while its session still verifies,
   * and the deletion is what stops it verifying — so the screen is timing.
   */
  async accountDeletedAt(authSubjectId: string): Promise<Date | null> {
    const result = await this.pool.query<{ deletedAt: Date | null }>(
      `select deleted_at as "deletedAt"
       from app.accounts
       where auth_subject_id = $1`,
      [authSubjectId],
    );

    return result.rows[0]?.deletedAt ?? null;
  }

  /**
   * No cross-process sweep, unlike the Clerk-user cleanup beside it: a leaked
   * user counts against a hard cap, a leaked recipient carries the run id and
   * collides with nothing.
   */
  async removeSeededRecipients(): Promise<void> {
    if (this.seededEmails.length === 0) {
      return;
    }

    await this.pool.query(
      "delete from app.store_recipients where normalized_email = any($1::text[])",
      [this.seededEmails],
    );
    this.seededEmails.length = 0;
  }
}

const CLERK_TEST_SUBADDRESS = "+clerk_test";

/** The Store folds sub-address tags, so both forms name one inbox. */
export function untaggedAddress(testEmail: string): string {
  return testEmail.replace(CLERK_TEST_SUBADDRESS, "");
}
