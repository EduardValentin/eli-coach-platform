import type pg from "pg";

import { isClerkTestEmail, readCreatedEmails } from "./clerk-users";
import { createE2eDatabasePool } from "./database";
import { runEmailPrefix } from "./run-id";

const ASSESSMENT_CALL_APPOINTMENT_KIND = "assessment_call";
const FIND_CALLS_BOOKED_BY = `
  select id from app.assessment_calls
  where visitor_email = any($1::text[])
`;
const DELETE_CALLS_AND_THEIR_SALES: readonly RowRemoval[] = [
  {
    rows: "coaching subscriptions",
    statement: `
      delete from app.coaching_subscriptions
      where assessment_call_id = any($1::uuid[])
    `,
  },
  {
    rows: "client invitations",
    statement: `
      delete from app.client_invitations
      where client_id in (
        select id from app.clients where assessment_call_id = any($1::uuid[])
      )
    `,
  },
  clientOwnedRows("onboarding drafts", "client_onboarding_drafts"),
  clientOwnedRows("onboarding submissions", "client_onboarding_submissions"),
  clientOwnedRows("measurements", "client_measurements"),
  clientOwnedRows("unit preferences", "client_unit_preferences"),
  clientOwnedRows("detail requests", "client_onboarding_detail_requests"),
  clientOwnedRows("onboarding reviews", "client_onboarding_reviews"),
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
    rows: "coach time reservations",
    statement: `
      delete from app.coach_time_reservations
      where appointment_kind = 'assessment_call'
        and appointment_id = any($1::uuid[])
    `,
  },
  {
    rows: "assessment calls",
    statement: `
      delete from app.assessment_calls
      where id = any($1::uuid[])
    `,
  },
];
const FIND_LATEST_CALL_BY_EMAIL = `
  select id from app.assessment_calls
  where visitor_email = $1
  order by booked_at desc
  limit 1
`;
const MOVE_CALL_TWO_HOURS_INTO_THE_PAST = `
  update app.assessment_calls
  set starts_at = now() - interval '2 hours'
  where id = $1
`;
const MOVE_RESERVATION_TWO_HOURS_INTO_THE_PAST = `
  update app.coach_time_reservations
  set starts_at = now() - interval '2 hours',
      ends_at = now() - interval '2 hours' + (ends_at - starts_at)
  where appointment_kind = $1 and appointment_id = $2
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
    const removed = await deleteCallsBookedBy(pool, visitorEmails);
    console.log(`${logPrefix} Database: ${summarize(removed)}`);

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
): Promise<RemovedRows[]> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const { rows: calls } = await client.query<{ id: string }>(
      FIND_CALLS_BOOKED_BY,
      [visitorEmails],
    );
    const callIds = calls.map((call) => call.id);
    const removed: RemovedRows[] = [];

    for (const removal of DELETE_CALLS_AND_THEIR_SALES) {
      const { rowCount } = await client.query(removal.statement, [callIds]);
      removed.push({ rows: removal.rows, count: rowCount ?? 0 });
    }

    await client.query("commit");

    return removed;
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
    await pool.query(MOVE_RESERVATION_TWO_HOURS_INTO_THE_PAST, [
      ASSESSMENT_CALL_APPOINTMENT_KIND,
      callId,
    ]);
  } finally {
    await pool.end();
  }
}
