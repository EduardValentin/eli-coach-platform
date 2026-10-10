import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import {
  CheckInsJourney,
  SIGNED_OUT,
} from "~integration-test-config/check-ins-journey";
import { ClientOnboardingJourney } from "~integration-test-config/client-onboarding-journey";
import {
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
  SECOND_PURCHASE,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_checkin_join_ana",
  subjectId: "user_checkin_join_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_checkin_join_maria",
  subjectId: "user_checkin_join_maria",
};

const MARIA: Visitor = {
  email: "maria.join@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const MEETING_ROOM = "https://meet.example/eli-check-in-room";
const PUBLIC_ORIGIN = "https://localhost:3000";
const SIGN_IN_URL = "https://evoa.fit/sign-in";
const REQUESTED_AT = CALL_ENDED_INSTANT;
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const DURING_THE_CHECK_IN = new Date("2026-10-22T14:20:00.000Z");
const AFTER_THE_CHECK_IN = new Date("2026-10-22T15:00:00.000Z");

describe.sequential("check-in join integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("an approved check-in", () => {
    it("sends the client to the coach's meeting room", async () => {
      // arrange
      await checkIns.saveMeetingRoom(MEETING_ROOM);
      const checkInId = await approvedCheckInOfAna();

      // act
      const response = await checkIns.joinAsClient(ANA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(MEETING_ROOM);
    });

    it("sends the coach to her meeting room while the check-in runs", async () => {
      // arrange
      await checkIns.saveMeetingRoom(MEETING_ROOM);
      const checkInId = await approvedCheckInOfAna();
      await rig.holdClock(DURING_THE_CHECK_IN);

      // act
      const response = await checkIns.joinAsCoach(COACH_SESSION, checkInId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(MEETING_ROOM);
    });

    it("tells the client the link is not ready while no meeting room is saved", async () => {
      // arrange
      const checkInId = await approvedCheckInOfAna();

      // act
      const response = await checkIns.joinAsClient(ANA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(200);
      expect(await visibleDocument(response)).toContain(
        "Your check-in link isn&#x27;t ready yet",
      );
    });

    it("tells the coach her meeting link is not set while no meeting room is saved", async () => {
      // arrange
      const checkInId = await approvedCheckInOfAna();

      // act
      const response = await checkIns.joinAsCoach(COACH_SESSION, checkInId);

      // assert
      expect(response.status).toBe(200);
      expect(await visibleDocument(response)).toContain(
        "Your meeting link isn&#x27;t set yet",
      );
    });

    it("answers not found to another client", async () => {
      // arrange
      await checkIns.saveMeetingRoom(MEETING_ROOM);
      const checkInId = await approvedCheckInOfAna();
      await submittedMaria();

      // act
      const response = await checkIns.joinAsClient(MARIA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(404);
    });

    it("answers not found once the check-in has passed", async () => {
      // arrange
      await checkIns.saveMeetingRoom(MEETING_ROOM);
      const checkInId = await approvedCheckInOfAna();
      await rig.holdClock(AFTER_THE_CHECK_IN);

      // act
      const responses = await Promise.all([
        checkIns.joinAsClient(ANA_SESSION, checkInId),
        checkIns.joinAsCoach(COACH_SESSION, checkInId),
      ]);

      // assert
      expect(responses.map(({ status }) => status)).toEqual([404, 404]);
    });

    it.each([
      { portal: "client", join: checkIns.joinAsClient.bind(checkIns) },
      { portal: "coach", join: checkIns.joinAsCoach.bind(checkIns) },
    ])(
      "sends a visitor who is not signed in to sign in and back to the $portal link",
      async ({ portal, join }) => {
        // arrange
        await checkIns.saveMeetingRoom(MEETING_ROOM);
        const checkInId = await approvedCheckInOfAna();

        // act
        const response = await join(SIGNED_OUT, checkInId);

        // assert
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe(
          `${SIGN_IN_URL}?redirect_url=${encodeURIComponent(
            `${PUBLIC_ORIGIN}${suite.path(`/${portal}/checkins/${checkInId}/join`)}`,
          )}`,
        );
      },
    );
  });

  describe("a check-in that is not approved", () => {
    it("answers not found to both while the request waits", async () => {
      // arrange
      await checkIns.saveMeetingRoom(MEETING_ROOM);
      const checkInId = await requestOfAna();

      // act
      const responses = await Promise.all([
        checkIns.joinAsClient(ANA_SESSION, checkInId),
        checkIns.joinAsCoach(COACH_SESSION, checkInId),
      ]);

      // assert
      expect(responses.map(({ status }) => status)).toEqual([404, 404]);
    });

    it("answers not found to both once the coach declined it", async () => {
      // arrange
      await checkIns.saveMeetingRoom(MEETING_ROOM);
      const checkInId = await requestOfAna();
      await checkIns.decline(checkInId);

      // act
      const responses = await Promise.all([
        checkIns.joinAsClient(ANA_SESSION, checkInId),
        checkIns.joinAsCoach(COACH_SESSION, checkInId),
      ]);

      // assert
      expect(responses.map(({ status }) => status)).toEqual([404, 404]);
    });

    it("answers not found to an id that is not a check-in", async () => {
      // arrange
      await checkIns.saveMeetingRoom(MEETING_ROOM);
      await submittedAna();

      // act
      const responses = await Promise.all([
        checkIns.joinAsClient(ANA_SESSION, "not-a-check-in"),
        checkIns.joinAsCoach(
          COACH_SESSION,
          "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0",
        ),
      ]);

      // assert
      expect(responses.map(({ status }) => status)).toEqual([404, 404]);
    });
  });
});

async function submittedAna(): Promise<void> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(REQUESTED_AT);
  await onboarding.submit(ANA_SESSION);
}

async function submittedMaria(): Promise<void> {
  await onboarding.admit(MARIA, MARIA_SESSION, SECOND_PURCHASE);
  await rig.holdClock(REQUESTED_AT);
  await onboarding.submit(MARIA_SESSION);
}

async function requestOfAna(): Promise<string> {
  await submittedAna();

  return checkIns.requested(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR });
}

async function approvedCheckInOfAna(): Promise<string> {
  const checkInId = await requestOfAna();
  await checkIns.approved(checkInId);

  return checkInId;
}
