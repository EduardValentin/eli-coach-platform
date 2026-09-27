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
const BUNDLE_PAGE_API = "/api/coaching-sales/bundle-page";
const PAGE_HEADING = "Choose Your Bundle";
const CHECKING_LINK = "Checking your link…";
const CALL_FIRST_HEADING = "A Call Comes First";
const CANCELLED_NOTICE =
  "No payment was taken. Pick a bundle whenever you&#x27;re ready.";

type BundlePageAnswer = {
  state: string;
  tier?: string;
  cards: {
    id: string;
    pricePerMonth: number;
    originalPricePerMonth?: number;
  }[];
};

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

  it("serves the page shell uncached while the browser checks the link", async () => {
    // arrange
    await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await suite.request(
      new Request(suite.url("/select-bundle")),
    );

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(page).toContain(PAGE_HEADING);
    expect(page).toContain(CHECKING_LINK);
    expect(page).not.toContain(CALL_FIRST_HEADING);
  });

  it("tells her no payment was taken when she returns from a cancelled checkout", async () => {
    // arrange
    await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await suite.request(
      new Request(
        suite.url(
          "/select-bundle?payment=cancelled&bundle=3-months&start=immediate",
        ),
      ),
    );

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(page).toContain(CANCELLED_NOTICE);
  });

  it("answers the page shell with 404 in waiting-list mode", async () => {
    // arrange
    await rig.switchWaitlistModeOn();

    // act
    const response = await suite.request(
      new Request(suite.url("/select-bundle")),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("offers the three coaching bundles at the regular price on a valid link", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await resolveBundlePage(token);

    // assert
    const page = (await response.json()) as BundlePageAnswer;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(page.state).toBe("valid");
    expect(page.tier).toBe("regular");
    expect(monthlyPrices(page)).toEqual([
      ["1-month", 159],
      ["3-months", 149],
      ["6-months", 139],
    ]);
  });

  it("offers the reduced prices when the call's email holds a reduced waitlist allocation", async () => {
    // arrange
    await journey.joinWaitlist(ANA.email);
    const { token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await resolveBundlePage(token);

    // assert
    const page = (await response.json()) as BundlePageAnswer;

    expect(response.status).toBe(200);
    expect(page.tier).toBe("reduced");
    expect(page.cards.find((card) => card.id === "3-months")).toMatchObject({
      originalPricePerMonth: 149,
      pricePerMonth: 125,
    });
  });

  it("asks for a call first on a token it does not know", async () => {
    // arrange
    await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await resolveBundlePage("not-a-payment-link-token");

    // assert
    await expectCallFirst(response);
  });

  it("asks for a call first on a link a re-send replaced", async () => {
    // arrange
    const { callId, token: replacedToken } =
      await journey.sendPaymentLinkAfterEndedCall();
    await journey.sendPaymentLink(callId);

    // act
    const response = await resolveBundlePage(replacedToken);

    // assert
    await expectCallFirst(response);
  });

  it("asks for a call first once the link is older than 30 days", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();
    await rig.holdClock(THIRTY_ONE_DAYS_AFTER_THE_SEND);

    // act
    const response = await resolveBundlePage(token);

    // assert
    await expectCallFirst(response);
  });

  it("asks for a call first on a link a payment has spent", async () => {
    // arrange
    const { token } = await journey.payForCall();

    // act
    const response = await resolveBundlePage(token);

    // assert
    await expectCallFirst(response);
  });

  it("answers 404 in waiting-list mode", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();
    await rig.switchWaitlistModeOn();

    // act
    const response = await resolveBundlePage(token);

    // assert
    expect(response.status).toBe(404);
  });
});

async function resolveBundlePage(token: string): Promise<Response> {
  return suite.request(
    new Request(suite.url(BUNDLE_PAGE_API), {
      body: JSON.stringify({ token }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
}

function monthlyPrices(page: BundlePageAnswer): [string, number][] {
  return page.cards.map((card) => [card.id, card.pricePerMonth]);
}

async function expectCallFirst(response: Response): Promise<void> {
  const page = (await response.json()) as BundlePageAnswer;

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(page.state).toBe("call-first");
  expect(monthlyPrices(page)).toEqual([
    ["1-month", 159],
    ["3-months", 149],
    ["6-months", 139],
  ]);
}
