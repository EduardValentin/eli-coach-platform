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
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const THIRTY_ONE_DAYS_AFTER_THE_SEND = new Date(
  CALL_ENDED_INSTANT.getTime() + 31 * DAY_IN_MILLISECONDS,
);
const PAGE_HEADING = "Choose Your Bundle";
const VALID_LINK_SUBTITLE =
  "Based on our call, select the commitment timeframe that works best for you.";
const CALL_FIRST_HEADING = "A Call Comes First";
const CANCELLED_NOTICE =
  "No payment was taken. Pick a bundle whenever you&#x27;re ready.";

describe.sequential("select bundle page integration", () => {
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

  it("offers the three coaching bundles at the regular price on a valid link", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await requestBundlePage(token);

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(page).toContain(PAGE_HEADING);
    expect(page).toContain(VALID_LINK_SUBTITLE);
    expect(page).not.toContain(CALL_FIRST_HEADING);
    expect(page).toContain("1 Month monthly price €159");
    expect(page).toContain("3 Months monthly price €149");
    expect(page).toContain("6 Months monthly price €139");
  });

  it("offers the reduced prices when the call's email holds a reduced waitlist allocation", async () => {
    // arrange
    await journey.joinWaitlist(ANA.email);
    const { token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await requestBundlePage(token);

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(page).toContain("3 Months monthly price €125");
    expect(page).toContain("Original 3 months monthly price €149");
  });

  it("tells her no payment was taken when she returns from a cancelled checkout", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await requestBundlePageAfterCancelledCheckout(token);

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(page).toContain(CANCELLED_NOTICE);
  });

  it("asks for a call first on a token it does not know", async () => {
    // arrange
    await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await requestBundlePage("not-a-payment-link-token");

    // assert
    await expectCallFirst(response);
  });

  it("asks for a call first on a link a re-send replaced", async () => {
    // arrange
    const { callId, token: replacedToken } =
      await journey.sendPaymentLinkAfterEndedCall();
    await journey.sendPaymentLink(callId);

    // act
    const response = await requestBundlePage(replacedToken);

    // assert
    await expectCallFirst(response);
  });

  it("asks for a call first once the link is older than 30 days", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();
    await rig.holdClock(THIRTY_ONE_DAYS_AFTER_THE_SEND);

    // act
    const response = await requestBundlePage(token);

    // assert
    await expectCallFirst(response);
  });

  it("asks for a call first on a link a payment has spent", async () => {
    // arrange
    const { token } = await journey.payForCall();

    // act
    const response = await requestBundlePage(token);

    // assert
    await expectCallFirst(response);
  });

  it("answers 404 in waiting-list mode", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();
    await rig.switchWaitlistModeOn();

    // act
    const response = await requestBundlePage(token);

    // assert
    expect(response.status).toBe(404);
  });
});

async function requestBundlePage(token: string): Promise<Response> {
  return suite.request(new Request(suite.url(`/select-bundle?token=${token}`)));
}

async function requestBundlePageAfterCancelledCheckout(
  token: string,
): Promise<Response> {
  return suite.request(
    new Request(
      suite.url(
        `/select-bundle?token=${token}&payment=cancelled&bundle=3-months&start=immediate`,
      ),
    ),
  );
}

async function expectCallFirst(response: Response): Promise<void> {
  const page = await visibleDocument(response);

  expect(response.status).toBe(200);
  expect(page).toContain(PAGE_HEADING);
  expect(page).toContain(CALL_FIRST_HEADING);
  expect(page).not.toContain(VALID_LINK_SUBTITLE);
}
