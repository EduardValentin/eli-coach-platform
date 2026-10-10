import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const CALL_ID = "0b3a7f6e-6c2c-4a1e-9f47-2d0c1f6f9a01";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const CHECK_IN_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const RESERVED_START = "2026-10-20T15:00:00Z";
const RESERVED_END = "2026-10-20T16:00:00Z";

const insertCallSql = `
  insert into app.assessment_calls
    (id, first_name, last_name, visitor_email, date_of_birth, gender, primary_goal, country, starts_at, visitor_time_zone, coach_time_zone, booked_at)
  values
    ($1, 'Ana', 'Regular', 'ana@example.com', '1994-03-14', 'female', 'build_strength', 'RO', '2026-09-01T14:00:00Z', 'Europe/Bucharest', 'Europe/Bucharest', '2026-08-25T08:00:00Z')
`;

const insertClientSql = `
  insert into app.clients
    (id, assessment_call_id, first_name, last_name, email, date_of_birth, gender, primary_goal, country, created_at)
  values
    ($1, $2, 'Ana', 'Regular', 'ana@example.com', '1994-03-14', 'female', 'build_strength', 'RO', '2026-09-01T15:00:00Z')
`;

const insertCheckInSql = `
  insert into app.check_ins
    (id, client_id, starts_at, client_time_zone, coach_time_zone, kind, status, initiated_by, proposed_by, requested_at)
  values
    ($1, $2, '2026-10-20T15:00:00Z', 'Europe/Bucharest', 'Europe/Bucharest', 'ad_hoc', 'pending', 'client', 'client', '2026-10-15T08:00:00Z')
`;

const reserveSql = `
  insert into app.coach_time_reservations (starts_at, ends_at, assessment_call_id, check_in_id)
  values ($1, $2, $3, $4)
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

  it("removes a call's reserved time with the call", async () => {
    // arrange
    await insertCall();
    await reserve({ assessmentCallId: CALL_ID, checkInId: null });

    // act
    await suite.postgres.executeSql({
      sql: "delete from app.assessment_calls where id = $1",
      values: [CALL_ID],
    });

    // assert
    expect(await countReservations()).toBe(0);
  });

  it("removes a check-in's reserved time with the check-in", async () => {
    // arrange
    await insertCheckIn();
    await reserve({ assessmentCallId: null, checkInId: CHECK_IN_ID });

    // act
    await suite.postgres.executeSql({
      sql: "delete from app.check_ins where id = $1",
      values: [CHECK_IN_ID],
    });

    // assert
    expect(await countReservations()).toBe(0);
  });

  it("refuses to keep time reserved for a check-in that does not exist", async () => {
    // arrange
    const reservation = { assessmentCallId: null, checkInId: UNKNOWN_ID };

    // act
    const result = reserve(reservation);

    // assert
    await expect(result).rejects.toMatchObject({ code: "23503" });
    expect(await countReservations()).toBe(0);
  });

  it.each([
    [{ assessmentCallId: null, checkInId: null }],
    [{ assessmentCallId: CALL_ID, checkInId: CHECK_IN_ID }],
  ])(
    "refuses reserved time that does not belong to exactly one appointment %o",
    async (owners) => {
      // arrange
      await insertCheckIn();

      // act
      const result = reserve(owners);

      // assert
      await expect(result).rejects.toMatchObject({ code: "23514" });
      expect(await countReservations()).toBe(0);
    },
  );
});

async function insertCall(): Promise<void> {
  await suite.postgres.executeSql({ sql: insertCallSql, values: [CALL_ID] });
}

async function insertClient(): Promise<void> {
  await insertCall();
  await suite.postgres.executeSql({
    sql: insertClientSql,
    values: [CLIENT_ID, CALL_ID],
  });
}

async function insertCheckIn(): Promise<void> {
  await insertClient();
  await suite.postgres.executeSql({
    sql: insertCheckInSql,
    values: [CHECK_IN_ID, CLIENT_ID],
  });
}

type ReservationOwners = {
  assessmentCallId: string | null;
  checkInId: string | null;
};

async function reserve(owners: ReservationOwners): Promise<void> {
  await suite.postgres.executeSql({
    sql: reserveSql,
    values: reserveValues(owners),
  });
}

function reserveValues(owners: ReservationOwners): unknown[] {
  return [
    RESERVED_START,
    RESERVED_END,
    owners.assessmentCallId,
    owners.checkInId,
  ];
}

async function countReservations(): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.coach_time_reservations",
    whereClause: "true",
    values: [],
  });
}
