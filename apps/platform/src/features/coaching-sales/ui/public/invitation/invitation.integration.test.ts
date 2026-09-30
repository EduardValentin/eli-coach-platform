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
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";
import {
  CLERK_INVITATION_URL,
  clerkServesUser,
} from "~integration-test-config/wire-mock/expectations/clerk-backend-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const INVITATION_PAGE = "/invitation";
const INVITATION_API = "/api/coaching-sales/invitation";
const CHECKING_INVITATION = "Checking your invitation…";
const SIGNED_IN_HEADING = "You&#x27;re already signed in";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const THIRTY_ONE_DAYS_AFTER_THE_SEND = new Date(
  CALL_ENDED_INSTANT.getTime() + 31 * DAY_IN_MILLISECONDS,
);

const INVITED_CLIENT: AccountSession = {
  sessionId: "sess_invited_1",
  subjectId: "user_invited_1",
};

describe.sequential("invitation landing integration", () => {
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

  it("answers the emailed invitation with the hosted sign-up link only, uncached", async () => {
    // arrange
    await journey.payForCall();
    const token = await journey.latestInvitationToken();

    // act
    const response = await resolveInvitation({ token });

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      state: "valid",
      signUpUrl: CLERK_INVITATION_URL,
    });
  });

  it("still answers the invitation while the site is in waiting-list mode", async () => {
    // arrange
    await journey.payForCall();
    const token = await journey.latestInvitationToken();
    await rig.switchWaitlistModeOn();

    // act
    const response = await resolveInvitation({ token });

    // assert
    expect(await response.json()).toMatchObject({ state: "valid" });
  });

  it("answers an invitation she has already accepted as unavailable", async () => {
    // arrange
    await journey.payForCall();
    const token = await journey.latestInvitationToken();
    await acceptInvitationAs(INVITED_CLIENT);

    // act
    const response = await resolveInvitation({ token });

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "unavailable" });
  });

  it("answers an invitation older than 30 days as unavailable", async () => {
    // arrange
    await journey.payForCall();
    const token = await journey.latestInvitationToken();
    await rig.holdClock(THIRTY_ONE_DAYS_AFTER_THE_SEND);

    // act
    const response = await resolveInvitation({ token });

    // assert
    expect(await response.json()).toEqual({ state: "unavailable" });
  });

  it("answers a token it does not know as unavailable", async () => {
    // arrange
    await journey.payForCall();

    // act
    const response = await resolveInvitation({ token: "unknown-token" });

    // assert
    expect(await response.json()).toEqual({ state: "unavailable" });
  });

  it.each([
    ["an empty token", JSON.stringify({ token: "" })],
    ["a token that is not a string", JSON.stringify({ token: 42 })],
    ["a body that is not JSON", "token=abc"],
  ])("refuses %s with 400", async (_label, body) => {
    // arrange
    const request = invitationRequest(body);

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(400);
  });

  it("serves the page to an anonymous visitor as the check, resolving nothing on the server", async () => {
    // arrange
    const request = new Request(suite.url(INVITATION_PAGE));

    // act
    const response = await suite.request(request);

    // assert
    const document = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(document).toContain(CHECKING_INVITATION);
    expect(document).toContain("<title>Your invitation | Evoa</title>");
    expect(document).toContain('name="robots" content="noindex"');
    expect(document).not.toContain("Create your account");
    expect(document).not.toContain("Continue");
  });

  it("serves the page in waiting-list mode too", async () => {
    // arrange
    await rig.switchWaitlistModeOn();

    // act
    const response = await suite.request(
      new Request(suite.url(INVITATION_PAGE)),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).toContain(CHECKING_INVITATION);
  });

  it("asks a signed-in visitor to sign out first instead of checking the invitation", async () => {
    // arrange
    const target = INVITATION_PAGE;

    // act
    const response = await rig.requestAs(COACH_SESSION, target);

    // assert
    const document = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(document).toContain(SIGNED_IN_HEADING);
    expect(document).toContain("Sign out");
    expect(document).not.toContain(CHECKING_INVITATION);
  });
});

async function resolveInvitation(body: { token: string }): Promise<Response> {
  return suite.request(invitationRequest(JSON.stringify(body)));
}

function invitationRequest(body: string): Request {
  return new Request(suite.url(INVITATION_API), {
    body,
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function acceptInvitationAs(session: AccountSession): Promise<void> {
  const [invitation] = await suite.postgres.queryRows<{ id: string }>({
    sql: "select id from app.client_invitations",
    values: [],
  });
  await suite.wireMock.stub(
    clerkServesUser(session.subjectId, { invitationId: invitation?.id }),
  );
  const response = await rig.requestAs(session, "/api/account");

  if (response.status !== 200) {
    throw new Error(`Accepting the invitation answered ${response.status}.`);
  }
}
