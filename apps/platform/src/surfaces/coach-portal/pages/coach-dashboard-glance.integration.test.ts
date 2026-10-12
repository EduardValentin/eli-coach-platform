import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { coachCheckInPath } from "~/features/check-ins/public/paths";
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
import {
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite({
  environment: { ASSESSMENT_CALL_COACH_EMAIL: "eli@evoa.fit" },
});
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_coach_dashboard_glance_ana",
  subjectId: "user_coach_dashboard_glance_ana",
};

const DASHBOARD = "/coach/";
const PENDING_CARD_ROOT = 'data-parity-root="PendingCheckIns"';
const REQUESTED_AT = CALL_ENDED_INSTANT;
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const FRIDAY_FIRST_HOUR = "2026-10-23T14:00:00.000Z";

describe.sequential("coach dashboard at a glance integration", () => {
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

  it("counts a client's request in the greeting and lists it with her name and a Review link", async () => {
    // arrange
    const checkInId = await anaAskedForThursday();

    // act
    const response = await rig.requestAs(COACH_SESSION, DASHBOARD);

    // assert
    const page = await visibleDocument(response);
    const card = pendingCardIn(page);

    expect(response.status).toBe(200);
    expect(page).toContain("1 check-in to review.");
    expect(textNodesOf(card)).toContain("Ana Popescu");
    expect(textNodesOf(card)).toContain("Review");
    expect(card).toContain(`href="${suite.path(coachCheckInPath(checkInId))}"`);
  });

  it("drops a request the coach declined", async () => {
    // arrange
    const checkInId = await anaAskedForThursday();
    await checkIns.decline(checkInId);

    // act
    const response = await rig.requestAs(COACH_SESSION, DASHBOARD);

    // assert
    await expectNothingToReview(response);
  });

  it("drops a request whose start passed unanswered", async () => {
    // arrange
    await anaAskedForThursday();
    await rig.holdClock(new Date(THURSDAY_FIRST_HOUR));

    // act
    const response = await rig.requestAs(COACH_SESSION, DASHBOARD);

    // assert
    await expectNothingToReview(response);
  });

  it("never lists the coach's own request", async () => {
    // arrange
    const clientId = await anaSubmitted();
    await checkIns.scheduled({ clientId, startsAt: THURSDAY_FIRST_HOUR });

    // act
    const response = await rig.requestAs(COACH_SESSION, DASHBOARD);

    // assert
    await expectNothingToReview(response);
  });

  it("never lists a request waiting for the client's answer to the coach's new time", async () => {
    // arrange
    const checkInId = await anaAskedForThursday();
    await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
      startsAt: FRIDAY_FIRST_HOUR,
    });

    // act
    const response = await rig.requestAs(COACH_SESSION, DASHBOARD);

    // assert
    await expectNothingToReview(response);
  });
});

async function anaSubmitted(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(REQUESTED_AT);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

async function anaAskedForThursday(): Promise<string> {
  await anaSubmitted();

  return checkIns.requested(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR });
}

async function expectNothingToReview(response: Response): Promise<void> {
  const page = await visibleDocument(response);
  const card = pendingCardIn(page);

  expect(response.status).toBe(200);
  expect(page).toContain("0 check-ins to review.");
  expect(textNodesOf(card)).toContain("No pending check-ins.");
  expect(textNodesOf(card)).not.toContain("Ana Popescu");
  expect(card).not.toContain(suite.path(coachCheckInPath("")));
}

function pendingCardIn(page: string): string {
  const start = page.indexOf(PENDING_CARD_ROOT);

  if (start === -1) {
    throw new Error("The dashboard carries no Pending Check-ins card.");
  }

  return page.slice(start);
}
