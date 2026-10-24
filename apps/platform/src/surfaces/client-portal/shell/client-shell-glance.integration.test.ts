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
  ClientProfileJourney,
  OWN_AVATAR_API,
} from "~integration-test-config/client-profile-journey";
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
import { landscapePng } from "~integration-test-config/sample-images";
import {
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import { toUnixSeconds } from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite({
  environment: { ASSESSMENT_CALL_COACH_EMAIL: "eli@evoa.fit" },
});
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);
const profiles = new ClientProfileJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_client_shell_glance_ana",
  subjectId: "user_client_shell_glance_ana",
};

const CLIENT_PORTAL = "/client";
const ENDED_PAGE = "/client/ended";
const NEXT_CHECK_IN_ROOT = 'data-parity-root="NextCheckinCard"';
const REQUESTED_AT = CALL_ENDED_INSTANT;
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const THURSDAY_IN_THE_SHELL = "Thu, Oct 22";
const DURING_THE_CHECK_IN = new Date("2026-10-22T14:20:00.000Z");
const AFTER_THE_CHECK_IN = new Date("2026-10-22T15:00:00.000Z");

describe.sequential("client shell at a glance integration", () => {
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

  it("shows her next check-in with its day once the coach approves it", async () => {
    // arrange
    await anaApprovedForThursday();

    // act
    const response = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(200);
    const widget = nextCheckInWidgetIn(await visibleDocument(response));
    expect(textNodesOf(widget)).toContain("Next check-in");
    expect(textNodesOf(widget)).toContain(THURSDAY_IN_THE_SHELL);
    expect(textNodesOf(widget)).toContain("Join Meet");
    expect(textNodesOf(widget)).toContain("Manage check-ins");
  });

  it("shows no next check-in while her request waits for the coach", async () => {
    // arrange
    await anaAskedForThursday();

    // act
    const response = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).not.toContain(NEXT_CHECK_IN_ROOT);
  });

  it("keeps her check-in in the shell while it runs", async () => {
    // arrange
    await anaApprovedForThursday();
    await rig.holdClock(DURING_THE_CHECK_IN);

    // act
    const response = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

    // assert
    const widget = nextCheckInWidgetIn(await visibleDocument(response));
    expect(textNodesOf(widget)).toContain(THURSDAY_IN_THE_SHELL);
  });

  it("drops her check-in from the shell once it has ended", async () => {
    // arrange
    await anaApprovedForThursday();
    await rig.holdClock(AFTER_THE_CHECK_IN);

    // act
    const response = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).not.toContain(NEXT_CHECK_IN_ROOT);
  });

  it("shows her picture in her name block once she has uploaded one", async () => {
    // arrange
    await onboarding.admit(ANA, ANA_SESSION);
    await onboarding.submit(ANA_SESSION);
    const clientId = await onboarding.clientIdOf(ANA_SESSION);
    await profiles.uploadAvatar(ANA_SESSION, OWN_AVATAR_API, {
      bytes: await landscapePng(),
      fileName: "me.png",
      mimeType: "image/png",
    });
    const avatar = await profiles.avatarRowOf(clientId);

    // act
    const response = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).toMatch(
      new RegExp(
        `<img alt="" class="[^"]*" data-parity="avatar" src="${suite.path(`/api/client-profile/avatar/${clientId}`)}\\?v=${avatar?.avatarId}"`,
      ),
    );
  });

  it("shows a client whose coaching has ended no next check-in", async () => {
    // arrange
    await anaApprovedForThursday();
    await endAnasCoaching();

    // act
    const portal = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);
    const endedPage = await rig.requestAs(ANA_SESSION, ENDED_PAGE);

    // assert
    expect(portal.status).toBe(302);
    expect(portal.headers.get("location")).toBe(suite.path(ENDED_PAGE));
    expect(endedPage.status).toBe(200);
    expect(await visibleDocument(endedPage)).not.toContain(NEXT_CHECK_IN_ROOT);
  });
});

async function anaAskedForThursday(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(REQUESTED_AT);
  await onboarding.submit(ANA_SESSION);

  return checkIns.requested(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR });
}

async function anaApprovedForThursday(): Promise<void> {
  await checkIns.approved(await anaAskedForThursday());
}

async function endAnasCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_client_shell_glance_coaching_ended",
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

function nextCheckInWidgetIn(page: string): string {
  const start = page.indexOf(NEXT_CHECK_IN_ROOT);

  if (start === -1) {
    throw new Error("The shell carries no Next check-in widget.");
  }

  return page.slice(start, page.indexOf("</section>", start));
}
