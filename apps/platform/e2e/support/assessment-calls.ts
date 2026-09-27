import { createE2eDatabasePool } from "./database";

const ASSESSMENT_CALL_APPOINTMENT_KIND = "assessment_call";
const DELETE_CALLS_AND_THEIR_SALES = [
  "delete from app.coaching_subscriptions",
  "delete from app.client_invitations",
  "delete from app.clients",
  "delete from app.checkout_sessions",
  "delete from app.payment_links",
  "delete from app.assessment_calls",
];
const RELEASE_RESERVED_COACH_TIME = `
  delete from app.coach_time_reservations
  where appointment_kind = $1
`;
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

// The coach sees every call ever booked, and the booking journey always takes
// the soonest open slot, so calls left behind by an earlier run would push the
// one this run books off the dashboard's next-three widget. The sales rows go
// with them because they reference the calls.
export async function clearAssessmentCallsAndTheirSales(): Promise<void> {
  const pool = createE2eDatabasePool();

  try {
    for (const statement of DELETE_CALLS_AND_THEIR_SALES) {
      await pool.query(statement);
    }
    await pool.query(RELEASE_RESERVED_COACH_TIME, [
      ASSESSMENT_CALL_APPOINTMENT_KIND,
    ]);
  } finally {
    await pool.end();
  }
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
