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
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
  FIRST_CHECKOUT_REQUEST,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  ClientOnboardingJourney,
  completeAnswers,
  givenConsents,
  REGULAR_LAST_PERIOD_START,
  type OnboardingAnswers,
  type OnboardingConsentInstants,
} from "~integration-test-config/client-onboarding-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";
import { STRIPE_CHECKOUT_SESSION_ID } from "~integration-test-config/wire-mock/expectations/stripe-api";
import { MANUAL_SCREENING_MESSAGE } from "~/features/client-onboarding/contracts/onboarding-copy";

type DraftRequestBody = {
  formId: string;
  answers: OnboardingAnswers;
  currentFormIndex: number;
  consents: OnboardingConsentInstants;
};

type SubmissionRequestBody = {
  answers: OnboardingAnswers;
  consents: OnboardingConsentInstants;
};

type UnitPreferenceRequestBody = {
  weightUnit: string;
  heightUnit: string;
};

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, journey);

const CLIENT_PORTAL = "/client";
const WELCOME = "/client/welcome";
const ONBOARDING = "/client/onboarding";
const PUBLIC_HOME = "/";
const DRAFT_API = "/api/client-onboarding/draft";
const SUBMISSION_API = "/api/client-onboarding/submission";
const UNIT_PREFERENCE_API = "/api/client-onboarding/unit-preference";

const RESUME_NOTE = "Picking up where you left off.";
const IMMEDIATE_START_LINE =
  "Eli has your answers and will start on them soon.";
const WAITING_START_LINE =
  "Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on 4 November. Your program will be delivered as soon as it is completed.";

const FORM_IDS = [
  "goal-availability",
  "safety-screening",
  "cycle-context",
  "nutrition-lifestyle",
  "measurements",
] as const;

const SAFETY_SCREENING_FORM_INDEX = 1;

const OUTSIDE_SCREENING_RANGE_INSTANT = new Date("2064-06-01T09:00:00.000Z");
const FUTURE_CLIENT_LAST_PERIOD_START = "2064-05-15";

const INVITED_CLIENT: AccountSession = {
  sessionId: "sess_onboarding_client",
  subjectId: "user_onboarding_client",
};

const SECOND_SESSION: AccountSession = {
  sessionId: "sess_onboarding_client_second_device",
  subjectId: INVITED_CLIENT.subjectId,
};

const RADU: Visitor = {
  email: "radu.onboarding@example.com",
  firstName: "Radu",
  gender: "male",
  lastName: "Ionescu",
};

describe.sequential("client onboarding integration", () => {
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

  it("opens Ana on the first step of her five-part form", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const response = await rig.requestAs(INVITED_CLIENT, ONBOARDING);

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).toContain("Step 1 of 5");
  });

  it("opens Radu on the first step of his four-part form", async () => {
    // arrange
    await admitInvitedClient(RADU);

    // act
    const response = await rig.requestAs(INVITED_CLIENT, ONBOARDING);

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).toContain("Step 1 of 4");
  });

  it("shows her saved answers when she signs back in on another device", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const saved = await putDraft(INVITED_CLIENT, {
      formId: "goal-availability",
      answers: { ...blankAnswers(), "goal-availability": { weight: 70 } },
      currentFormIndex: 0,
      consents: noConsents(),
    });
    const resumedPage = await rig.requestAs(SECOND_SESSION, ONBOARDING);

    // assert
    expect(saved.status).toBe(204);
    expect(resumedPage.status).toBe(200);
    const page = await visibleDocument(resumedPage);
    expect(page).toContain(RESUME_NOTE);
    expect(page).toContain('value="70"');
  });

  it("remembers the units she chose and renders them back to her", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const saved = await putUnitPreference(INVITED_CLIENT, {
      weightUnit: "lb",
      heightUnit: "ft-in",
    });
    const response = await rig.requestAs(INVITED_CLIENT, ONBOARDING);

    // assert
    expect(saved.status).toBe(204);
    const client = await clientRowOf(INVITED_CLIENT);
    expect(await unitPreferenceRowOf(client.id)).toEqual({
      weightUnit: "lb",
      heightUnit: "ft-in",
    });
    expect(response.status).toBe(200);
    const page = await visibleDocument(response);
    expect(selectedMeasurementSystemIn(page)).toBe("lb · in");
    expect(page).toContain("(lb)");
    expect(page).toContain("(in)");
    expect(page).not.toContain("(kg)");
    expect(page).not.toContain("(cm)");
  });

  it("records her complete submission with her profile facts and closes the door behind her", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await putDraft(INVITED_CLIENT, {
      formId: "goal-availability",
      answers: blankAnswers(),
      currentFormIndex: 0,
      consents: noConsents(),
    });

    // act
    const submitted = await postSubmission(INVITED_CLIENT, {
      answers: completeAnswers(REGULAR_LAST_PERIOD_START),
      consents: givenConsents(),
    });
    const welcomeAfterSubmission = await rig.requestAs(INVITED_CLIENT, WELCOME);
    const onboardingAfterSubmission = await rig.requestAs(
      INVITED_CLIENT,
      ONBOARDING,
    );

    // assert
    expect(submitted.status).toBe(200);
    expect(await submitted.json()).toEqual({ redirectTo: CLIENT_PORTAL });
    const client = await clientRowOf(INVITED_CLIENT);
    const [submission] = await submissionRowsOf(client.id);
    expect(submission?.answers).toEqual(
      completeAnswers(REGULAR_LAST_PERIOD_START),
    );
    expect(submission?.submittedAt).toEqual(CALL_ENDED_INSTANT);
    expect(await measurementRowsOf(client.id)).toEqual([
      expect.objectContaining({ weightKg: "66.10", waistCm: "74.0" }),
    ]);
    expect(await draftRowCountOf(client.id)).toBe(0);
    expect(await onboarding.profileRowOf(client.id)).toEqual({
      heightCm: "165.0",
      activityLevel: "Mostly sitting",
      primaryGoal: "Lose fat",
      dietaryRestrictions: "Lactose, mild",
      clientNotes: null,
      createdAt: CALL_ENDED_INSTANT,
      updatedAt: CALL_ENDED_INSTANT,
    });
    expect(client.onboardingSubmittedAt).toEqual(CALL_ENDED_INSTANT);
    expect(welcomeAfterSubmission.status).toBe(302);
    expect(welcomeAfterSubmission.headers.get("location")).toBe(
      suite.path(CLIENT_PORTAL),
    );
    expect(onboardingAfterSubmission.status).toBe(302);
    expect(onboardingAfterSubmission.headers.get("location")).toBe(
      suite.path(CLIENT_PORTAL),
    );
  });

  it("refuses a second submission", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await postSubmission(INVITED_CLIENT, {
      answers: completeAnswers(REGULAR_LAST_PERIOD_START),
      consents: givenConsents(),
    });

    // act
    const secondSubmission = await postSubmission(INVITED_CLIENT, {
      answers: completeAnswers(REGULAR_LAST_PERIOD_START),
      consents: givenConsents(),
    });

    // assert
    expect(secondSubmission.status).toBe(409);
    expect(await secondSubmission.json()).toEqual({
      error: "already-submitted",
    });
  });

  it("refuses to save a draft once she has submitted", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await postSubmission(INVITED_CLIENT, {
      answers: completeAnswers(REGULAR_LAST_PERIOD_START),
      consents: givenConsents(),
    });

    // act
    const refused = await putDraft(INVITED_CLIENT, {
      formId: "goal-availability",
      answers: blankAnswers(),
      currentFormIndex: 0,
      consents: noConsents(),
    });

    // assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: "already-submitted" });
    const client = await clientRowOf(INVITED_CLIENT);
    expect(await draftRowCountOf(client.id)).toBe(0);
  });

  it("names the field she left blank", async () => {
    // arrange
    await admitInvitedClient(ANA);
    const incompleteAnswers = completeAnswers(REGULAR_LAST_PERIOD_START);
    delete incompleteAnswers["goal-availability"].primaryGoal;

    // act
    const refused = await postSubmission(INVITED_CLIENT, {
      answers: incompleteAnswers,
      consents: givenConsents(),
    });

    // assert
    expect(refused.status).toBe(422);
    expect(await refused.json()).toEqual({
      problems: expect.arrayContaining([
        {
          formId: "goal-availability",
          fieldId: "primaryGoal",
          message: "Choose one option.",
        },
      ]),
    });
    const client = await clientRowOf(INVITED_CLIENT);
    expect(await submissionRowCountOf(client.id)).toBe(0);
    expect(await onboarding.profileRowOf(client.id)).toBeUndefined();
  });

  it("shows the client portal on the public home once she has submitted", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await postSubmission(INVITED_CLIENT, {
      answers: completeAnswers(REGULAR_LAST_PERIOD_START),
      consents: givenConsents(),
    });

    // act
    const response = await rig.requestAs(INVITED_CLIENT, PUBLIC_HOME);

    // assert
    expect(response.status).toBe(200);
    expect(portalLinksIn(await visibleDocument(response))).toContainEqual({
      href: suite.path(CLIENT_PORTAL),
      label: "Client Portal",
    });
  });

  it("screens her by hand once she is outside the safety questionnaire's age range", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await rig.holdClock(OUTSIDE_SCREENING_RANGE_INSTANT);
    await putDraft(INVITED_CLIENT, {
      formId: "safety-screening",
      answers: blankAnswers(),
      currentFormIndex: SAFETY_SCREENING_FORM_INDEX,
      consents: noConsents(),
    });

    // act
    const onboardingPage = await rig.requestAs(INVITED_CLIENT, ONBOARDING);
    const answersWithoutSafety = {
      ...completeAnswers(FUTURE_CLIENT_LAST_PERIOD_START),
      "safety-screening": {},
    };
    const submitted = await postSubmission(INVITED_CLIENT, {
      answers: answersWithoutSafety,
      consents: givenConsents(),
    });

    // assert
    expect(onboardingPage.status).toBe(200);
    const page = await visibleDocument(onboardingPage);
    expect(page).toContain(escapedApostrophes(MANUAL_SCREENING_MESSAGE));
    expect(page).not.toContain("heart condition OR high blood pressure");
    expect(submitted.status).toBe(200);
    const client = await clientRowOf(INVITED_CLIENT);
    const [submission] = await submissionRowsOf(client.id);
    expect(submission?.answers["safety-screening"]).toEqual({});
  });

  it("shows the immediate start line once her program is sent", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await postSubmission(INVITED_CLIENT, {
      answers: completeAnswers(REGULAR_LAST_PERIOD_START),
      consents: givenConsents(),
    });

    // act
    const response = await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(200);
    const page = await visibleDocument(response);
    expect(page).toContain("Your onboarding");
    expect(page).toContain("Sent to your coach");
    expect(page).toContain(IMMEDIATE_START_LINE);
  });

  it("names the day her withdrawal window ends for the waiting start choice", async () => {
    // arrange
    await admitInvitedClientAfterWaitingPurchase(ANA);
    await postSubmission(INVITED_CLIENT, {
      answers: completeAnswers(REGULAR_LAST_PERIOD_START),
      consents: givenConsents(),
    });

    // act
    const response = await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).toContain(WAITING_START_LINE);
  });
});

async function admitInvitedClient(visitor: Visitor): Promise<void> {
  await onboarding.admit(visitor, INVITED_CLIENT);
}

async function admitInvitedClientAfterWaitingPurchase(
  visitor: Visitor,
): Promise<void> {
  const sentLink = await journey.sendPaymentLinkAfterEndedCall(visitor);
  await journey.startCheckout({
    bundleId: "3-months",
    startChoice: "waiting",
    token: sentLink.token,
  });
  const response = await journey.deliverCheckoutCompleted(
    await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    }),
    "evt_onboarding_waiting_paid",
  );

  if (response.status !== 200) {
    throw new Error(`The completed checkout answered ${response.status}.`);
  }

  await onboarding.bindInvitedClient(INVITED_CLIENT);
}

async function putDraft(
  session: AccountSession,
  body: DraftRequestBody,
): Promise<Response> {
  return rig.requestAs(session, DRAFT_API, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "PUT",
  });
}

async function postSubmission(
  session: AccountSession,
  body: SubmissionRequestBody,
): Promise<Response> {
  return rig.requestAs(session, SUBMISSION_API, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function putUnitPreference(
  session: AccountSession,
  body: UnitPreferenceRequestBody,
): Promise<Response> {
  return rig.requestAs(session, UNIT_PREFERENCE_API, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "PUT",
  });
}

async function clientRowOf(
  session: AccountSession,
): Promise<{ id: string; onboardingSubmittedAt: Date | null }> {
  const [client] = await suite.postgres.queryRows<{
    id: string;
    onboardingSubmittedAt: Date | null;
  }>({
    sql: 'select id, onboarding_submitted_at as "onboardingSubmittedAt" from app.clients where auth_subject_id = $1',
    values: [session.subjectId],
  });

  if (!client) {
    throw new Error("No client row exists for that session.");
  }

  return client;
}

async function draftRowCountOf(clientId: string): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.client_onboarding_drafts",
    values: [clientId],
    whereClause: "client_id = $1",
  });
}

async function submissionRowCountOf(clientId: string): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.client_onboarding_submissions",
    values: [clientId],
    whereClause: "client_id = $1",
  });
}

async function submissionRowsOf(
  clientId: string,
): Promise<{ answers: OnboardingAnswers; submittedAt: Date }[]> {
  return suite.postgres.queryRows({
    sql: 'select answers, submitted_at as "submittedAt" from app.client_onboarding_submissions where client_id = $1',
    values: [clientId],
  });
}

async function measurementRowsOf(
  clientId: string,
): Promise<{ weightKg: string; waistCm: string }[]> {
  return suite.postgres.queryRows({
    sql: 'select weight_kg as "weightKg", waist_cm as "waistCm" from app.client_measurements where client_id = $1',
    values: [clientId],
  });
}

async function unitPreferenceRowOf(
  clientId: string,
): Promise<{ weightUnit: string; heightUnit: string } | undefined> {
  const [row] = await suite.postgres.queryRows<{
    weightUnit: string;
    heightUnit: string;
  }>({
    sql: 'select weight_unit as "weightUnit", height_unit as "heightUnit" from app.client_unit_preferences where client_id = $1',
    values: [clientId],
  });

  return row;
}

function blankAnswers(): OnboardingAnswers {
  return Object.fromEntries(FORM_IDS.map((formId) => [formId, {}]));
}

function noConsents(): OnboardingConsentInstants {
  return {
    specialCategoryAt: null,
    disclaimerAt: null,
    progressPhotosAt: null,
  };
}

function selectedMeasurementSystemIn(page: string): string | null {
  const block = page.slice(page.indexOf("How do you measure?"));
  const match =
    /<button[^>]*data-state="checked"[^>]*>(kg · cm|lb · in)<\/button>/.exec(
      block,
    );

  return match?.[1] ?? null;
}

function portalLinksIn(page: string): { href: string; label: string }[] {
  return [
    ...page.matchAll(/<a\b[^>]*data-parity="portal-link"[^>]*>([^<]*)<\/a>/g),
  ].map(([anchor, label]) => ({
    href: /href="([^"]*)"/.exec(anchor)?.[1] ?? "",
    label,
  }));
}

function escapedApostrophes(text: string): string {
  return text.replaceAll("'", "&#x27;");
}
