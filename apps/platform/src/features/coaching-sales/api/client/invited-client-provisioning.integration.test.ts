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
import {
  clerkServesUser,
  clerkSessionRevocationPath,
} from "~integration-test-config/wire-mock/expectations/clerk-backend-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const CLIENT_PORTAL = "/client";
const WELCOME = "/client/welcome";

const INVITED_CLIENT: AccountSession = {
  sessionId: "sess_invited_1",
  subjectId: "user_invited_1",
};

const SECOND_SUBJECT: AccountSession = {
  sessionId: "sess_invited_2",
  subjectId: "user_invited_2",
};

const UNINVITED_SUBJECT: AccountSession = {
  sessionId: "sess_uninvited",
  subjectId: "user_uninvited",
};

type AccountRow = { id: string; role: string };

type InvitationRow = {
  acceptedByAuthSubjectId: string | null;
  clientId: string;
  id: string;
  usedAt: Date | null;
};

describe.sequential("invited client provisioning integration", () => {
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

  it("admits the paid client on her first signed-in request and sends her to the welcome screen: a CLIENT account, her client bound, her invitation used", async () => {
    // arrange
    const invitation = await payAndReadInvitation();
    await suite.wireMock.stub(
      clerkServesUser(INVITED_CLIENT.subjectId, {
        invitationId: invitation.id,
      }),
    );

    // act
    const response = await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(suite.path(WELCOME));
    expect(await accountsOf(INVITED_CLIENT)).toEqual([
      { id: expect.any(String), role: "CLIENT" },
    ]);
    expect(await clientBoundTo(INVITED_CLIENT)).toBe(invitation.clientId);
    expect(await readInvitation()).toEqual({
      ...invitation,
      acceptedByAuthSubjectId: INVITED_CLIENT.subjectId,
      usedAt: CALL_ENDED_INSTANT,
    });
    expect(await revocationsOf(INVITED_CLIENT)).toHaveLength(0);
  });

  it("lets the admitted client back in without asking Clerk about her again", async () => {
    // arrange
    const invitation = await payAndReadInvitation();
    await suite.wireMock.stub(
      clerkServesUser(INVITED_CLIENT.subjectId, {
        invitationId: invitation.id,
      }),
    );
    await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);
    const accountsAfterAdmission = await accountsOf(INVITED_CLIENT);

    // act
    const response = await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(suite.path(WELCOME));
    expect(await accountsOf(INVITED_CLIENT)).toEqual(accountsAfterAdmission);
    expect(await identityLookupsOf(INVITED_CLIENT)).toHaveLength(1);
  });

  it("refuses a second subject presenting the invitation someone already used, revoking its session", async () => {
    // arrange
    const invitation = await payAndReadInvitation();
    await suite.wireMock.stub(
      clerkServesUser(INVITED_CLIENT.subjectId, {
        invitationId: invitation.id,
      }),
    );
    await suite.wireMock.stub(
      clerkServesUser(SECOND_SUBJECT.subjectId, {
        invitationId: invitation.id,
      }),
    );
    await rig.requestAs(INVITED_CLIENT, CLIENT_PORTAL);

    // act
    const response = await rig.requestAs(SECOND_SUBJECT, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      suite.path("/sign-in-failed"),
    );
    expect(await revocationsOf(SECOND_SUBJECT)).toHaveLength(1);
    expect(await accountsOf(SECOND_SUBJECT)).toEqual([]);
    expect(await clientBoundTo(INVITED_CLIENT)).toBe(invitation.clientId);
    expect(await readInvitation()).toMatchObject({
      acceptedByAuthSubjectId: INVITED_CLIENT.subjectId,
    });
  });

  it("refuses a subject whose identity carries no invitation, as before", async () => {
    // arrange
    const invitation = await payAndReadInvitation();
    await suite.wireMock.stub(clerkServesUser(UNINVITED_SUBJECT.subjectId, {}));

    // act
    const response = await rig.requestAs(UNINVITED_SUBJECT, CLIENT_PORTAL);

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      suite.path("/sign-in-failed"),
    );
    expect(await revocationsOf(UNINVITED_SUBJECT)).toHaveLength(1);
    expect(await accountsOf(UNINVITED_SUBJECT)).toEqual([]);
    expect(await readInvitation()).toEqual(invitation);
  });
});

async function payAndReadInvitation(): Promise<InvitationRow> {
  await journey.payForCall();
  const invitation = await readInvitation();

  if (!invitation) {
    throw new Error("The payment invited no one.");
  }

  return invitation;
}

async function readInvitation(): Promise<InvitationRow | undefined> {
  const [invitation] = await suite.postgres.queryRows<InvitationRow>({
    sql: `
      select
        id,
        client_id as "clientId",
        used_at as "usedAt",
        accepted_by_auth_subject_id as "acceptedByAuthSubjectId"
      from app.client_invitations
    `,
    values: [],
  });

  return invitation;
}

async function accountsOf(session: AccountSession): Promise<AccountRow[]> {
  return suite.postgres.queryRows<AccountRow>({
    sql: "select id, role from app.accounts where auth_subject_id = $1",
    values: [session.subjectId],
  });
}

async function clientBoundTo(
  session: AccountSession,
): Promise<string | undefined> {
  const [client] = await suite.postgres.queryRows<{ id: string }>({
    sql: "select id from app.clients where auth_subject_id = $1",
    values: [session.subjectId],
  });

  return client?.id;
}

async function revocationsOf(session: AccountSession) {
  return suite.wireMock.recordedRequests(
    clerkSessionRevocationPath(session.sessionId),
  );
}

async function identityLookupsOf(session: AccountSession) {
  return suite.wireMock.recordedRequests(`/v1/users/${session.subjectId}`);
}
