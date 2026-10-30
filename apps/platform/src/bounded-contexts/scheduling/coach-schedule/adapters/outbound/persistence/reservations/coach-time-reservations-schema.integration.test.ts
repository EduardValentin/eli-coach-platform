import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const CALL_ID = "0b3a7f6e-6c2c-4a1e-9f47-2d0c1f6f9a01";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const CHECK_IN_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const OTHER_CHECK_IN_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const CALL_RESERVATION_ID = "3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f";
const CHECK_IN_RESERVATION_ID = "4d5e6f7a-8b9c-4d0e-9f1a-3b4c5d6e7f8a";
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";

const RESTRICT_VIOLATION = "23001";
const NOT_NULL_VIOLATION = "23502";
const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

const reserveSql = `
  insert into app.coach_time_reservations (id, starts_at, ends_at)
  values ($1, $2, $3)
`;

const insertCallSql = `
  insert into app.assessment_calls
    (id, first_name, last_name, visitor_email, date_of_birth, gender, primary_goal, country, starts_at, visitor_time_zone, coach_time_zone, booked_at, reservation_id)
  values
    ($1, 'Ana', 'Regular', 'ana@example.com', '1994-03-14', 'female', 'build_strength', 'RO', '2026-09-01T14:00:00Z', 'Europe/Bucharest', 'Europe/Bucharest', '2026-08-25T08:00:00Z', $2)
`;

const insertClientSql = `
  insert into app.clients
    (id, assessment_call_id, first_name, last_name, email, date_of_birth, gender, primary_goal, country, created_at, booking_time_zone)
  values
    ($1, $2, 'Ana', 'Regular', 'ana@example.com', '1994-03-14', 'female', 'build_strength', 'RO', '2026-09-01T15:00:00Z', 'Europe/Bucharest')
`;

const insertCheckInSql = `
  insert into app.check_ins
    (id, client_id, starts_at, client_time_zone, coach_time_zone, kind, status, initiated_by, proposed_by, requested_at, reservation_id)
  values
    ($1, $2, '2026-10-20T15:00:00Z', 'Europe/Bucharest', 'Europe/Bucharest', 'ad_hoc', 'pending', 'client', 'client', '2026-10-15T08:00:00Z', $3)
`;

describe.sequential("coach time reservations schema", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("keeps a call's reserved time while the call holds it", async () => {
    // arrange
    await insertCall();

    // act
    const result = deleteReservation(CALL_RESERVATION_ID);

    // assert
    await expect(result).rejects.toMatchObject({ code: RESTRICT_VIOLATION });
    expect(await countReservations()).toBe(1);
  });

  it("keeps a check-in's reserved time while the check-in holds it", async () => {
    // arrange
    await insertClient();
    await reserve(CHECK_IN_RESERVATION_ID, "2026-10-20T15:00:00Z");
    await insertCheckIn(CHECK_IN_ID, CHECK_IN_RESERVATION_ID);

    // act
    const result = deleteReservation(CHECK_IN_RESERVATION_ID);

    // assert
    await expect(result).rejects.toMatchObject({ code: RESTRICT_VIOLATION });
    expect(await countReservations()).toBe(2);
  });

  it("refuses a call that holds no reserved time", async () => {
    // arrange
    const call = { callId: CALL_ID, reservationId: null };

    // act
    const result = suite.postgres.executeSql({
      sql: insertCallSql,
      values: [call.callId, call.reservationId],
    });

    // assert
    await expect(result).rejects.toMatchObject({ code: NOT_NULL_VIOLATION });
  });

  it("refuses a check-in holding reserved time that does not exist", async () => {
    // arrange
    await insertClient();

    // act
    const result = insertCheckIn(CHECK_IN_ID, UNKNOWN_ID);

    // assert
    await expect(result).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
  });

  it("refuses two check-ins holding the same reserved time", async () => {
    // arrange
    await insertClient();
    await reserve(CHECK_IN_RESERVATION_ID, "2026-10-20T15:00:00Z");
    await insertCheckIn(CHECK_IN_ID, CHECK_IN_RESERVATION_ID);

    // act
    const result = insertCheckIn(OTHER_CHECK_IN_ID, CHECK_IN_RESERVATION_ID);

    // assert
    await expect(result).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
  });
});

async function reserve(reservationId: string, startsAt: string): Promise<void> {
  const endsAt = new Date(Date.parse(startsAt) + 60 * 60 * 1_000);

  await suite.postgres.executeSql({
    sql: reserveSql,
    values: [reservationId, startsAt, endsAt.toISOString()],
  });
}

async function insertCall(): Promise<void> {
  await reserve(CALL_RESERVATION_ID, "2026-09-01T14:00:00Z");
  await suite.postgres.executeSql({
    sql: insertCallSql,
    values: [CALL_ID, CALL_RESERVATION_ID],
  });
}

async function insertClient(): Promise<void> {
  await insertCall();
  await suite.postgres.executeSql({
    sql: insertClientSql,
    values: [CLIENT_ID, CALL_ID],
  });
}

async function insertCheckIn(
  checkInId: string,
  reservationId: string,
): Promise<void> {
  await suite.postgres.executeSql({
    sql: insertCheckInSql,
    values: [checkInId, CLIENT_ID, reservationId],
  });
}

async function deleteReservation(reservationId: string): Promise<void> {
  await suite.postgres.executeSql({
    sql: "delete from app.coach_time_reservations where id = $1",
    values: [reservationId],
  });
}

async function countReservations(): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.coach_time_reservations",
    whereClause: "true",
    values: [],
  });
}
