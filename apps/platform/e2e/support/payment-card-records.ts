import type pg from "pg";

export type MirroredCard = {
  brand: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
};

const MIRRORED_CARD_BY_EMAIL = `
  select cards.brand, cards.last_four, cards.expiry_month, cards.expiry_year
  from app.payment_cards cards
  join app.coaching_subscriptions subscriptions
    on subscriptions.stripe_customer_id = cards.stripe_customer_id
  join app.clients clients on clients.id = subscriptions.client_id
  where clients.email = $1
`;

export class PaymentCardRecords {
  constructor(private readonly pool: pg.Pool) {}

  async mirroredCardOf(email: string): Promise<MirroredCard | null> {
    const result = await this.pool.query<{
      brand: string;
      last_four: string;
      expiry_month: number;
      expiry_year: number;
    }>(MIRRORED_CARD_BY_EMAIL, [email]);
    const row = result.rows[0];

    return row
      ? {
          brand: row.brand,
          lastFour: row.last_four,
          expiryMonth: row.expiry_month,
          expiryYear: row.expiry_year,
        }
      : null;
  }
}
