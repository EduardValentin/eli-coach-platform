import {
  latestEmailTo,
  refuseEmailsTo,
  type CapturedEmail,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";

const JOURNEY_TIMEOUT_MS = 180_000;
const INVITATION_SUBJECT = "Your place is booked — create your account.";
const INVITATION_LINK = /\/invitation#[\w-]+$/;
const INVITATION_VALIDITY_DAYS = 30;

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

function pendingLine(sentAt: Date, expiresAt: Date): string {
  return `Invited ${dayMonthFormatter.format(sentAt)} · expires ${dayMonthFormatter.format(expiresAt)}`;
}

function invitationLinkIn(email: CapturedEmail): string {
  const link = email.links.find((candidate) => INVITATION_LINK.test(candidate));

  if (!link) {
    throw new Error(`"${email.subject}" carries no invitation link.`);
  }

  return link;
}

test("the coach re-sends an invitation and only the fresh link lets the client in", async ({
  accountPortal,
  coachClient,
  page,
  provisionCoach,
  provisionInvitedClient,
  publicNav,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const invited = await provisionInvitedClient("pending");
  const earlierLink = `/invitation#${invited.invitationToken}`;
  const earlierHandOff = await accountPortal.stopAtSignUpHandOff();

  // act
  await page.goto(earlierLink);

  // assert
  await earlierHandOff.expectReached();

  // arrange
  await page.goto("/store");
  await signInAsCoach();

  // act
  await coachClient.open(invited.clientId);

  // assert
  await coachClient.expectClient(invited.fullName, invited.email);
  await coachClient.expectProfilePending(invited.gender, {
    Gender: "Female",
    Country: "Romania",
    Phone: "—",
  });
  await coachClient.expectStatus("Invited");
  await coachClient.expectAnswersNotIn(invited.gender);
  await coachClient.expectInvitationLine(
    pendingLine(invited.invitationSentAt, invited.invitationExpiresAt),
  );

  // act
  await coachClient.resendInvitation(invited);

  // assert
  await coachClient.expectToast(`Invitation sent to ${invited.email}.`);
  const resentAt = new Date();
  await coachClient.expectInvitationLine(
    pendingLine(resentAt, daysAfter(resentAt, INVITATION_VALIDITY_DAYS)),
  );
  const invitationEmail = await latestEmailTo(invited.email);
  expect(invitationEmail.subject).toBe(INVITATION_SUBJECT);
  const freshLink = invitationLinkIn(invitationEmail);
  expect(freshLink).not.toContain(invited.invitationToken);

  // arrange
  await page.goto("/");
  await publicNav.signOut();
  const freshHandOff = await accountPortal.stopAtSignUpHandOff();

  // act
  await page.goto(freshLink);

  // assert
  await freshHandOff.expectReached();

  // act
  await page.goto("/");
  await page.goto(earlierLink);

  // assert
  await expect(
    page.getByRole("heading", { name: "This invitation isn't available" }),
  ).toBeVisible();
});

test("an expired invitation and one whose email failed still offer a re-send", async ({
  coachClient,
  page,
  provisionCoach,
  provisionInvitedClient,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const expired = await provisionInvitedClient("expired");
  const unsent = await provisionInvitedClient("email-failed");
  await page.goto("/store");
  await signInAsCoach();

  // act
  await coachClient.open(expired.clientId);

  // assert
  await coachClient.expectStatus("Invited");
  await coachClient.expectInvitationLine(
    `Invitation expired ${dayMonthFormatter.format(expired.invitationExpiresAt)}`,
  );

  // act
  await coachClient.open(unsent.clientId);

  // assert
  await coachClient.expectStatus("Invited");
  await coachClient.expectInvitationLine("Invitation email could not be sent");

  // act
  await coachClient.resendInvitation(unsent);

  // assert
  await coachClient.expectToast(`Invitation sent to ${unsent.email}.`);
  const resentAt = new Date();
  await coachClient.expectInvitationLine(
    pendingLine(resentAt, daysAfter(resentAt, INVITATION_VALIDITY_DAYS)),
  );
  expect((await latestEmailTo(unsent.email)).subject).toBe(INVITATION_SUBJECT);
});

test("a re-send whose email fails keeps the invitation marked unsent and asks the coach to try again", async ({
  coachClient,
  page,
  provisionCoach,
  provisionInvitedClient,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const invited = await provisionInvitedClient("pending");
  await refuseEmailsTo(invited.email);
  await page.goto("/store");
  await signInAsCoach();
  await coachClient.open(invited.clientId);

  // act
  await coachClient.resendInvitation(invited);

  // assert
  await coachClient.expectToast(
    "The invitation email could not be sent. Try again.",
  );
  await coachClient.expectInvitationLine("Invitation email could not be sent");
  await coachClient.expectStatus("Invited");

  // act
  await coachClient.open(invited.clientId);

  // assert
  await coachClient.expectInvitationLine("Invitation email could not be sent");
  await expect(latestEmailTo(invited.email)).rejects.toThrow(
    `No email has been sent to ${invited.email}.`,
  );
});
