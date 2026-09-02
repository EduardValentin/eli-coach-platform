import type pg from "pg";

/**
 * The Store rows a linking journey needs, and the ownership question it asks
 * afterwards.
 *
 * Recipients are seeded straight into the database rather than earned through
 * the acquisition form. That form is already driven end to end by the store
 * integration suite, and reaching it here would mean publishing a product
 * first — which only happens through the management API, adding a secret to
 * local setup for a step this journey is not about. What this journey is
 * about starts at the sign-in button.
 */
export class StoreOwnership {
  private readonly seededEmails: string[] = [];

  constructor(private readonly pool: pg.Pool) {}

  /**
   * One unclaimed recipient, exactly as a guest acquisition leaves it: no
   * account, and a delivery-limit key equal to the address because an
   * untagged address folds onto itself. Seeding the untagged form is what
   * lets the journey prove the fold — the tagged address the visitor signs in
   * with has to reach this row for the claim to land.
   */
  async seedGuestAcquisition(normalizedEmail: string): Promise<void> {
    this.seededEmails.push(normalizedEmail);
    await this.pool.query(
      `insert into app.store_recipients (normalized_email, delivery_limit_key)
       values ($1, $1)`,
      [normalizedEmail],
    );
  }

  /**
   * The auth subject of the account that owns this recipient, or null while
   * it is still unclaimed. Answering with the subject rather than the account
   * id lets a journey tie ownership back to the identity that signed in,
   * instead of merely observing that some account took the row.
   */
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

  /** Removes only what this journey seeded; nothing else in the local database. */
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

/**
 * The address a visitor would have used before she had an account: this
 * suite's test email without the `+clerk_test` tag Clerk needs to accept a
 * fixed OTP. The Store folds sub-address tags when it decides which
 * recipients an account reaches, so the two forms name one inbox — which is
 * the rule the linking journey is there to demonstrate.
 */
export function untaggedAddress(testEmail: string): string {
  return testEmail.replace(CLERK_TEST_SUBADDRESS, "");
}
