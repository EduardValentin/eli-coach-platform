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
  ClientProfileJourney,
  coachAvatarApi,
} from "~integration-test-config/client-profile-journey";
import {
  ANA,
  CoachingSalesJourney,
} from "~integration-test-config/coaching-sales-journey";
import { ClientsJourney } from "~integration-test-config/clients-journey";
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
import {
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import { smallWebp } from "~integration-test-config/sample-images";
import { toUnixSeconds } from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const clients = new ClientsJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const lifecycle = new SubscriptionLifecycleJourney(rig);
const profiles = new ClientProfileJourney(rig);

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

    it("keeps a client whose coaching ended on the list as Inactive", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await lifecycle.deliverEvent({
        id: "evt_clients_page_deleted",
        type: "customer.subscription.deleted",
        object: stripeSubscriptionObject({
          status: "canceled",
          ended_at: toUnixSeconds(rig.now()),
        }),
      });

      // act
      const response = await rig.requestAs(COACH_SESSION, CLIENTS_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("Ana Popescu");
      expect(texts).toContain("Inactive");
      expect(texts).not.toContain("Onboarding");
    });

    it("lists a client whose cancellation is scheduled as Cancelled", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await lifecycle.deliverEvent({
        id: "evt_clients_page_scheduled",
        type: "customer.subscription.updated",
        object: stripeSubscriptionObject({
          cancel_at: toUnixSeconds(new Date("2027-01-21T08:00:00.000Z")),
        }),
        previousAttributes: { cancel_at: null },
      });

      // act
      const response = await rig.requestAs(COACH_SESSION, CLIENTS_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(texts).toContain("Ana Popescu");
      expect(texts).toContain("Cancelled");
      expect(texts).not.toContain("Onboarding");
    });

    it("shows a client's picture beside her name once she has one", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      const clientId = await onboarding.clientIdOf(ADMITTED_CLIENT);
      await profiles.uploadAvatar(COACH_SESSION, coachAvatarApi(clientId), {
        bytes: await smallWebp(),
        fileName: "ana.webp",
        mimeType: "image/webp",
      });

      // act
      const response = await rig.requestAs(COACH_SESSION, CLIENTS_PAGE);

      // assert
      const page = await visibleDocument(response);

      expect(response.status).toBe(200);
      expect(page).toMatch(
        new RegExp(`src="[^"]*/api/client-profile/avatar/${clientId}"`),
      );
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
    it("reads an invited client's identity in her profile widget, the collapsed assessment call, invitation, subscription and the panel line before she has answered", async () => {
      // arrange
      const { callId } = await sales.payForCall();
      const clientId = await clients.clientIdPaidFor(callId);

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
      expect(
        ["profile-age", "profile-gender", "profile-country"].map((parity) =>
          readingOf(page, parity),
        ),
      ).toEqual(["32 (14 Mar 1994)", "Female", "Romania"]);
      expect(page).toMatch(
        /data-parity="profile-phone"[^>]*><a[^>]*href="tel:\+40712345678"/,
      );
      expect(readingOf(page, "profile-height")).toBeUndefined();
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
      expect(texts).toContain("Starts when her program is delivered");
      expect(texts).toContain("She has not sent any measurements yet.");
    });

    it("reads a submitted client's identity and her answers for review, without an invitation once her account exists", async () => {
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
      expect(readingOf(page, "profile-gender")).toBe("Female");
      expect(readingOf(page, "profile-country")).toBe("Romania");
      expect(readingOf(page, "profile-goal")).toBeUndefined();
      expect(texts).toContain("Awaiting review");
      expect(texts).toContain("Review answers");
      expect(texts).toContain("Approve answers");
      expect(texts).not.toContain("Re-send invitation");
      expect(texts).not.toContain("Her answers are not in yet.");
      expect(scheduleActionOf(page)).toBeDefined();
      expect(scheduleActionOf(page)).not.toContain('aria-disabled="true"');
    });

    it("holds Schedule check-in back for a client whose coaching runs but who has not sent her onboarding", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      const clientId = await onboarding.clientIdOf(ADMITTED_CLIENT);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}`,
      );

      // assert
      const page = await visibleDocument(response);

      expect(response.status).toBe(200);
      expect(textNodesOf(page)).toContain("Schedule check-in");
      expect(scheduleActionOf(page)).toContain('aria-disabled="true"');
    });

    it("keeps a submitted client's answers readable but offers no review step once her coaching has ended", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await onboarding.submit(ADMITTED_CLIENT);
      const clientId = await onboarding.clientIdOf(ADMITTED_CLIENT);
      await lifecycle.deliverEvent({
        id: "evt_client_page_deleted",
        type: "customer.subscription.deleted",
        object: stripeSubscriptionObject({
          status: "canceled",
          ended_at: toUnixSeconds(rig.now()),
        }),
      });

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}`,
      );

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("Inactive");
      expect(texts).toContain("Ended on");
      expect(texts).toContain("Answers");
      expect(texts).not.toContain("Review answers");
      expect(texts).not.toContain("Approve answers");
      expect(texts).toContain("Resources");
      expect(texts).not.toContain("Schedule check-in");
    });

    it("offers no invitation re-send for an invited client whose coaching has ended", async () => {
      // arrange
      const { callId } = await sales.payForCall();
      const clientId = await clients.clientIdPaidFor(callId);
      await lifecycle.deliverEvent({
        id: "evt_client_page_invited_deleted",
        type: "customer.subscription.deleted",
        object: stripeSubscriptionObject({
          status: "canceled",
          ended_at: toUnixSeconds(rig.now()),
        }),
      });

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}`,
      );

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("Invitation");
      expect(texts).toContain("Inactive");
      expect(texts).not.toContain("Re-send invitation");
    });

    it("folds an approved client's onboarding under the measurements and links to her profile", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await onboarding.submit(ADMITTED_CLIENT);
      const clientId = await onboarding.clientIdOf(ADMITTED_CLIENT);
      await onboarding.approve(COACH_SESSION, clientId);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}`,
      );

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("View profile");
      expect(page).toMatch(
        new RegExp(`href="[^"]*${CLIENTS_PAGE}/${clientId}/profile"`),
      );
      expect(texts).not.toContain("Review answers");
      expect(texts.indexOf("Measurements")).toBeLessThan(
        texts.indexOf("Onboarding"),
      );
      expect(texts.indexOf("Onboarding")).toBeLessThan(
        texts.indexOf("Assessment call"),
      );
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
      const clientId = await clients.clientIdPaidFor(callId);

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
      const clientId = await clients.clientIdPaidFor(callId);

      // act
      const response = await suite.request(
        new Request(suite.url(`${CLIENTS_PAGE}/${clientId}`)),
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/sign-in");
    });
  });

  describe("a client's profile page", () => {
    it("reads an approved client's identity, coaching facts and preferences", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await onboarding.submit(ADMITTED_CLIENT);
      const clientId = await onboarding.clientIdOf(ADMITTED_CLIENT);
      await onboarding.approve(COACH_SESSION, clientId);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}/profile`,
      );

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);

      expect(response.status).toBe(200);
      expect(texts).toContain("Profile");
      expect(texts).toContain(`${ANA.firstName} ${ANA.lastName}`);
      expect(texts).toContain("About her");
      expect(texts).toContain("Coaching");
      expect(texts).toContain("Preferences");
      expect(texts).toContain("Upload picture");
      expect(readingOf(page, "identity-email")).toBe(ANA.email);
      expect(texts).not.toContain(
        "These fill in once her answers are approved.",
      );
    });

    it("says a submitted client's coaching facts fill in once her answers are approved", async () => {
      // arrange
      await onboarding.admit(ANA, ADMITTED_CLIENT);
      await onboarding.submit(ADMITTED_CLIENT);
      const clientId = await onboarding.clientIdOf(ADMITTED_CLIENT);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${clientId}/profile`,
      );

      // assert
      const texts = textNodesOf(await visibleDocument(response));

      expect(response.status).toBe(200);
      expect(texts).toContain("These fill in once her answers are approved.");
      expect(texts).not.toContain("Preferences");
    });

    it("answers 404 for a client no one paid for", async () => {
      // arrange, act
      const response = await rig.requestAs(
        COACH_SESSION,
        `${CLIENTS_PAGE}/${UNKNOWN_CLIENT_ID}/profile`,
      );

      // assert
      expect(response.status).toBe(404);
    });

    it("keeps a CLIENT out", async () => {
      // arrange
      await rig.provisionClient();

      // act
      const response = await rig.requestAs(
        CLIENT_SESSION,
        `${CLIENTS_PAGE}/${UNKNOWN_CLIENT_ID}/profile`,
      );

      // assert
      expect(response.status).toBe(403);
    });
  });
});

function scheduleActionOf(page: string): string | undefined {
  return /<button(?:(?!<\/button>)[\s\S])*Schedule check-in/.exec(page)?.[0];
}

function readingOf(page: string, parity: string): string | undefined {
  return new RegExp(`data-parity="${parity}"[^>]*>([^<]*)<`).exec(page)?.[1];
}
