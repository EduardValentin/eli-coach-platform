import type pg from "pg";

/**
 * Seeded rather than earned through the acquisition form: that form is covered
 * by the integration suite, and driving it here would mean clearing real
 * Turnstile and waiting out the delivery cooldown before a journey could begin.
 */
export class StoreOwnership {
  private readonly seededEmails: string[] = [];

  constructor(private readonly pool: pg.Pool) {}

  /**
   * A recipient carrying no products, which is all the linking journeys need.
   * Seeding the untagged form is what proves the fold: the tagged address
   * signed in with has to reach this row.
   */
  async seedRecipient(normalizedEmail: string): Promise<void> {
    this.seededEmails.push(normalizedEmail);
    await this.pool.query(
      `insert into app.store_recipients (normalized_email, delivery_limit_key)
       values ($1, $1)`,
      [normalizedEmail],
    );
  }

  /**
   * Seeds the recipient and the acquisition that makes it own a product, so
   * the address must not be seeded already. `acquisitions` is the whole of
   * what ownership is read from, so the request that produced it — a row the
   * Library never joins — is not restaged here.
   */
  async seedGuestAcquisition(options: {
    normalizedEmail: string;
    productId: number;
  }): Promise<void> {
    await this.seedRecipient(options.normalizedEmail);
    await this.pool.query(
      `insert into app.acquisitions (
         recipient_id,
         product_id,
         first_requested_at,
         last_requested_at
       )
       select id, $2, now(), now()
       from app.store_recipients
       where normalized_email = $1`,
      [options.normalizedEmail, options.productId],
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

    // Acquisitions first: they point at the recipients this is about to remove.
    await this.pool.query(
      `delete from app.acquisitions
       where recipient_id in (
         select id from app.store_recipients
         where normalized_email = any($1::text[])
       )`,
      [this.seededEmails],
    );
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
