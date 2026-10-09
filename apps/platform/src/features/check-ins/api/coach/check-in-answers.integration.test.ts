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
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import { resendRejects } from "~integration-test-config/wire-mock/expectations/resend-emails";

const COACH_EMAIL = "eli@evoa.fit";
const PUBLIC_ORIGIN = "https://localhost:3000";

const suite = new ApiIntegrationTestSuite({
  environment: { ASSESSMENT_CALL_COACH_EMAIL: COACH_EMAIL },
});
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_checkin_answers_ana",
  subjectId: "user_checkin_answers_ana",
};

const REQUESTED_AT = CALL_ENDED_INSTANT;
const ANSWERED_AT = new Date("2026-10-21T09:30:00.000Z");
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";

type Answer = "approve" | "decline";

const ANSWERS: Record<Answer, (checkInId: string) => Promise<Response>> = {
  approve: (checkInId) => checkIns.approve(checkInId),
  decline: (checkInId) => checkIns.decline(checkInId),
};

describe.sequential("check-in answers integration", () => {
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

  it("approves a request, keeps its hour and emails the client her join link", async () => {
    // arrange
    const { clientId, checkInId } = await anaAskedForThursday();
    await rig.holdClock(ANSWERED_AT);

    // act
    const response = await checkIns.approve(checkInId);

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "approved", checkInId });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([
      expect.objectContaining({
        id: checkInId,
        status: "approved",
        answeredAt: ANSWERED_AT,
      }),
    ]);
    expect(
      (await checkIns.heldCheckInHours()).map(
        ({ appointmentId }) => appointmentId,
      ),
    ).toEqual([checkInId]);
    const [approved, ...others] = await emailsFor(checkInId, "approved");
    expect(others).toEqual([]);
    expect(approved?.to).toBe(ANA.email);
    expect(approved?.html).toContain(
      `href="${PUBLIC_ORIGIN}${suite.path(`/client/checkins/${checkInId}/join`)}"`,
    );
  });

  it("declines a request, frees its hour and emails the client her Check-ins page", async () => {
    // arrange
    const { clientId, checkInId } = await anaAskedForThursday();
    await rig.holdClock(ANSWERED_AT);

    // act
    const response = await checkIns.decline(checkInId);

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "declined", checkInId });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([
      expect.objectContaining({
        id: checkInId,
        status: "cancelled",
        answeredAt: ANSWERED_AT,
      }),
    ]);
    expect(await checkIns.heldCheckInHours()).toEqual([]);
    expect(await checkIns.openTimesOf(ANA_SESSION)).toContain(
      THURSDAY_FIRST_HOUR,
    );
    const [declined, ...others] = await emailsFor(checkInId, "declined");
    expect(others).toEqual([]);
    expect(declined?.to).toBe(ANA.email);
    expect(declined?.html).toContain(
      `href="${PUBLIC_ORIGIN}${suite.path("/client/checkins")}"`,
    );
  });

  it.each<{ answer: Answer; status: string }>([
    { answer: "approve", status: "approved" },
    { answer: "decline", status: "cancelled" },
  ])(
    "keeps the answer when the provider refuses the client's email after the coach chose to $answer",
    async ({ answer, status }) => {
      // arrange
      const { clientId, checkInId } = await anaAskedForThursday();
      await suite.wireMock.stub(resendRejects(`check-in:${checkInId}`));

      // act
      const response = await ANSWERS[answer](checkInId);

      // assert
      expect(response.status).toBe(200);
      expect(
        (await checkIns.checkInRowsOf(clientId)).map((row) => row.status),
      ).toEqual([status]);
    },
  );

  it.each<{ first: Answer; then: Answer }>([
    { first: "approve", then: "approve" },
    { first: "approve", then: "decline" },
    { first: "decline", then: "approve" },
    { first: "decline", then: "decline" },
  ])(
    "refuses to $then a request the coach already chose to $first",
    async ({ first, then }) => {
      // arrange
      const { checkInId } = await anaAskedForThursday();
      await ANSWERS[first](checkInId);
      const heldBefore = await checkIns.heldCheckInHours();

      // act
      const response = await ANSWERS[then](checkInId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(await checkIns.heldCheckInHours()).toEqual(heldBefore);
      expect(await emailsFor(checkInId, "approved")).toHaveLength(
        first === "approve" ? 1 : 0,
      );
      expect(await emailsFor(checkInId, "declined")).toHaveLength(
        first === "decline" ? 1 : 0,
      );
    },
  );

  it.each<Answer>(["approve", "decline"])(
    "refuses to %s a request she withdrew",
    async (answer) => {
      // arrange
      const { checkInId } = await anaAskedForThursday();
      await checkIns.withdraw(ANA_SESSION, checkInId);

      // act
      const response = await ANSWERS[answer](checkInId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
    },
  );

  it.each<Answer>(["approve", "decline"])(
    "refuses to %s a request whose time came unanswered, and no email goes out for it",
    async (answer) => {
      // arrange
      const { clientId, checkInId } = await anaAskedForThursday();
      await rig.holdClock(new Date(THURSDAY_FIRST_HOUR));

      // act
      const response = await ANSWERS[answer](checkInId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
      ).toEqual(["pending"]);
      expect(
        (await emailsFor(checkInId)).map(({ idempotencyKey }) =>
          idempotencyKey?.includes(`check-in:${checkInId}:requested`),
        ),
      ).toEqual([true]);
    },
  );

  it.each<Answer>(["approve", "decline"])(
    "answers not found when asked to %s a check-in that does not exist",
    async (answer) => {
      // arrange
      await rig.holdClock(REQUESTED_AT);

      // act
      const response = await ANSWERS[answer](UNKNOWN_ID);

      // assert
      expect(response.status).toBe(404);
    },
  );

  it("leaves one answer when an approval races a decline", async () => {
    // arrange
    const { clientId, checkInId } = await anaAskedForThursday();

    // act
    const responses = await Promise.all([
      checkIns.approve(checkInId),
      checkIns.decline(checkInId),
    ]);

    // assert
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const [row] = await checkIns.checkInRowsOf(clientId);
    const held = await checkIns.heldCheckInHours();
    expect(held).toHaveLength(row?.status === "approved" ? 1 : 0);
    expect(row?.status).toMatch(/^(approved|cancelled)$/);
    expect(
      (await emailsFor(checkInId)).filter(
        ({ idempotencyKey }) => !idempotencyKey?.includes(":requested"),
      ),
    ).toHaveLength(1);
  });

  it("refuses a client who tries to answer her own request", async () => {
    // arrange
    const { clientId, checkInId } = await anaAskedForThursday();

    // act
    const response = await checkIns.approve(checkInId, ANA_SESSION);

    // assert
    expect(response.status).toBe(403);
    expect(
      (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
    ).toEqual(["pending"]);
  });
});

async function anaAskedForThursday(): Promise<{
  clientId: string;
  checkInId: string;
}> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(REQUESTED_AT);
  await onboarding.submit(ANA_SESSION);
  const checkInId = await checkIns.requested(ANA_SESSION, {
    startsAt: THURSDAY_FIRST_HOUR,
  });

  return { clientId: await onboarding.clientIdOf(ANA_SESSION), checkInId };
}

async function emailsFor(checkInId: string, event = "") {
  const emails = await suite.sentEmails();

  return emails.filter((email) =>
    email.idempotencyKey?.includes(`check-in:${checkInId}:${event}`),
  );
}
