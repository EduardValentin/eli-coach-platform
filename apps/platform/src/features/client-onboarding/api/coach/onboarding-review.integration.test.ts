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
  ClientOnboardingJourney,
  completeAnswers,
  REGULAR_LAST_PERIOD_START,
  type OnboardingAnswers,
} from "~integration-test-config/client-onboarding-journey";
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
import {
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import { toUnixSeconds } from "~integration-test-config/wire-mock/expectations/stripe-api";

type DetailRequestRow = {
  id: string;
  questionIds: { formId: string; fieldId: string }[];
  note: string;
  askedAt: Date;
  answeredAt: Date | null;
};

type Question = { formId: string; fieldId: string };

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const lifecycle = new SubscriptionLifecycleJourney(rig);

const REVIEW_OPENINGS_API = "/api/client-onboarding/review-openings";
const DETAIL_REQUESTS_API = "/api/client-onboarding/detail-requests";
const APPROVALS_API = "/api/client-onboarding/approvals";
const DETAIL_ANSWERS_API = "/api/client-onboarding/detail-answers";

const COACH_CLIENTS_PAGE = "/coach/clients";

const DETAILS_EMAIL_SUBJECT = "Eli needs a few more details";

const OPENED_INSTANT = new Date("2026-10-22T09:00:00.000Z");
const ASKED_INSTANT = new Date("2026-10-22T09:30:00.000Z");
const ANSWERED_INSTANT = new Date("2026-10-23T18:00:00.000Z");
const ASKED_AGAIN_INSTANT = new Date("2026-10-24T09:00:00.000Z");
const ANSWERED_AGAIN_INSTANT = new Date("2026-10-24T20:00:00.000Z");
const APPROVED_INSTANT = new Date("2026-10-25T10:00:00.000Z");

const WEIGHT_QUESTION: Question = {
  formId: "goal-availability",
  fieldId: "weight",
};
const CHECK_IN_DAY_QUESTION: Question = {
  formId: "nutrition-lifestyle",
  fieldId: "checkInDay",
};
const WEIGHT_NOTE = "Your weight looks off — could you weigh in again?";
const CHECK_IN_NOTE = "Which day suits you best now?";

const INVITED_CLIENT: AccountSession = {
  sessionId: "sess_review_client",
  subjectId: "user_review_client",
};

describe.sequential("onboarding review integration", () => {
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

  it("opens her review once and leaves a second opening as it was", async () => {
    // arrange
    const clientId = await submittedClient();
    await rig.holdClock(OPENED_INSTANT);

    // act
    const opened = await postAs(COACH_SESSION, REVIEW_OPENINGS_API, {
      clientId,
    });
    await rig.holdClock(ASKED_INSTANT);
    const openedAgain = await postAs(COACH_SESSION, REVIEW_OPENINGS_API, {
      clientId,
    });

    // assert
    expect(opened.status).toBe(200);
    expect(await opened.json()).toEqual({ outcome: "opened" });
    expect(openedAgain.status).toBe(200);
    expect(await openedAgain.json()).toEqual({ outcome: "already-open" });
    expect(await reviewRowOf(clientId)).toEqual({
      openedAt: OPENED_INSTANT,
      approvedAt: null,
    });
    expect(await onboarding.reviewStampsOf(clientId)).toEqual({
      reviewOpenedAt: OPENED_INSTANT,
      detailsRequestedAt: null,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
    });
    await expectStampsToProjectReviewRows(clientId);
  });

  it("stores her detail request, stamps it and emails her once without the note or any id", async () => {
    // arrange
    const clientId = await clientInReview();
    await rig.holdClock(ASKED_INSTANT);

    // act
    const asked = await askForDetails(clientId, {
      questions: [WEIGHT_QUESTION],
      note: WEIGHT_NOTE,
    });

    // assert
    expect(asked.status).toBe(200);
    expect(await asked.json()).toEqual({ outcome: "requested" });
    const [request, ...others] = await requestRowsOf(clientId);
    expect(others).toEqual([]);
    expect(request).toMatchObject({
      questionIds: [WEIGHT_QUESTION],
      note: WEIGHT_NOTE,
      askedAt: ASKED_INSTANT,
      answeredAt: null,
    });
    expect(await onboarding.reviewStampsOf(clientId)).toMatchObject({
      detailsRequestedAt: ASKED_INSTANT,
      detailsAnsweredAt: null,
    });
    await expectStampsToProjectReviewRows(clientId);
    const emails = await detailsEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      idempotencyKey: `onboarding-details:${request?.id}`,
      to: ANA.email,
    });
    for (const body of [emails[0]?.html ?? "", emails[0]?.text ?? ""]) {
      expect(body).toContain("Answer now");
      expect(body).not.toContain("weigh in again");
      expect(body).not.toContain(clientId);
      expect(body).not.toContain(request?.id);
    }
  });

  it("refuses a second request while one is open", async () => {
    // arrange
    const clientId = await clientInReview();
    await rig.holdClock(ASKED_INSTANT);
    await askForDetails(clientId, {
      questions: [WEIGHT_QUESTION],
      note: WEIGHT_NOTE,
    });
    await rig.holdClock(ANSWERED_INSTANT);

    // act
    const refused = await askForDetails(clientId, {
      questions: [CHECK_IN_DAY_QUESTION],
      note: CHECK_IN_NOTE,
    });

    // assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: "not-in-review" });
    expect(await requestRowsOf(clientId)).toHaveLength(1);
    expect(await detailsEmails()).toHaveLength(1);
    await expectStampsToProjectReviewRows(clientId);
  });

  it("two requests raised at once leave one open request", async () => {
    // arrange
    const clientId = await clientInReview();
    await rig.holdClock(ASKED_INSTANT);

    // act
    const responses = await Promise.all([
      askForDetails(clientId, {
        questions: [WEIGHT_QUESTION],
        note: WEIGHT_NOTE,
      }),
      askForDetails(clientId, {
        questions: [CHECK_IN_DAY_QUESTION],
        note: CHECK_IN_NOTE,
      }),
    ]);

    // assert
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const refused = responses.find((response) => response.status === 409);
    expect(await refused?.json()).toEqual({ error: "not-in-review" });
    expect(await requestRowsOf(clientId)).toEqual([
      expect.objectContaining({ answeredAt: null }),
    ]);
    expect(await detailsEmails()).toHaveLength(1);
    await expectStampsToProjectReviewRows(clientId);
  });

  it("refuses a request before the review is opened and one with no note", async () => {
    // arrange
    const clientId = await submittedClient();

    // act
    const beforeOpening = await askForDetails(clientId, {
      questions: [WEIGHT_QUESTION],
      note: WEIGHT_NOTE,
    });
    await postAs(COACH_SESSION, REVIEW_OPENINGS_API, { clientId });
    const withoutNote = await askForDetails(clientId, {
      questions: [WEIGHT_QUESTION],
      note: "   ",
    });

    // assert
    expect(beforeOpening.status).toBe(409);
    expect(withoutNote.status).toBe(422);
    expect(await withoutNote.json()).toEqual({ error: "invalid" });
    expect(await requestRowsOf(clientId)).toEqual([]);
    expect(await detailsEmails()).toEqual([]);
    await expectStampsToProjectReviewRows(clientId);
  });

  it("refuses her answer to a question the coach did not ask", async () => {
    // arrange
    const clientId = await clientAskedAboutWeight();

    // act
    const refused = await answerDetails(INVITED_CLIENT, {
      "goal-availability": { weight: 64.5, height: 170 },
    });

    // assert
    expect(refused.status).toBe(422);
    expect(await refused.json()).toEqual({
      problems: [
        {
          formId: "goal-availability",
          fieldId: "height",
          message: expect.any(String),
        },
      ],
    });
    expect(await submittedAnswersOf(clientId)).toEqual(
      completeAnswers(REGULAR_LAST_PERIOD_START),
    );
    await expectStampsToProjectReviewRows(clientId);
  });

  it("refuses her answers while no request is open", async () => {
    // arrange
    const clientId = await clientInReview();

    // act
    const refused = await answerDetails(INVITED_CLIENT, {
      "goal-availability": { weight: 64.5 },
    });

    // assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: "no-open-request" });
    expect(await submittedAnswersOf(clientId)).toEqual(
      completeAnswers(REGULAR_LAST_PERIOD_START),
    );
    await expectStampsToProjectReviewRows(clientId);
  });

  it("merges only her asked answer into her submission, rebuilds her profile facts from it and returns her to review", async () => {
    // arrange
    const clientId = await clientAskedAboutWeight();
    await rig.holdClock(ANSWERED_INSTANT);

    // act
    const answered = await answerDetails(INVITED_CLIENT, {
      "goal-availability": { weight: 64.5 },
    });

    // assert
    expect(answered.status).toBe(200);
    expect(await answered.json()).toEqual({ redirectTo: "/client" });
    const expected = completeAnswers(REGULAR_LAST_PERIOD_START);
    expected["goal-availability"] = {
      ...expected["goal-availability"],
      weight: 64.5,
    };
    expect(await submittedAnswersOf(clientId)).toEqual(expected);
    expect(await requestRowsOf(clientId)).toEqual([
      expect.objectContaining({ answeredAt: ANSWERED_INSTANT }),
    ]);
    expect(await onboarding.reviewStampsOf(clientId)).toEqual({
      reviewOpenedAt: OPENED_INSTANT,
      detailsRequestedAt: ASKED_INSTANT,
      detailsAnsweredAt: ANSWERED_INSTANT,
      answersApprovedAt: null,
    });
    expect(await onboarding.profileRowOf(clientId)).toEqual(
      expect.objectContaining({
        heightCm: "165.0",
        primaryGoal: "Lose fat",
        dietaryRestrictions: "Lactose, mild",
        createdAt: CALL_ENDED_INSTANT,
        updatedAt: ANSWERED_INSTANT,
      }),
    );
    await expectStampsToProjectReviewRows(clientId);
  });

  it("lands her back in review after a second request and answer", async () => {
    // arrange
    const clientId = await clientAskedAboutWeight();
    await rig.holdClock(ANSWERED_INSTANT);
    await answerDetails(INVITED_CLIENT, {
      "goal-availability": { weight: 64.5 },
    });
    await rig.holdClock(ASKED_AGAIN_INSTANT);

    // act
    const askedAgain = await askForDetails(clientId, {
      questions: [CHECK_IN_DAY_QUESTION],
      note: CHECK_IN_NOTE,
    });
    await rig.holdClock(ANSWERED_AGAIN_INSTANT);
    const answeredAgain = await answerDetails(INVITED_CLIENT, {
      "nutrition-lifestyle": { checkInDay: "Friday" },
    });

    // assert
    expect(askedAgain.status).toBe(200);
    expect(answeredAgain.status).toBe(200);
    expect(await requestRowsOf(clientId)).toEqual([
      expect.objectContaining({ answeredAt: ANSWERED_INSTANT }),
      expect.objectContaining({
        questionIds: [CHECK_IN_DAY_QUESTION],
        answeredAt: ANSWERED_AGAIN_INSTANT,
      }),
    ]);
    expect(await onboarding.reviewStampsOf(clientId)).toEqual({
      reviewOpenedAt: OPENED_INSTANT,
      detailsRequestedAt: ASKED_AGAIN_INSTANT,
      detailsAnsweredAt: ANSWERED_AGAIN_INSTANT,
      answersApprovedAt: null,
    });
    const answers = await submittedAnswersOf(clientId);
    expect(answers["goal-availability"]).toMatchObject({ weight: 64.5 });
    expect(answers["nutrition-lifestyle"]).toMatchObject({
      checkInDay: "Friday",
      checkInChannel: "Email",
    });
    await expectStampsToProjectReviewRows(clientId);
  });

  it("approves her answers for good and refuses every later review step", async () => {
    // arrange
    const clientId = await clientInReview();
    await rig.holdClock(APPROVED_INSTANT);

    // act
    const approved = await postAs(COACH_SESSION, APPROVALS_API, { clientId });
    const laterRequest = await askForDetails(clientId, {
      questions: [WEIGHT_QUESTION],
      note: WEIGHT_NOTE,
    });
    const laterApproval = await postAs(COACH_SESSION, APPROVALS_API, {
      clientId,
    });
    const laterOpening = await postAs(COACH_SESSION, REVIEW_OPENINGS_API, {
      clientId,
    });

    // assert
    expect(approved.status).toBe(200);
    expect(await approved.json()).toEqual({ outcome: "approved" });
    expect(laterRequest.status).toBe(409);
    expect(laterApproval.status).toBe(409);
    expect(await laterApproval.json()).toEqual({ error: "not-reviewable" });
    expect(laterOpening.status).toBe(409);
    expect(await laterOpening.json()).toEqual({ error: "approved" });
    expect(await onboarding.reviewStampsOf(clientId)).toEqual({
      reviewOpenedAt: OPENED_INSTANT,
      detailsRequestedAt: null,
      detailsAnsweredAt: null,
      answersApprovedAt: APPROVED_INSTANT,
    });
    expect(await detailsEmails()).toEqual([]);
    await expectStampsToProjectReviewRows(clientId);
  });

  it("passes her through review when the coach approves before opening it", async () => {
    // arrange
    const clientId = await submittedClient();
    await rig.holdClock(APPROVED_INSTANT);

    // act
    const approved = await postAs(COACH_SESSION, APPROVALS_API, { clientId });

    // assert
    expect(approved.status).toBe(200);
    expect(await reviewRowOf(clientId)).toEqual({
      openedAt: APPROVED_INSTANT,
      approvedAt: APPROVED_INSTANT,
    });
    await expectStampsToProjectReviewRows(clientId);
  });

  it("refuses to open the review of a client whose coaching has ended, writing nothing", async () => {
    // arrange
    const clientId = await submittedClient();
    await endHerCoaching();
    await rig.holdClock(OPENED_INSTANT);

    // act
    const refused = await postAs(COACH_SESSION, REVIEW_OPENINGS_API, {
      clientId,
    });

    // assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({
      error: "subscription-cancelled-or-ended",
    });
    expect(await reviewRowOf(clientId)).toBeUndefined();
    expect(await onboarding.reviewStampsOf(clientId)).toEqual({
      reviewOpenedAt: null,
      detailsRequestedAt: null,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
    });
  });

  it("refuses a detail request for a client whose coaching is cancelled, emailing nothing", async () => {
    // arrange
    const clientId = await clientInReview();
    await cancelHerCoaching();
    await rig.holdClock(ASKED_INSTANT);

    // act
    const refused = await askForDetails(clientId, {
      questions: [WEIGHT_QUESTION],
      note: WEIGHT_NOTE,
    });

    // assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({
      error: "subscription-cancelled-or-ended",
    });
    expect(await requestRowsOf(clientId)).toEqual([]);
    expect(await detailsEmails()).toEqual([]);
    await expectStampsToProjectReviewRows(clientId);
  });

  it("refuses to approve the answers of a client whose coaching has ended, writing nothing", async () => {
    // arrange
    const clientId = await clientInReview();
    await endHerCoaching();
    await rig.holdClock(APPROVED_INSTANT);

    // act
    const refused = await postAs(COACH_SESSION, APPROVALS_API, { clientId });

    // assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({
      error: "subscription-cancelled-or-ended",
    });
    expect(await reviewRowOf(clientId)).toEqual({
      openedAt: OPENED_INSTANT,
      approvedAt: null,
    });
    await expectStampsToProjectReviewRows(clientId);
  });

  it("answers not found to a review step for a client no one knows", async () => {
    // arrange
    await submittedClient();

    // act
    const response = await postAs(COACH_SESSION, REVIEW_OPENINGS_API, {
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
    });

    // assert
    expect(response.status).toBe(404);
  });

  it("refuses every review step to the client herself and to an anonymous visitor", async () => {
    // arrange
    const clientId = await clientInReview();
    const steps = [
      { path: REVIEW_OPENINGS_API, body: { clientId } },
      {
        path: DETAIL_REQUESTS_API,
        body: { clientId, questions: [WEIGHT_QUESTION], note: WEIGHT_NOTE },
      },
      { path: APPROVALS_API, body: { clientId } },
    ];

    // act
    const asClient = await Promise.all(
      steps.map((step) => postAs(INVITED_CLIENT, step.path, step.body)),
    );
    const anonymous = await Promise.all(
      steps.map((step) => postAnonymously(step.path, step.body)),
    );

    // assert
    expect(asClient.map((response) => response.status)).toEqual([
      403, 403, 403,
    ]);
    expect(anonymous.map((response) => response.status)).toEqual([
      401, 401, 401,
    ]);
    expect(await requestRowsOf(clientId)).toEqual([]);
    expect(await onboarding.reviewStampsOf(clientId)).toMatchObject({
      answersApprovedAt: null,
    });
    await expectStampsToProjectReviewRows(clientId);
  });

  it("refuses the coach's answers on a client's behalf", async () => {
    // arrange
    const clientId = await clientAskedAboutWeight();

    // act
    const refused = await answerDetails(COACH_SESSION, {
      "goal-availability": { weight: 64.5 },
    });

    // assert
    expect(refused.status).toBe(403);
    expect(await requestRowsOf(clientId)).toEqual([
      expect.objectContaining({ answeredAt: null }),
    ]);
    await expectStampsToProjectReviewRows(clientId);
  });

  it("lagging stamps are repaired on the coach's read (a lost projection, simulated by clearing the columns)", async () => {
    // arrange
    const clientId = await clientAskedAboutWeight();
    await suite.postgres.executeSql({
      sql: "update app.clients set review_opened_at = null, details_requested_at = null, details_answered_at = null, answers_approved_at = null where id = $1",
      values: [clientId],
    });

    // act
    const page = await rig.requestAs(
      COACH_SESSION,
      `${COACH_CLIENTS_PAGE}/${clientId}`,
    );

    // assert
    expect(page.status).toBe(200);
    expect(await onboarding.reviewStampsOf(clientId)).toEqual({
      reviewOpenedAt: OPENED_INSTANT,
      detailsRequestedAt: ASKED_INSTANT,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
    });
    await expectStampsToProjectReviewRows(clientId);
  });
});

async function submittedClient(): Promise<string> {
  await onboarding.admit(ANA, INVITED_CLIENT);
  await rig.holdClock(CALL_ENDED_INSTANT);
  await onboarding.submit(INVITED_CLIENT);

  return onboarding.clientIdOf(INVITED_CLIENT);
}

async function endHerCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_review_coaching_ended",
    type: "customer.subscription.deleted",
    object: stripeSubscriptionObject({
      status: "canceled",
      ended_at: toUnixSeconds(rig.now()),
    }),
  });

  if (delivered.status !== 200) {
    throw new Error(`Ending her coaching answered ${delivered.status}.`);
  }
}

async function cancelHerCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_review_coaching_cancelled",
    type: "customer.subscription.updated",
    object: stripeSubscriptionObject({
      cancel_at: toUnixSeconds(new Date("2027-01-21T08:00:00.000Z")),
    }),
    previousAttributes: { cancel_at: null },
  });

  if (delivered.status !== 200) {
    throw new Error(`Cancelling her coaching answered ${delivered.status}.`);
  }
}

async function clientInReview(): Promise<string> {
  const clientId = await submittedClient();
  await rig.holdClock(OPENED_INSTANT);
  const opened = await postAs(COACH_SESSION, REVIEW_OPENINGS_API, {
    clientId,
  });

  if (opened.status !== 200) {
    throw new Error(`Opening her review answered ${opened.status}.`);
  }

  await expectStampsToProjectReviewRows(clientId);

  return clientId;
}

async function clientAskedAboutWeight(): Promise<string> {
  const clientId = await clientInReview();
  await rig.holdClock(ASKED_INSTANT);
  const asked = await askForDetails(clientId, {
    questions: [WEIGHT_QUESTION],
    note: WEIGHT_NOTE,
  });

  if (asked.status !== 200) {
    throw new Error(`Asking for details answered ${asked.status}.`);
  }

  await expectStampsToProjectReviewRows(clientId);

  return clientId;
}

async function askForDetails(
  clientId: string,
  request: { questions: Question[]; note: string },
): Promise<Response> {
  return postAs(COACH_SESSION, DETAIL_REQUESTS_API, { clientId, ...request });
}

async function answerDetails(
  session: AccountSession,
  answers: OnboardingAnswers,
): Promise<Response> {
  return postAs(session, DETAIL_ANSWERS_API, { answers });
}

async function postAs(
  session: AccountSession,
  path: string,
  body: unknown,
): Promise<Response> {
  return rig.requestAs(session, path, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function postAnonymously(path: string, body: unknown): Promise<Response> {
  return suite.request(
    new Request(suite.url(path), {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
}

async function reviewRowOf(
  clientId: string,
): Promise<{ openedAt: Date | null; approvedAt: Date | null } | undefined> {
  const [row] = await suite.postgres.queryRows<{
    openedAt: Date | null;
    approvedAt: Date | null;
  }>({
    sql: 'select opened_at as "openedAt", approved_at as "approvedAt" from app.client_onboarding_reviews where client_id = $1',
    values: [clientId],
  });

  return row;
}

async function requestRowsOf(clientId: string): Promise<DetailRequestRow[]> {
  return suite.postgres.queryRows<DetailRequestRow>({
    sql: 'select id, question_ids as "questionIds", note, asked_at as "askedAt", answered_at as "answeredAt" from app.client_onboarding_detail_requests where client_id = $1 order by asked_at',
    values: [clientId],
  });
}

async function expectStampsToProjectReviewRows(clientId: string) {
  const { recorded, derivedFromReviewRows } =
    await onboarding.reviewStampComparisonOf(clientId);

  expect(recorded).toEqual(derivedFromReviewRows);
}

async function submittedAnswersOf(
  clientId: string,
): Promise<OnboardingAnswers> {
  const [row] = await suite.postgres.queryRows<{
    answers: OnboardingAnswers;
  }>({
    sql: "select answers from app.client_onboarding_submissions where client_id = $1",
    values: [clientId],
  });

  if (!row) {
    throw new Error("She has no submission.");
  }

  return row.answers;
}

async function detailsEmails() {
  return (await suite.sentEmails()).filter(
    (email) => email.subject === DETAILS_EMAIL_SUBJECT,
  );
}
