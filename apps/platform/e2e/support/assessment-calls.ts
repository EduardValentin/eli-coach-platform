import { ASSESSMENT_CALL_RULES } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type pg from "pg";

import { isClerkTestEmail, readCreatedEmails } from "./clerk-users";
import { removeClientResourceFilesOf } from "./client-resource-files";
import { createE2eDatabasePool } from "./database";
import { removeProgressPhotoFilesOf } from "./progress-photo-files";
import { runEmailPrefix } from "./run-id";

const FIND_CALLS_BOOKED_BY = `
  select id from app.assessment_calls
  where visitor_email = any($1::text[])
`;
const FIND_CLIENTS_OF_CALLS = `
  select id from app.clients
  where assessment_call_id = any($1::uuid[])
`;
const DELETE_CALLS_AND_THEIR_SALES: readonly RowRemoval[] = [
  {
    rows: "payment cards",
    statement: `
      delete from app.payment_cards
      where stripe_customer_id in (
        select stripe_customer_id from app.coaching_subscriptions
        where assessment_call_id = any($1::uuid[])
      )
    `,
  },
  {
    rows: "coaching subscriptions",
    statement: `
      delete from app.coaching_subscriptions
      where assessment_call_id = any($1::uuid[])
    `,
  },
  {
    rows: "account invitations",
    statement: `
      delete from app.account_invitations
      where id in (
        select account_invitation_id from app.clients
        where assessment_call_id = any($1::uuid[])
      )
    `,
  },
  clientOwnedRows("onboarding drafts", "client_onboarding_drafts"),
  clientOwnedRows("onboarding submissions", "client_onboarding_submissions"),
  clientOwnedRows("progress photos", "client_progress_photos"),
  clientOwnedRows("client resources", "client_resources"),
  clientOwnedRows("measurements", "client_measurements"),
  clientOwnedRows("client settings", "client_settings"),
  clientOwnedRows("client avatars", "client_avatars"),
  clientOwnedRows("detail requests", "client_onboarding_detail_requests"),
  clientOwnedRows("onboarding reviews", "client_onboarding_reviews"),
  clientOwnedRows("client profiles", "client_profiles"),
  {
    rows: "check-ins",
    statement: `
      with removed as (
        delete from app.check_ins
        where client_id in (
          select id from app.clients where assessment_call_id = any($1::uuid[])
        )
        returning reservation_id
      )
      delete from app.coach_time_reservations
      where id in (select reservation_id from removed)
    `,
  },
  clientOwnedRows("weekly check-in series", "check_in_series"),
  {
    rows: "client notifications",
    statement: `
      delete from app.notifications
      where recipient_client_id in (
        select id from app.clients where assessment_call_id = any($1::uuid[])
      )
    `,
  },
  {
    rows: "clients",
    statement: `
      delete from app.clients
      where assessment_call_id = any($1::uuid[])
    `,
  },
  {
    rows: "checkout sessions",
    statement: `
      delete from app.checkout_sessions
      where payment_link_id in (
        select id from app.payment_links
        where assessment_call_id = any($1::uuid[])
      )
    `,
  },
  {
    rows: "payment links",
    statement: `
      delete from app.payment_links
      where assessment_call_id = any($1::uuid[])
    `,
  },
  {
    rows: "assessment calls",
    statement: `
      with removed as (
        delete from app.assessment_calls
        where id = any($1::uuid[])
        returning reservation_id
      )
      delete from app.coach_time_reservations
      where id in (select reservation_id from removed)
    `,
  },
];
const FIND_LATEST_CALL_BY_EMAIL = `
  select id from app.assessment_calls
  where visitor_email = $1
  order by booked_at desc
  limit 1
`;
const COUNT_CALLS_LEFT_TODAY = `
  select count(*)::int as left_today from app.assessment_calls
  where starts_at + make_interval(mins => $2) > now()
    and (starts_at at time zone $1)::date = (now() at time zone $1)::date
`;
const MOVE_CALL_TWO_HOURS_INTO_THE_PAST = `
  update app.assessment_calls
  set starts_at = now() - interval '2 hours'
  where id = $1
`;
const MOVE_RESERVATION_TWO_HOURS_INTO_THE_PAST = `
  update app.coach_time_reservations reservation
  set starts_at = now() - interval '2 hours',
      ends_at = now() - interval '2 hours'
        + (reservation.ends_at - reservation.starts_at)
  from app.assessment_calls call
  where call.reservation_id = reservation.id and call.id = $1
`;

type RowRemoval = { rows: string; statement: string };

function clientOwnedRows(rows: string, table: string): RowRemoval {
  return {
    rows,
    statement: `
      delete from app.${table}
      where client_id in (
        select id from app.clients where assessment_call_id = any($1::uuid[])
      )
    `,
  };
}

type RemovedRows = { rows: string; count: number };

type CallRemoval = { removed: RemovedRows[]; clientIds: string[] };

export function emailsOwnedByRun(
  recordedEmails: readonly string[],
  runId: string,
): string[] {
  return recordedEmails.filter(
    (email) =>
      email.startsWith(runEmailPrefix(runId)) && isClerkTestEmail(email),
  );
}

export async function cleanUpRunAssessmentCalls(
  runId: string,
  logPrefix: string,
): Promise<{ allCleaned: boolean }> {
  const visitorEmails = emailsOwnedByRun(readCreatedEmails(runId), runId);

  if (visitorEmails.length === 0) {
    return { allCleaned: true };
  }

  const pool = createE2eDatabasePool();

  try {
    const { removed, clientIds } = await deleteCallsBookedBy(
      pool,
      visitorEmails,
    );
    console.log(`${logPrefix} Database: ${summarize(removed)}`);
    console.log(
      `${logPrefix} Progress photo files: ${removeProgressPhotoFilesOf(clientIds)}`,
    );
    console.log(
      `${logPrefix} Client resource files: ${removeClientResourceFilesOf(clientIds)}`,
    );

    return { allCleaned: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(`${logPrefix} Database: failed: ${reason}`);

    return { allCleaned: false };
  } finally {
    await pool.end();
  }
}

async function deleteCallsBookedBy(
  pool: pg.Pool,
  visitorEmails: readonly string[],
): Promise<CallRemoval> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const { rows: calls } = await client.query<{ id: string }>(
      FIND_CALLS_BOOKED_BY,
      [visitorEmails],
    );
    const callIds = calls.map((call) => call.id);
    const { rows: clients } = await client.query<{ id: string }>(
      FIND_CLIENTS_OF_CALLS,
      [callIds],
    );
    const removed: RemovedRows[] = [];

    for (const removal of DELETE_CALLS_AND_THEIR_SALES) {
      const { rowCount } = await client.query(removal.statement, [callIds]);
      removed.push({ rows: removal.rows, count: rowCount ?? 0 });
    }

    await client.query("commit");

    return { removed, clientIds: clients.map((row) => row.id) };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function summarize(removed: readonly RemovedRows[]): string {
  return `removed ${removed.map((entry) => `${entry.rows} ${entry.count}`).join(", ")}`;
}

export async function findCallIdByEmail(email: string): Promise<string> {
  const pool = createE2eDatabasePool();

  try {
    const { rows } = await pool.query<{ id: string }>(
      FIND_LATEST_CALL_BY_EMAIL,
      [email],
    );
    const [call] = rows;

    if (!call) {
      throw new Error(`No assessment call is booked for ${email}.`);
    }

    return call.id;
  } finally {
    await pool.end();
  }
}

export async function endCall(callId: string): Promise<void> {
  const pool = createE2eDatabasePool();

  try {
    await pool.query(MOVE_CALL_TWO_HOURS_INTO_THE_PAST, [callId]);
    await pool.query(MOVE_RESERVATION_TWO_HOURS_INTO_THE_PAST, [callId]);
  } finally {
    await pool.end();
  }
}

export async function countCallsLeftToday(timeZone: string): Promise<number> {
  const pool = createE2eDatabasePool();

  try {
    const { rows } = await pool.query<{ left_today: number }>(
      COUNT_CALLS_LEFT_TODAY,
      [timeZone, ASSESSMENT_CALL_RULES.durationMinutes],
    );

    return rows[0]?.left_today ?? 0;
  } finally {
    await pool.end();
  }
}
