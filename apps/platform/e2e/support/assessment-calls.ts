import { createE2eDatabasePool } from "./database";

const ASSESSMENT_CALL_APPOINTMENT_KIND = "assessment_call";
const DELETE_ASSESSMENT_CALLS = "delete from app.assessment_calls";
const RELEASE_RESERVED_COACH_TIME = `
  delete from app.coach_time_reservations
  where appointment_kind = $1
`;

// The coach sees every call ever booked, and the booking journey always takes
// the soonest open slot, so calls left behind by an earlier run would push the
// one this run books off the dashboard's next-three widget.
export async function clearBookedAssessmentCalls(): Promise<void> {
  const pool = createE2eDatabasePool();

  try {
    await pool.query(DELETE_ASSESSMENT_CALLS);
    await pool.query(RELEASE_RESERVED_COACH_TIME, [
      ASSESSMENT_CALL_APPOINTMENT_KIND,
    ]);
  } finally {
    await pool.end();
  }
}
