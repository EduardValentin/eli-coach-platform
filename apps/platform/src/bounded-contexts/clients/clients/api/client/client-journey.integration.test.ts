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
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";
import { clerkServesUser } from "~integration-test-config/wire-mock/expectations/clerk-backend-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const CLIENT_PORTAL = "/client";
const WELCOME = "/client/welcome";
const ONBOARDING = "/client/onboarding";
const PUBLIC_HOME = "/";

const FIVE_PART_INTRO = "Your next step is a short form in five parts";
const FOUR_PART_INTRO = "Your next step is a short form in four parts";

const INVITED_CLIENT: AccountSession = {
  sessionId: "sess_journey_client",
  subjectId: "user_journey_client",
};

const RADU: Visitor = {
  email: "radu@example.com",
  firstName: "Radu",
  gender: "male",
  lastName: "Ionescu",
};

describe.sequential("client journey integration", () => {
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

  it("welcomes the newly admitted client by her first name with the five-part form", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const response = await rig.requestAs(INVITED_CLIENT, WELCOME);

    // assert
    expect(response.status).toBe(200);
    const page = await visibleDocument(response);
    expect(page).toContain("Welcome to Evoa Fitness, Ana");
    expect(page).toContain(FIVE_PART_INTRO);
    expect(page).not.toContain(FOUR_PART_INTRO);
    expect(page).toContain("Let&#x27;s get started");
  });

  it("describes the four-part form to a client who booked as a man", async () => {
    // arrange
    await admitInvitedClient(RADU);

    // act
    const response = await rig.requestAs(INVITED_CLIENT, WELCOME);

    // assert
    expect(response.status).toBe(200);
    const page = await visibleDocument(response);
    expect(page).toContain("Welcome to Evoa Fitness, Radu");
    expect(page).toContain(FOUR_PART_INTRO);
    expect(page).not.toContain(FIVE_PART_INTRO);
  });

  it("records her start once she presses the button and moves her on to onboarding", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const response = await startOnboarding();

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(suite.path(ONBOARDING));
    expect(await welcomeSeenAtOf(INVITED_CLIENT)).toEqual(CALL_ENDED_INSTANT);
  });

  it("lets her open onboarding before her welcome is seen", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const onboarding = await rig.requestAs(INVITED_CLIENT, ONBOARDING);

    // assert
    expect(onboarding.status).toBe(200);
    expect(await visibleDocument(onboarding)).toContain(
      "Let&#x27;s get you set up",
    );
    expect(await welcomeSeenAtOf(INVITED_CLIENT)).toBeNull();
  });

  it("holds her on onboarding once her welcome is seen", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await startOnboarding();

    // act
    const welcome = await rig.requestAs(INVITED_CLIENT, WELCOME);
    const portalHome = await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);
    const onboarding = await rig.requestAs(INVITED_CLIENT, ONBOARDING);

    // assert
    expect(welcome.status).toBe(302);
    expect(welcome.headers.get("location")).toBe(suite.path(ONBOARDING));
    expect(portalHome.status).toBe(302);
    expect(portalHome.headers.get("location")).toBe(suite.path(ONBOARDING));
    expect(onboarding.status).toBe(200);
  });

  it("points her public nav at the step of her onboarding she is on", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const beforeWelcome = await rig.requestAs(INVITED_CLIENT, PUBLIC_HOME);
    await startOnboarding();
    const afterWelcome = await rig.requestAs(INVITED_CLIENT, PUBLIC_HOME);

    // assert
    expect(beforeWelcome.status).toBe(200);
    expect(portalLinksIn(await visibleDocument(beforeWelcome))).toContainEqual({
      href: suite.path(WELCOME),
      label: "Finish your onboarding",
    });
    expect(afterWelcome.status).toBe(200);
    expect(portalLinksIn(await visibleDocument(afterWelcome))).toContainEqual({
      href: suite.path(ONBOARDING),
      label: "Finish your onboarding",
    });
  });

  it("keeps the coach's public nav on the coach portal", async () => {
    // arrange
    await admitInvitedClient(ANA);

    // act
    const response = await rig.requestAs(COACH_SESSION, PUBLIC_HOME);

    // assert
    expect(response.status).toBe(200);
    const page = await visibleDocument(response);
    expect(portalLinksIn(page)).toContainEqual({
      href: suite.path("/coach"),
      label: "Coach Portal",
    });
    expect(page).not.toContain("Finish your onboarding");
  });

  it("leaves a client account with no client record on the portal home, as before", async () => {
    // arrange
    await rig.provisionClient();

    // act
    const portalHome = await rig.requestAs(CLIENT_SESSION, CLIENT_PORTAL);
    const publicHome = await rig.requestAs(CLIENT_SESSION, PUBLIC_HOME);

    // assert
    expect(portalHome.status).toBe(200);
    const portalPage = await visibleDocument(portalHome);
    expect(portalPage).toContain("Welcome back.");
    expect(portalPage).toContain(">Client<");
    expect(portalLinksIn(await visibleDocument(publicHome))).toContainEqual({
      href: suite.path(CLIENT_PORTAL),
      label: "Client Portal",
    });
  });

  it("keeps the welcome screen open while the waiting list is on", async () => {
    // arrange
    await admitInvitedClient(ANA);
    await rig.switchWaitlistModeOn();

    // act
    const response = await rig.requestAs(INVITED_CLIENT, WELCOME);

    // assert
    expect(response.status).toBe(200);
    expect(await visibleDocument(response)).toContain(
      "Welcome to Evoa Fitness, Ana",
    );
  });
});

async function admitInvitedClient(visitor: Visitor): Promise<void> {
  await journey.payForCall(visitor);
  const [invitation] = await suite.postgres.queryRows<{ id: string }>({
    sql: "select id from app.client_invitations",
    values: [],
  });

  if (!invitation) {
    throw new Error("The payment invited no one.");
  }

  await suite.wireMock.stub(
    clerkServesUser(INVITED_CLIENT.subjectId, { invitationId: invitation.id }),
  );
  const firstRequest = await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);

  if (firstRequest.status !== 302) {
    throw new Error(
      `Her first signed-in request answered ${firstRequest.status}.`,
    );
  }
}

async function startOnboarding(): Promise<Response> {
  return rig.requestAs(INVITED_CLIENT, WELCOME, {
    body: new URLSearchParams(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

async function welcomeSeenAtOf(
  session: AccountSession,
): Promise<Date | null | undefined> {
  const [client] = await suite.postgres.queryRows<{
    welcomeSeenAt: Date | null;
  }>({
    sql: 'select welcome_seen_at as "welcomeSeenAt" from app.clients where auth_subject_id = $1',
    values: [session.subjectId],
  });

  return client?.welcomeSeenAt;
}

function portalLinksIn(page: string): { href: string; label: string }[] {
  return [
    ...page.matchAll(/<a\b[^>]*data-parity="portal-link"[^>]*>([^<]*)<\/a>/g),
  ].map(([anchor, label]) => ({
    href: /href="([^"]*)"/.exec(anchor)?.[1] ?? "",
    label,
  }));
}
