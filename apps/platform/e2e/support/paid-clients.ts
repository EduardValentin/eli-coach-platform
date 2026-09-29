import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type pg from "pg";

export type ClientIdentity = {
  email: string;
  firstName: string;
  lastName: string;
  gender: VisitorGender;
  dateOfBirth: string;
};

export type PaidClientIdentity = ClientIdentity & { authSubjectId: string };

export type StartChoice = "immediate" | "waiting";

export type PaidClient = {
  clientId: string;
  firstName: string;
  fullName: string;
  email: string;
  paidAt: Date;
};

export type InvitationStanding = "pending" | "expired" | "email-failed";

export type ProviderInvitation = { id: string; url: string };

export type InvitationSeed = {
  id: string;
  standing: InvitationStanding;
  provider: ProviderInvitation;
};

export type InvitedClientSeed = {
  invitation: InvitationSeed;
  start?: StartChoice;
};

export type InvitedClient = PaidClient & {
  invitationToken: string;
  invitationSentAt: Date;
  invitationExpiresAt: Date;
};

type ClientBinding = {
  identity: ClientIdentity;
  authSubjectId: string | null;
  start: StartChoice;
};

type InvitationTimes = {
  sentAt: Date;
  expiresAt: Date;
  emailSentAt: Date | null;
  emailDeliveryFailedAt: Date | null;
};

const PRIMARY_GOAL = "build_strength";
const COUNTRY = "RO";
const TIME_ZONE = "Europe/Bucharest";
const CALL_ENDED_DAYS_AGO = 2;
const INVITATION_VALIDITY_DAYS = 30;
const PENDING_INVITATION_SENT_DAYS_AGO = 3;
const EXPIRED_INVITATION_SENT_DAYS_AGO = 40;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const INSERT_ENDED_CALL = `
  insert into app.assessment_calls (
    first_name, last_name, visitor_email, date_of_birth, gender, primary_goal,
    country, starts_at, visitor_time_zone, coach_time_zone, booked_at
  )
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $8)
  returning id
`;
const INSERT_CLIENT = `
  insert into app.clients (
    assessment_call_id, first_name, last_name, email, date_of_birth, gender,
    primary_goal, country, created_at, auth_subject_id
  )
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  returning id
`;
const INSERT_SUBSCRIPTION = `
  insert into app.coaching_subscriptions (
    client_id, assessment_call_id, bundle_id, months, tier, amount_cents,
    currency, stripe_customer_id, stripe_subscription_id,
    stripe_checkout_session_id, paid_at, start_choice, created_at
  )
  values (
    $1, $2, '3-months', 3, 'regular', 30000, 'eur', $3, $4, $5, $6, $7, $6
  )
`;
const INSERT_INVITATION = `
  insert into app.client_invitations (
    id, client_id, email, token_hash, sent_at, expires_at,
    provider_invitation_id, provider_invitation_url, email_sent_at,
    email_delivery_failed_at, created_at
  )
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $5)
`;

export async function insertPaidClientRecords(
  pool: pg.Pool,
  identity: PaidClientIdentity,
  start: StartChoice = "waiting",
): Promise<PaidClient> {
  return inTransaction(pool, (connection) =>
    insertPaidClient(connection, {
      identity,
      authSubjectId: identity.authSubjectId,
      start,
    }),
  );
}

export async function insertInvitedClientRecords(
  pool: pg.Pool,
  identity: ClientIdentity,
  { invitation, start = "waiting" }: InvitedClientSeed,
): Promise<InvitedClient> {
  return inTransaction(pool, async (connection) => {
    const client = await insertPaidClient(connection, {
      identity,
      authSubjectId: null,
      start,
    });
    const invitationToken = randomBytes(32).toString("base64url");
    const times = invitationTimesFor(invitation.standing, client.paidAt);

    await connection.query(INSERT_INVITATION, [
      invitation.id,
      client.clientId,
      identity.email,
      sha256Hex(invitationToken),
      times.sentAt,
      times.expiresAt,
      invitation.provider.id,
      invitation.provider.url,
      times.emailSentAt,
      times.emailDeliveryFailedAt,
    ]);

    return {
      ...client,
      invitationToken,
      invitationSentAt: times.sentAt,
      invitationExpiresAt: times.expiresAt,
    };
  });
}

export async function inTransaction<Result>(
  pool: pg.Pool,
  work: (connection: pg.PoolClient) => Promise<Result>,
): Promise<Result> {
  const connection = await pool.connect();

  try {
    await connection.query("begin");
    const result = await work(connection);
    await connection.query("commit");

    return result;
  } catch (error) {
    await connection.query("rollback");
    throw error;
  } finally {
    connection.release();
  }
}

export function daysBefore(instant: Date, days: number): Date {
  return new Date(instant.getTime() - days * MILLISECONDS_PER_DAY);
}

export function daysAfter(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * MILLISECONDS_PER_DAY);
}

async function insertPaidClient(
  connection: pg.PoolClient,
  binding: ClientBinding,
): Promise<PaidClient> {
  const { identity } = binding;
  const paidAt = new Date();
  const callId = await insertedId(connection, INSERT_ENDED_CALL, [
    identity.firstName,
    identity.lastName,
    identity.email,
    identity.dateOfBirth,
    identity.gender,
    PRIMARY_GOAL,
    COUNTRY,
    daysBefore(paidAt, CALL_ENDED_DAYS_AGO),
    TIME_ZONE,
  ]);
  const clientId = await insertedId(connection, INSERT_CLIENT, [
    callId,
    identity.firstName,
    identity.lastName,
    identity.email,
    identity.dateOfBirth,
    identity.gender,
    PRIMARY_GOAL,
    COUNTRY,
    paidAt,
    binding.authSubjectId,
  ]);
  const stripeReference = randomUUID();
  await connection.query(INSERT_SUBSCRIPTION, [
    clientId,
    callId,
    `cus_e2e_${stripeReference}`,
    `sub_e2e_${stripeReference}`,
    `cs_e2e_${stripeReference}`,
    paidAt,
    binding.start,
  ]);

  return {
    clientId,
    firstName: identity.firstName,
    fullName: `${identity.firstName} ${identity.lastName}`,
    email: identity.email,
    paidAt,
  };
}

function invitationTimesFor(
  standing: InvitationStanding,
  now: Date,
): InvitationTimes {
  if (standing === "expired") {
    const sentAt = daysBefore(now, EXPIRED_INVITATION_SENT_DAYS_AGO);

    return {
      sentAt,
      expiresAt: daysAfter(sentAt, INVITATION_VALIDITY_DAYS),
      emailSentAt: sentAt,
      emailDeliveryFailedAt: null,
    };
  }

  const sentAt = daysBefore(now, PENDING_INVITATION_SENT_DAYS_AGO);
  const expiresAt = daysAfter(sentAt, INVITATION_VALIDITY_DAYS);

  if (standing === "email-failed") {
    return {
      sentAt,
      expiresAt,
      emailSentAt: null,
      emailDeliveryFailedAt: sentAt,
    };
  }

  return {
    sentAt,
    expiresAt,
    emailSentAt: sentAt,
    emailDeliveryFailedAt: null,
  };
}

function sha256Hex(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
