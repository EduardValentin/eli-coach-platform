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
import { ClientOnboardingJourney } from "~integration-test-config/client-onboarding-journey";
import {
  ANA,
  CoachingSalesJourney,
} from "~integration-test-config/coaching-sales-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);

const CLIENTS_PAGE = "/coach/clients";
const UNKNOWN_CLIENT_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";

const ADMITTED_CLIENT: AccountSession = {
  sessionId: "sess_clients_page_client",
  subjectId: "user_clients_page_client",
};

describe.sequential("coach clients pages integration", () => {
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

  describe("the clients list", () => {
    it("lists a paid client as Invited with her bundle and join date", async () => {
      // arrange
      await sales.payForCall();

      // act
      const response = await rig.requestAs(COACH_SESSION, CLIENTS_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("Clients");
      expect(texts).toContain("Ana Popescu");
      expect(texts).toContain(ANA.email);
      expect(texts).toContain("Invited");
      expect(texts).toContain("3 months");
    });

    it("lists a client who has sent her onboarding as Awaiting review", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await onboarding.submit(ADMITTED_CLIENT);

      // act
      const response = await rig.requestAs(COACH_SESSION, CLIENTS_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("Ana Popescu");
      expect(texts).toContain("Awaiting review");
      expect(texts).not.toContain("Invited");
    });

    it("says no one has paid yet while the roster is empty", async () => {
      // arrange, act
      const response = await rig.requestAs(COACH_SESSION, CLIENTS_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("No clients yet");
      expect(texts).toContain(
        "Clients appear here once they pay for a bundle.",
      );
    });

    it("keeps a CLIENT out", async () => {
      // arrange
      await rig.provisionClient();

      // act
      const response = await rig.requestAs(CLIENT_SESSION, CLIENTS_PAGE);

      // assert
      expect(response.status).toBe(403);
    });

    it("sends an anonymous visitor to sign in", async () => {
      // arrange, act
      const response = await suite.request(
        new Request(suite.url(CLIENTS_PAGE)),
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain(
        encodeURIComponent(suite.path(CLIENTS_PAGE)),
      );
    });

    it("is offered from the coach sidebar", async () => {
      // arrange, act
      const dashboard = await visibleDocument(
        await rig.requestAs(COACH_SESSION, "/coach"),
      );

      // assert
      expect(dashboard).toContain(`href="${suite.path(CLIENTS_PAGE)}"`);
    });
  });

  describe("a client's page", () => {
    it("reads an invited client's empty profile, the collapsed assessment call, invitation, subscription and the panel line before she has answered", async () => {
      // arrange
      const { callId } = await sales.payForCall();
      const clientId = await sales.clientIdPaidFor(callId);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}`,
      );

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(page).toContain("<title>Ana Popescu | Evoa</title>");
      expect(texts).toContain("Ana Popescu");
      expect(texts).toContain("Back to Clients");
      expect(texts).toContain(
        "Her profile fills in once she sends her onboarding.",
      );
      expect(
        [
          "profile-age",
          "profile-gender",
          "profile-country",
          "profile-phone",
          "profile-height",
          "profile-starting-weight",
          "profile-current-weight",
          "profile-activity",
          "profile-goal",
          "profile-restrictions",
          "profile-notes",
        ].map((parity) => readingOf(page, parity)),
      ).toEqual(Array.from({ length: 11 }, () => "—"));
      expect(texts).toContain("Assessment call");
      expect(page).toMatch(
        /<button[^>]*aria-expanded="false"[^>]*>(?:(?!<\/button>)[\s\S])*Assessment call/,
      );
      expect(readingOf(page, "call-date")).toBeUndefined();
      expect(readingOf(page, "subscription-reduced-price")).toBe("No");
      expect(texts).toContain("Invited 21 October · expires 20 November");
      expect(texts).toContain("Re-send invitation");
      expect(texts).toContain("Invited");
      expect(texts).toContain("Her answers are not in yet.");
      expect(texts).toContain("3 months");
      expect(texts).toContain("21 October");
      expect(texts).toContain("Immediate start");
      expect(texts).toContain("Once her program starts");
      expect(texts).toContain("She has not sent any measurements yet.");
    });

    it("reads a submitted client's profile and her answers for review, without an invitation once her account exists", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await onboarding.submit(ADMITTED_CLIENT);
      const clientId = await onboarding.clientIdOf(ADMITTED_CLIENT);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}`,
      );

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).not.toContain(
        "Her profile fills in once she sends her onboarding.",
      );
      expect(readingOf(page, "profile-gender")).toBe("Female");
      expect(readingOf(page, "profile-country")).toBe("Romania");
      expect(readingOf(page, "profile-height")).toBe("165 cm");
      expect(readingOf(page, "profile-starting-weight")).toBe("66.1 kg");
      expect(readingOf(page, "profile-current-weight")).toBe("66.1 kg");
      expect(readingOf(page, "profile-activity")).toBe("Mostly sitting");
      expect(readingOf(page, "profile-goal")).toBe("Lose fat");
      expect(readingOf(page, "profile-restrictions")).toBe("Lactose, mild");
      expect(readingOf(page, "profile-notes")).toBe("—");
      expect(texts).toContain("Awaiting review");
      expect(texts).toContain("Review answers");
      expect(texts).toContain("Approve answers");
      expect(texts).not.toContain("Re-send invitation");
      expect(texts).not.toContain("Her answers are not in yet.");
    });

    it("answers 404 for a client no one paid for and for an id that is not one", async () => {
      // arrange
      await sales.payForCall();

      // act
      const unknown = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${UNKNOWN_CLIENT_ID}`,
      );
      const malformed = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/client-1`,
      );

      // assert
      expect(unknown.status).toBe(404);
      expect(textNodesOf(await visibleDocument(unknown))).toContain(
        "Client not found",
      );
      expect(malformed.status).toBe(404);
    });

    it("keeps a CLIENT out", async () => {
      // arrange
      await rig.provisionClient();
      const { callId } = await sales.payForCall();
      const clientId = await sales.clientIdPaidFor(callId);

      // act
      const response = await rig.requestAs(
        CLIENT_SESSION,
        `${CLIENTS_PAGE}/${clientId}`,
      );

      // assert
      expect(response.status).toBe(403);
    });

    it("sends an anonymous visitor to sign in", async () => {
      // arrange
      const { callId } = await sales.payForCall();
      const clientId = await sales.clientIdPaidFor(callId);

      // act
      const response = await suite.request(
        new Request(suite.url(`${CLIENTS_PAGE}/${clientId}`)),
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/sign-in");
    });
  });
});

function readingOf(page: string, parity: string): string | undefined {
  return new RegExp(`data-parity="${parity}"[^>]*>([^<]*)<`).exec(page)?.[1];
}
