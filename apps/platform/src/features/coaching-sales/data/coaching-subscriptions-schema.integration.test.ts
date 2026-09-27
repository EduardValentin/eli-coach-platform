import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const CALL_ID = "0b3a7f6e-6c2c-4a1e-9f47-2d0c1f6f9a01";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";

const insertCallSql = `
  insert into app.assessment_calls
    (id, first_name, last_name, visitor_email, visitor_notes, date_of_birth, gender, primary_goal, country, phone, starts_at, visitor_time_zone, coach_time_zone, booked_at)
  values
    ($1, 'Ana', 'Regular', 'ana@example.com', null, '1994-03-14', 'female', 'build_strength', 'RO', null, '2026-09-01T08:00:00Z', 'Europe/Bucharest', 'Europe/Bucharest', '2026-08-25T08:00:00Z')
`;

const insertClientSql = `
  insert into app.clients
    (id, assessment_call_id, first_name, last_name, email, date_of_birth, gender, primary_goal, country, phone, created_at)
  values
    ($1, $2, 'Ana', 'Regular', 'ana@example.com', '1994-03-14', 'female', 'build_strength', 'RO', null, '2026-09-01T09:00:00Z')
`;

const insertSubscriptionSql = `
  insert into app.coaching_subscriptions
    (client_id, assessment_call_id, bundle_id, months, tier, amount_cents, currency, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id, paid_at, start_choice, status, created_at)
  values
    ($1, $2, '3-months', 3, 'regular', 44700, 'eur', 'cus_schema', $3, $4, '2026-09-01T09:00:00Z', 'immediate', 'not-started', '2026-09-01T09:00:00Z')
`;

describe.sequential("coaching subscriptions schema", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("refuses a second subscription for a client whose subscription has not ended", async () => {
    // arrange
    await suite.postgres.executeSql({ sql: insertCallSql, values: [CALL_ID] });
    await suite.postgres.executeSql({
      sql: insertClientSql,
      values: [CLIENT_ID, CALL_ID],
    });
    await suite.postgres.executeSql({
      sql: insertSubscriptionSql,
      values: [CLIENT_ID, CALL_ID, "sub_first", "cs_first"],
    });

    // act
    const secondInsert = suite.postgres.executeSql({
      sql: insertSubscriptionSql,
      values: [CLIENT_ID, CALL_ID, "sub_second", "cs_second"],
    });

    // assert
    await expect(secondInsert).rejects.toThrow(
      /coaching_subscriptions_one_open_per_client/,
    );
    expect(
      await suite.postgres.countRows({
        tableName: "app.coaching_subscriptions",
        values: [CLIENT_ID],
        whereClause: "client_id = $1",
      }),
    ).toBe(1);
  });
});
