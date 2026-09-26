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
import { CoachingSalesJourney } from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const PAST_CALLS = "/coach/assessment-calls/?when=past";

describe.sequential("coach assessment calls page sales integration", () => {
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

  it("offers to send a payment link for a call that was held", async () => {
    // arrange
    await journey.bookEndedCall();

    // act
    const response = await rig.requestAs(COACH_SESSION, PAST_CALLS);

    // assert
    const texts = textNodes(await visibleDocument(response));

    expect(response.status).toBe(200);
    expect(texts).toContain("Call held");
    expect(texts).toContain("Send payment link");
    expect(texts).not.toContain("Payment link sent");
    expect(texts).not.toContain("Paid");
  });

  it("reads Payment link sent once the coach has sent the link", async () => {
    // arrange
    await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await rig.requestAs(COACH_SESSION, PAST_CALLS);

    // assert
    const texts = textNodes(await visibleDocument(response));

    expect(response.status).toBe(200);
    expect(texts).toContain("Payment link sent");
    expect(texts).toContain("Re-send payment link");
    expect(texts).not.toContain("Call held");
    expect(texts).not.toContain("Paid");
  });

  it("reads Paid once the payment has been recorded", async () => {
    // arrange
    await journey.payForCall();

    // act
    const response = await rig.requestAs(COACH_SESSION, PAST_CALLS);

    // assert
    const texts = textNodes(await visibleDocument(response));

    expect(response.status).toBe(200);
    expect(texts).toContain("Paid");
    expect(texts).not.toContain("Payment link sent");
    expect(texts).not.toContain("Send payment link");
    expect(texts).not.toContain("Re-send payment link");
  });
});

function textNodes(page: string): string[] {
  return [...page.matchAll(/>([^<>]+)</g)].map(([, text = ""]) => text.trim());
}
