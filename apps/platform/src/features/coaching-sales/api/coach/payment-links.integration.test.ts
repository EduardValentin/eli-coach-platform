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
  PAYMENT_LINK_EMAIL_SUBJECTS,
  PAYMENT_LINKS_API,
} from "~integration-test-config/coaching-sales-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import { resendRejects } from "~integration-test-config/wire-mock/expectations/resend-emails";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * HOUR_IN_MILLISECONDS;
const AN_HOUR_AFTER_THE_CALL_ENDED = new Date(
  CALL_ENDED_INSTANT.getTime() + HOUR_IN_MILLISECONDS,
);

type PaymentLinkRow = {
  createdAt: Date;
  expiresAt: Date;
  state: string;
};

describe.sequential("payment links integration", () => {
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

  it("sends one payment link that stays valid for 30 days", async () => {
    // arrange
    const callId = await journey.bookEndedCall();

    // act
    const response = await journey.sendPaymentLink(callId);

    // assert
    const links = await readPaymentLinks(callId);
    const emails = await paymentLinkEmails();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: ANA.email, status: "sent" });
    expect(links.map((link) => link.state)).toEqual(["valid"]);
    expect(
      links.map((link) => link.expiresAt.getTime() - link.createdAt.getTime()),
    ).toEqual([THIRTY_DAYS_IN_MILLISECONDS]);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      subject: PAYMENT_LINK_EMAIL_SUBJECTS.regular,
      to: ANA.email,
    });
    expect(emails[0]?.text).toContain("1 month: €159 per month, €159 in total");
    expect(emails[0]?.text).toContain(
      "3 months: €149 per month, €447 in total",
    );
    expect(emails[0]?.text).toContain(
      "6 months: €139 per month, €834 in total",
    );
    expect(emails[0]?.text.match(/\/select-bundle\?token=/g)).toHaveLength(1);
  });

  it("sends the reduced prices when the call's email holds a reduced waitlist allocation", async () => {
    // arrange
    await journey.joinWaitlist(ANA.email);
    const callId = await journey.bookEndedCall();

    // act
    const response = await journey.sendPaymentLink(callId);

    // assert
    const [email] = await paymentLinkEmails();

    expect(response.status).toBe(200);
    expect(email?.subject).toBe(PAYMENT_LINK_EMAIL_SUBJECTS.reduced);
    expect(email?.text).toContain("1 month: €139 per month, €139 in total");
    expect(email?.text).toContain("3 months: €125 per month, €375 in total");
    expect(email?.text).toContain("6 months: €119 per month, €714 in total");
  });

  it("voids the earlier link when the coach re-sends", async () => {
    // arrange
    const callId = await journey.bookEndedCall();
    await journey.sendPaymentLink(callId);
    await rig.holdClock(AN_HOUR_AFTER_THE_CALL_ENDED);

    // act
    const response = await journey.sendPaymentLink(callId);

    // assert
    const states = (await readPaymentLinks(callId)).map((link) => link.state);
    const tokens = await journey.paymentLinkTokens();

    expect(response.status).toBe(200);
    expect(states).toEqual(["voided", "valid"]);
    expect(await paymentLinkEmails()).toHaveLength(2);
    expect(new Set(tokens).size).toBe(2);
  });

  it("refuses a CLIENT and stores nothing", async () => {
    // arrange
    await rig.provisionClient();
    const callId = await journey.bookEndedCall();

    // act
    const response = await journey.sendPaymentLinkAs(CLIENT_SESSION, callId);

    // assert
    expect(response.status).toBe(403);
    expect(await readPaymentLinks(callId)).toEqual([]);
    expect(await paymentLinkEmails()).toEqual([]);
  });

  it("refuses an anonymous request and stores nothing", async () => {
    // arrange
    const callId = await journey.bookEndedCall();

    // act
    const response = await suite.request(
      new Request(suite.url(PAYMENT_LINKS_API), {
        body: JSON.stringify({ assessmentCallId: callId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    // assert
    expect(response.status).toBe(401);
    expect(await readPaymentLinks(callId)).toEqual([]);
    expect(await paymentLinkEmails()).toEqual([]);
  });

  it("refuses a call that has not ended yet", async () => {
    // arrange
    const callId = await journey.bookCall();

    // act
    const response = await journey.sendPaymentLink(callId);

    // assert
    expect(response.status).toBe(409);
    expect(await readPaymentLinks(callId)).toEqual([]);
    expect(await paymentLinkEmails()).toEqual([]);
  });

  it("answers 404 in waiting-list mode and stores nothing", async () => {
    // arrange
    const callId = await journey.bookEndedCall();
    await rig.switchWaitlistModeOn();

    // act
    const response = await journey.sendPaymentLink(callId);

    // assert
    expect(response.status).toBe(404);
    expect(await readPaymentLinks(callId)).toEqual([]);
    expect(await paymentLinkEmails()).toEqual([]);
  });

  it("voids the new link when Resend refuses the email", async () => {
    // arrange
    const callId = await journey.bookEndedCall();
    await suite.wireMock.stub(resendRejects("payment-link:"));

    // act
    const response = await journey.sendPaymentLink(callId);

    // assert
    const states = (await readPaymentLinks(callId)).map((link) => link.state);

    expect(response.status).toBe(502);
    expect(states).toEqual(["voided"]);
  });
});

async function readPaymentLinks(callId: string): Promise<PaymentLinkRow[]> {
  return suite.postgres.queryRows<PaymentLinkRow>({
    sql: `
      select state, created_at as "createdAt", expires_at as "expiresAt"
      from app.payment_links
      where assessment_call_id = $1
      order by created_at
    `,
    values: [callId],
  });
}

async function paymentLinkEmails() {
  const subjects: readonly string[] = Object.values(
    PAYMENT_LINK_EMAIL_SUBJECTS,
  );

  return (await suite.sentEmails()).filter((email) =>
    subjects.includes(email.subject),
  );
}
