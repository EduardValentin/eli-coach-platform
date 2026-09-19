import { ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  bookAssessmentCallResponseSchema,
  openSlotsResponseSchema,
} from "~/features/assessment-calls/contracts/assessment-calls";
import {
  updateAssessmentCallSettingsErrorSchema,
  updateAssessmentCallSettingsSuccessSchema,
} from "~/features/assessment-calls/contracts/assessment-call-settings";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

type CoachAvailabilityRow = {
  id: number;
  timeZone: string;
  weekdays: string[];
  startHour: number;
  endHour: number;
  updatedAt: Date;
};

type CoachMeetingRoomRow = {
  id: number;
  url: string | null;
  updatedAt: Date;
};

type AssessmentCallRow = {
  id: string;
  startsAt: Date;
  visitorEmail: string;
};

type CoachTimeReservationRow = {
  startsAt: Date;
  endsAt: Date;
  appointmentId: string;
};

const COACH_SESSION = {
  sessionId: "sess_settingscoachsession",
  subjectId: "user_settingscoachsubject",
};
const CLIENT_SESSION = {
  sessionId: "sess_settingsclientsession",
  subjectId: "user_settingsclientsubject",
};

const suite = new ApiIntegrationTestSuite({
  environment: { BOOTSTRAP_COACH_AUTH_SUBJECT_ID: COACH_SESSION.subjectId },
});
const bookingToken = turnstileTokenForAction(
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
);

const VALID_UPDATE = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "wednesday"],
  startHour: 9,
  endHour: 11,
  meetingLink: "https://meet.example/eli-room",
};

const MONDAY_EARLY_MORNING = new Date("2026-10-19T03:00:00.000Z");
const MONDAY_MORNING = new Date("2026-10-19T08:00:00.000Z");
const MONDAY_EVENING_START = "2026-10-19T14:00:00.000Z";
const TUESDAY_EVENING_START = "2026-10-20T14:00:00.000Z";

describe.sequential("assessment call settings integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  beforeEach(async () => {
    await switchWaitlistModeOff();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("refuses an anonymous save", async () => {
    // arrange, act
    const response = await requestSettingsUpdate({ body: VALID_UPDATE });

    // assert
    expect(response.status).toBe(401);
  });

  it("refuses a client's save", async () => {
    // arrange
    await provisionClient();

    // act
    const response = await requestSettingsUpdate({
      authorization: clientAuthorization(),
      body: VALID_UPDATE,
    });

    // assert
    expect(response.status).toBe(403);
  });

  it("answers 400 no_weekday for an empty weekday list", async () => {
    // arrange, act
    const response = await requestSettingsUpdate({
      authorization: coachAuthorization(),
      body: { ...VALID_UPDATE, weekdays: [] },
    });

    // assert
    expect(response.status).toBe(400);
    expect(
      updateAssessmentCallSettingsErrorSchema.parse(await response.json()).error
        .code,
    ).toBe("no_weekday");
  });

  it("answers 400 invalid_hours for a start at or after the end", async () => {
    // arrange, act
    const response = await requestSettingsUpdate({
      authorization: coachAuthorization(),
      body: { ...VALID_UPDATE, startHour: 20, endHour: 17 },
    });

    // assert
    expect(response.status).toBe(400);
    expect(
      updateAssessmentCallSettingsErrorSchema.parse(await response.json()).error
        .code,
    ).toBe("invalid_hours");
  });

  it("answers 400 invalid_meeting_link for a non-https link", async () => {
    // arrange, act
    const response = await requestSettingsUpdate({
      authorization: coachAuthorization(),
      body: { ...VALID_UPDATE, meetingLink: "ftp://meet.example/eli" },
    });

    // assert
    expect(response.status).toBe(400);
    expect(
      updateAssessmentCallSettingsErrorSchema.parse(await response.json()).error
        .code,
    ).toBe("invalid_meeting_link");
  });

  it("answers 400 invalid_time_zone for a zone the runtime does not know", async () => {
    // arrange, act
    const response = await requestSettingsUpdate({
      authorization: coachAuthorization(),
      body: { ...VALID_UPDATE, timeZone: "Mars/Olympus_Mons" },
    });

    // assert
    expect(response.status).toBe(400);
    expect(
      updateAssessmentCallSettingsErrorSchema.parse(await response.json()).error
        .code,
    ).toBe("invalid_time_zone");
  });

  it("saves the coach's availability and meeting room, stamped with the server clock", async () => {
    // arrange
    const savedAt = new Date("2026-10-12T09:00:00.000Z");
    await suite.setServerClock(savedAt);

    // act
    const response = await requestSettingsUpdate({
      authorization: coachAuthorization(savedAt),
      body: VALID_UPDATE,
    });

    // assert
    expect(response.status).toBe(200);

    const body = updateAssessmentCallSettingsSuccessSchema.parse(
      await response.json(),
    );

    expect(body.settings).toEqual(VALID_UPDATE);

    const [availabilityRow] = await readAvailability();
    const [meetingRoomRow] = await readMeetingRoom();

    expect(availabilityRow).toMatchObject({
      id: 1,
      timeZone: VALID_UPDATE.timeZone,
      weekdays: VALID_UPDATE.weekdays,
      startHour: VALID_UPDATE.startHour,
      endHour: VALID_UPDATE.endHour,
    });
    expect(availabilityRow?.updatedAt).toEqual(savedAt);
    expect(meetingRoomRow).toMatchObject({
      id: 1,
      url: VALID_UPDATE.meetingLink,
    });
    expect(meetingRoomRow?.updatedAt).toEqual(savedAt);
  });

  it("changes what the slots API and /book offer at once", async () => {
    // arrange
    await suite.setServerClock(MONDAY_EARLY_MORNING);
    await requestSettingsUpdate({
      authorization: coachAuthorization(MONDAY_EARLY_MORNING),
      body: VALID_UPDATE,
    });

    // act
    const slotsResponse = await requestSlots();
    const bookPageResponse = await requestBookingPage();

    // assert
    const slots = openSlotsResponseSchema.parse(
      await slotsResponse.json(),
    ).slots;

    expect(slots.slice(0, 2)).toEqual([
      "2026-10-19T06:00:00.000Z",
      "2026-10-19T07:00:00.000Z",
    ]);
    expect(slots).not.toContain(MONDAY_EVENING_START);
    expect(bookPageResponse.status).toBe(200);
  });

  it("keeps a booking made before a narrowing save, still blocking its hour", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    const booked = bookAssessmentCallResponseSchema.parse(
      await (await requestBooking()).json(),
    );

    if (!booked.success) {
      throw new Error(`Expected a confirmed booking: ${booked.error.code}.`);
    }

    const [originalCall] = await readCalls();
    const [originalReservation] = await readCoachTimeReservations();

    // act
    await requestSettingsUpdate({
      authorization: coachAuthorization(MONDAY_MORNING),
      body: {
        endHour: 18,
        meetingLink: null,
        startHour: 17,
        timeZone: "Europe/Bucharest",
        weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
    });
    const slots = openSlotsResponseSchema.parse(
      await (await requestSlots()).json(),
    ).slots;

    // assert
    expect(await readCalls()).toEqual([originalCall]);
    expect(await readCoachTimeReservations()).toEqual([originalReservation]);
    expect(slots).not.toContain(MONDAY_EVENING_START);
    expect(slots[0]).toBe(TUESDAY_EVENING_START);
  });

  describe("schema constraints", () => {
    it("refuses a coach_availability row whose id is not the singleton 1", async () => {
      // arrange, act
      const insert = insertAvailabilityDirectly({ id: 2 });

      // assert
      await expect(insert).rejects.toMatchObject({
        code: "23514",
        constraint: "coach_availability_is_singleton",
      });
    });

    it("refuses a coach_availability row with no weekday", async () => {
      // arrange, act
      const insert = insertAvailabilityDirectly({ weekdays: [] });

      // assert
      await expect(insert).rejects.toMatchObject({
        code: "23514",
        constraint: "coach_availability_has_a_weekday",
      });
    });

    it("refuses a coach_availability row whose start is at or after its end", async () => {
      // arrange, act
      const insert = insertAvailabilityDirectly({ endHour: 17, startHour: 20 });

      // assert
      await expect(insert).rejects.toMatchObject({
        code: "23514",
        constraint: "coach_availability_hours_in_range",
      });
    });

    it("refuses a coach_availability row whose end is past midnight", async () => {
      // arrange, act
      const insert = insertAvailabilityDirectly({ endHour: 25 });

      // assert
      await expect(insert).rejects.toMatchObject({
        code: "23514",
        constraint: "coach_availability_hours_in_range",
      });
    });

    it("refuses a coach_availability row whose start is before midnight", async () => {
      // arrange, act
      const insert = insertAvailabilityDirectly({ startHour: -1 });

      // assert
      await expect(insert).rejects.toMatchObject({
        code: "23514",
        constraint: "coach_availability_hours_in_range",
      });
    });

    it("refuses a coach_meeting_room row whose id is not the singleton 1", async () => {
      // arrange, act
      const insert = insertMeetingRoomDirectly({ id: 2 });

      // assert
      await expect(insert).rejects.toMatchObject({
        code: "23514",
        constraint: "coach_meeting_room_is_singleton",
      });
    });
  });
});

function coachAuthorization(issuedAt?: Date): string {
  return `Bearer ${mintSessionToken({ ...COACH_SESSION, issuedAt })}`;
}

function clientAuthorization(): string {
  return `Bearer ${mintSessionToken(CLIENT_SESSION)}`;
}

async function provisionClient(): Promise<void> {
  await suite.postgres.executeSql({
    sql: "insert into app.accounts (auth_subject_id, role) values ($1, $2)",
    values: [CLIENT_SESSION.subjectId, "CLIENT"],
  });
}

async function requestSettingsUpdate(options: {
  authorization?: string;
  body: unknown;
}): Promise<Response> {
  return suite.request(
    new Request(suite.url("/api/assessment-calls/settings"), {
      body: JSON.stringify(options.body),
      headers: {
        "content-type": "application/json",
        ...(options.authorization
          ? { authorization: options.authorization }
          : {}),
      },
      method: "PUT",
    }),
  );
}

async function requestSlots(): Promise<Response> {
  return suite.request(new Request(suite.url("/api/assessment-calls/slots")));
}

async function requestBookingPage(): Promise<Response> {
  return suite.request(new Request(suite.url("/book")));
}

async function requestBooking(): Promise<Response> {
  const body = new URLSearchParams({
    email: "ana@example.com",
    fullName: "Ana Popescu",
    startsAt: MONDAY_EVENING_START,
    visitorTimeZone: "Europe/London",
    "cf-turnstile-response": bookingToken,
  });

  return suite.request(
    new Request(suite.url("/api/assessment-calls"), {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    }),
  );
}

async function readAvailability(): Promise<CoachAvailabilityRow[]> {
  return suite.postgres.queryRows<CoachAvailabilityRow>({
    sql: `
      select
        id,
        time_zone as "timeZone",
        weekdays,
        start_hour as "startHour",
        end_hour as "endHour",
        updated_at as "updatedAt"
      from app.coach_availability
    `,
    values: [],
  });
}

async function readMeetingRoom(): Promise<CoachMeetingRoomRow[]> {
  return suite.postgres.queryRows<CoachMeetingRoomRow>({
    sql: `select id, url, updated_at as "updatedAt" from app.coach_meeting_room`,
    values: [],
  });
}

async function readCalls(): Promise<AssessmentCallRow[]> {
  return suite.postgres.queryRows<AssessmentCallRow>({
    sql: `
      select id, starts_at as "startsAt", visitor_email as "visitorEmail"
      from app.assessment_calls
      order by starts_at
    `,
    values: [],
  });
}

async function readCoachTimeReservations(): Promise<CoachTimeReservationRow[]> {
  return suite.postgres.queryRows<CoachTimeReservationRow>({
    sql: `
      select starts_at as "startsAt", ends_at as "endsAt", appointment_id as "appointmentId"
      from app.coach_time_reservations
      order by starts_at
    `,
    values: [],
  });
}

async function insertAvailabilityDirectly(
  overrides: Partial<{
    endHour: number;
    id: number;
    startHour: number;
    weekdays: string[];
  }>,
): Promise<void> {
  const row = {
    endHour: 20,
    id: 1,
    startHour: 17,
    weekdays: ["monday"],
    ...overrides,
  };

  await suite.postgres.executeSql({
    sql: `
      insert into app.coach_availability
        (id, time_zone, weekdays, start_hour, end_hour, updated_at)
      values ($1, $2, $3, $4, $5, now())
    `,
    values: [
      row.id,
      "Europe/Bucharest",
      row.weekdays,
      row.startHour,
      row.endHour,
    ],
  });
}

async function switchWaitlistModeOff(): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      update app.feature_flags
      set enabled = false, updated_at = now()
      where name = $1
    `,
    values: ["WAITLIST_MODE"],
  });
}

async function insertMeetingRoomDirectly(
  overrides: Partial<{ id: number; url: string | null }>,
): Promise<void> {
  const row = { id: 1, url: null, ...overrides };

  await suite.postgres.executeSql({
    sql: `insert into app.coach_meeting_room (id, url, updated_at) values ($1, $2, now())`,
    values: [row.id, row.url],
  });
}
