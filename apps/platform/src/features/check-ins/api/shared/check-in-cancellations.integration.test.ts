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
import { CheckInsJourney } from "~integration-test-config/check-ins-journey";
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
import { resendRejects } from "~integration-test-config/wire-mock/expectations/resend-emails";

const COACH_EMAIL = "eli@evoa.fit";

const suite = new ApiIntegrationTestSuite({
  environment: { ASSESSMENT_CALL_COACH_EMAIL: COACH_EMAIL },
});
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_check_in_cancellations_ana",
  subjectId: "user_check_in_cancellations_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_check_in_cancellations_maria",
  subjectId: "user_check_in_cancellations_maria",
};

const MARIA: Visitor = {
  email: "maria.cancellations@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const NOW = CALL_ENDED_INSTANT;
const CANCELLED_AT = new Date("2026-10-21T09:30:00.000Z");
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const HER_ZONE_NOW = "America/New_York";

describe.sequential("check-in cancellations integration", () => {
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

  it("cancels the approved check-in on the client's word from her zone and frees its hour", async () => {
    // arrange
    const checkInId = await approvedThursdayCheckIn();
    await rig.holdClock(CANCELLED_AT);

    // act
    const response = await checkIns.cancel(ANA_SESSION, checkInId, {
      timeZone: HER_ZONE_NOW,
    });

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "cancelled", checkInId });
    expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
      status: "cancelled",
      clientTimeZone: HER_ZONE_NOW,
      answeredAt: CANCELLED_AT,
    });
    expect(await checkIns.heldCheckInHours()).toEqual([]);
    expect(await checkIns.openTimesOf(ANA_SESSION)).toContain(
      THURSDAY_FIRST_HOUR,
    );
    expect(await sales.openSlots()).toContain(THURSDAY_FIRST_HOUR);
  });

  it("emails the coach the client's cancellation in the coach's zone, replying to the client", async () => {
    // arrange
    const checkInId = await approvedThursdayCheckIn();
    await rig.holdClock(CANCELLED_AT);

    // act
    await checkIns.cancel(ANA_SESSION, checkInId);

    // assert
    const [sent, ...others] = await emailsFor(checkInId, "0:cancelled");
    expect(others).toEqual([]);
    expect(sent?.to).toBe(COACH_EMAIL);
    expect(sent?.replyTo).toBe(ANA.email);
    expect(sent?.subject).toBe("Ana Popescu cancelled the check-in");
    expect(sent?.text).toContain("WHO: Ana Popescu");
    expect(sent?.text).toContain("WHEN: Thursday, 22 October 2026 at 5:00 PM");
    expect(sent?.text).toContain("Europe/Bucharest");
    expect(sent?.text).toContain("That hour is free again.");
    expect(sent?.attachments).toEqual([]);
  });

  it("cancels the approved check-in on the coach's word and emails the client in her zone", async () => {
    // arrange
    const checkInId = await approvedThursdayCheckIn();
    await rig.holdClock(CANCELLED_AT);

    // act
    const response = await checkIns.cancel(COACH_SESSION, checkInId);

    // assert
    expect(response.status).toBe(200);
    expect((await checkIns.movedRowOf(checkInId)).status).toBe("cancelled");
    expect(await checkIns.heldCheckInHours()).toEqual([]);
    const [sent, ...others] = await emailsFor(checkInId, "0:cancelled");
    expect(others).toEqual([]);
    expect(sent?.to).toBe(ANA.email);
    expect(sent?.subject).toBe("Eli cancelled the check-in");
    expect(sent?.text).toContain("WHEN: Thursday, 22 October 2026 at 3:00 PM");
    expect(sent?.text).toContain("Europe/London");
  });

  it("refuses to cancel a check-in still waiting for an answer and keeps its hour", async () => {
    // arrange
    await submittedAna();
    const checkInId = await checkIns.requested(ANA_SESSION, {
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // act
    const response = await checkIns.cancel(COACH_SESSION, checkInId);

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not_pending" });
    expect((await checkIns.movedRowOf(checkInId)).status).toBe("pending");
    expect(await checkIns.heldCheckInHours()).toHaveLength(1);
  });

  it("refuses to cancel a check-in whose time has come", async () => {
    // arrange
    const checkInId = await approvedThursdayCheckIn();
    await rig.holdClock(new Date(THURSDAY_FIRST_HOUR));

    // act
    const response = await checkIns.cancel(ANA_SESSION, checkInId);

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not_pending" });
    expect((await checkIns.movedRowOf(checkInId)).status).toBe("approved");
    expect(await emailsFor(checkInId, "0:cancelled")).toEqual([]);
  });

  it("refuses a second cancellation of the same check-in and emails once", async () => {
    // arrange
    const checkInId = await approvedThursdayCheckIn();
    await rig.holdClock(CANCELLED_AT);
    await checkIns.cancel(ANA_SESSION, checkInId);

    // act
    const response = await checkIns.cancel(COACH_SESSION, checkInId);

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not_pending" });
    expect(await emailsFor(checkInId, "0:cancelled")).toHaveLength(1);
  });

  it("keeps the cancellation when the provider refuses the email", async () => {
    // arrange
    const checkInId = await approvedThursdayCheckIn();
    await rig.holdClock(CANCELLED_AT);
    await suite.wireMock.stub(
      resendRejects(`check-in:${checkInId}:0:cancelled`),
    );

    // act
    const response = await checkIns.cancel(ANA_SESSION, checkInId);

    // assert
    expect(response.status).toBe(200);
    expect((await checkIns.movedRowOf(checkInId)).status).toBe("cancelled");
    expect(await checkIns.heldCheckInHours()).toEqual([]);
  });

  it("answers not found when another client cancels the check-in", async () => {
    // arrange
    const checkInId = await approvedThursdayCheckIn();
    await onboarding.admit(MARIA, MARIA_SESSION, SECOND_PURCHASE);
    await rig.holdClock(CANCELLED_AT);
    await onboarding.submit(MARIA_SESSION);

    // act
    const response = await checkIns.cancel(MARIA_SESSION, checkInId);

    // assert
    expect(response.status).toBe(404);
    expect((await checkIns.movedRowOf(checkInId)).status).toBe("approved");
  });
});

async function submittedAna(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(NOW);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

async function approvedThursdayCheckIn(): Promise<string> {
  await submittedAna();
  const checkInId = await checkIns.requested(ANA_SESSION, {
    startsAt: THURSDAY_FIRST_HOUR,
  });
  await checkIns.approved(checkInId);

  return checkInId;
}

async function emailsFor(checkInId: string, event: string) {
  const emails = await suite.sentEmails();

  return emails.filter((email) =>
    email.idempotencyKey?.includes(`check-in:${checkInId}:${event}`),
  );
}
