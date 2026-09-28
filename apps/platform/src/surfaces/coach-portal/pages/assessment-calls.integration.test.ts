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
  CoachingSalesJourney,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const PAST_CALLS = "/coach/assessment-calls/?when=past";
const ALL_CALLS = "/coach/assessment-calls/";
const BEA: Visitor = {
  email: "bea@example.com",
  firstName: "Bea",
  gender: "female",
  lastName: "Ionescu",
};

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

  it("reads each visitor's pricing from her waitlist allocation", async () => {
    // arrange
    await journey.joinWaitlist(ANA.email);
    await journey.bookCall(ANA);
    await journey.bookEndedCall(BEA);

    // act
    const response = await rig.requestAs(COACH_SESSION, ALL_CALLS);

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(pricingOnCardOf(page, "Ana Popescu")).toBe("Reduced (waitlist)");
    expect(pricingOnCardOf(page, "Bea Ionescu")).toBe("Regular");
  });

  it("reads Paid once the payment has been recorded and offers her client page", async () => {
    // arrange
    await journey.payForCall();
    const [client] = await suite.postgres.queryRows<{ id: string }>({
      sql: "select id from app.clients",
      values: [],
    });

    // act
    const response = await rig.requestAs(COACH_SESSION, PAST_CALLS);

    // assert
    const page = await visibleDocument(response);
    const texts = textNodes(page);

    expect(response.status).toBe(200);
    expect(texts).toContain("Paid");
    expect(texts).toContain("View client");
    expect(page).toContain(
      `href="${suite.path(`/coach/clients/${client?.id}`)}"`,
    );
    expect(texts).not.toContain("Payment link sent");
    expect(texts).not.toContain("Send payment link");
    expect(texts).not.toContain("Re-send payment link");
  });
});

function pricingOnCardOf(page: string, fullName: string): string | undefined {
  const card = page
    .split('data-parity-root="AppointmentCard"')
    .find((chunk) => chunk.includes(`>${fullName}<`));
  const texts = textNodes(card ?? "");

  return texts[texts.indexOf("Pricing") + 1];
}

function textNodes(page: string): string[] {
  return [...page.matchAll(/>([^<>]+)</g)].map(([, text = ""]) => text.trim());
}
