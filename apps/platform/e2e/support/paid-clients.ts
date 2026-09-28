import { randomUUID } from "node:crypto";

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type pg from "pg";

export type PaidClientIdentity = {
  authSubjectId: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: VisitorGender;
};

export type PaidClient = { firstName: string; paidAt: Date };

const ADULT_DATE_OF_BIRTH = "1994-03-14";
const PRIMARY_GOAL = "build_strength";
const COUNTRY = "RO";
const TIME_ZONE = "Europe/Bucharest";
const CALL_ENDED_DAYS_AGO = 2;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const INSERT_ENDED_CALL = `
  insert into app.assessment_calls (
    first_name, last_name, visitor_email, date_of_birth, gender, primary_goal,
    country, starts_at, visitor_time_zone, coach_time_zone, booked_at
  )
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $8)
  returning id
`;
const INSERT_BOUND_CLIENT = `
  insert into app.clients (
    assessment_call_id, first_name, last_name, email, date_of_birth, gender,
    primary_goal, country, created_at, auth_subject_id
  )
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  returning id
`;
const INSERT_WAITING_SUBSCRIPTION = `
  insert into app.coaching_subscriptions (
    client_id, assessment_call_id, bundle_id, months, tier, amount_cents,
    currency, stripe_customer_id, stripe_subscription_id,
    stripe_checkout_session_id, paid_at, start_choice, created_at
  )
  values (
    $1, $2, '3-months', 3, 'regular', 30000, 'eur', $3, $4, $5, $6,
    'waiting', $6
  )
`;

export async function insertPaidClientRecords(
  pool: pg.Pool,
  identity: PaidClientIdentity,
): Promise<PaidClient> {
  const paidAt = new Date();
  const callStartedAt = new Date(
    paidAt.getTime() - CALL_ENDED_DAYS_AGO * MILLISECONDS_PER_DAY,
  );
  const connection = await pool.connect();

  try {
    await connection.query("begin");
    const callId = await insertedId(connection, INSERT_ENDED_CALL, [
      identity.firstName,
      identity.lastName,
      identity.email,
      ADULT_DATE_OF_BIRTH,
      identity.gender,
      PRIMARY_GOAL,
      COUNTRY,
      callStartedAt,
      TIME_ZONE,
    ]);
    const clientId = await insertedId(connection, INSERT_BOUND_CLIENT, [
      callId,
      identity.firstName,
      identity.lastName,
      identity.email,
      ADULT_DATE_OF_BIRTH,
      identity.gender,
      PRIMARY_GOAL,
      COUNTRY,
      paidAt,
      identity.authSubjectId,
    ]);
    const stripeReference = randomUUID();
    await connection.query(INSERT_WAITING_SUBSCRIPTION, [
      clientId,
      callId,
      `cus_e2e_${stripeReference}`,
      `sub_e2e_${stripeReference}`,
      `cs_e2e_${stripeReference}`,
      paidAt,
    ]);
    await connection.query("commit");

    return { firstName: identity.firstName, paidAt };
  } catch (error) {
    await connection.query("rollback");
    throw error;
  } finally {
    connection.release();
  }
}

async function insertedId(
  connection: pg.PoolClient,
  statement: string,
  values: readonly unknown[],
): Promise<string> {
  const { rows } = await connection.query<{ id: string }>(statement, [
    ...values,
  ]);
  const [row] = rows;

  if (!row) {
    throw new Error("The insert returned no row.");
  }

  return row.id;
}
