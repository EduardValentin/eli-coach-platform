import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import { emailMomentOf } from "../support/check-in-moments";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { E2E_APP_URL } from "../support/e2e-app";
import {
  COACH_NOTIFICATION_EMAIL,
  latestEmailTo,
  type CapturedEmail,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import {
  expectNoHorizontalScroll,
  setPhoneViewport,
} from "../support/viewport";

const CLIENT_TIME_ZONE = "Europe/London";
const JOURNEY_TIMEOUT_MS = 240_000;
const FORM_CHECK_NOTE = "Can we go over my squat form?";
const WITHDRAWN_NOTE = "I would like to talk about my meal plan.";
const DECLINED_NOTE = "Could we look at my progress photos?";
const PRIVATE_NOTE = "A quick word about my knee.";
const APPROVED_SUBJECT = "Your check-in is approved";
const DECLINED_SUBJECT = `${COACH_DISPLAY_NAME} could not make your check-in time`;
const CLIENT_TAB_LINKS = ["Dashboard", "Check-ins", "Profile"];
const NO_OTHER_MEASUREMENTS = {
  system: "metric",
  photoConsent: "not-given",
  entries: [],
} as const;

test.use({ timezoneId: CLIENT_TIME_ZONE });

async function latestSubjectTo(address: string): Promise<string | null> {
  try {
    return (await latestEmailTo(address)).subject;
  } catch {
    return null;
  }
}

async function emailTo(
  address: string,
  subject: string,
): Promise<CapturedEmail> {
  await expect.poll(() => latestSubjectTo(address)).toBe(subject);

  return latestEmailTo(address);
}

function clientJoinLinkOf(checkInId: string): string {
  return `${E2E_APP_URL}/client/checkins/${checkInId}/join`;
}

test(
  "a client asks for a check-in, her coach approves it, and both join it",
  { tag: "@critical" },
  async ({
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachMeetingRoom,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await coachMeetingRoom.set();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    const clientProblems = collectPageProblems(page);
    await clientCheckIns.open();

    // act
    await clientCheckIns.openRequestDialog();
    const requested =
      await checkInRequestDialog.requestSoonest(FORM_CHECK_NOTE);

    // assert
    await expect(page.getByText(/^Check-in requested for /)).toBeVisible();
    await clientCheckIns.showTab("Requests");
    await expect(
      clientCheckIns.checkIn("Requests", FORM_CHECK_NOTE),
    ).toContainText("Requested by you");
    const requestEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} asked for a check-in`,
    );
    expect(requestEmail.text).toContain(client.fullName);
    expect(requestEmail.text).toContain(
      emailMomentOf(requested.startsAt, COACH_TIME_ZONE),
    );
    expect(requestEmail.text).toContain(FORM_CHECK_NOTE);
    expect(clientProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    const waiting = await checkInRecords.waitingRequestCount();

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectTabShown("Requests");
    await coachCheckIns.expectWaitingCount(waiting);
    await expect(
      coachCheckIns.checkIn("Requests", client.fullName),
    ).toContainText(FORM_CHECK_NOTE);

    // act
    await coachCheckIns.approve(client.fullName);

    // assert
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );
    const approvalEmail = await emailTo(client.email, APPROVED_SUBJECT);
    expect(approvalEmail.links).toContain(clientJoinLinkOf(checkInId));
    expect(approvalEmail.text).toContain(
      emailMomentOf(requested.startsAt, CLIENT_TIME_ZONE),
    );
    expect(approvalEmail.attachmentNames).toEqual(["invite.ics"]);
    await coachCheckIns.showTab("Upcoming");
    await expect(
      coachCheckIns.checkIn("Upcoming", client.fullName),
    ).toContainText(FORM_CHECK_NOTE);

    // act
    await coachCheckIns.joinFromRow(client.fullName);

    // assert
    await coachMeetingRoom.expectEntered();
    expect(coachProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const joiningProblems = collectPageProblems(page);

    // act
    await clientCheckIns.open();

    // assert
    await expect(
      clientCheckIns.checkIn("Upcoming", FORM_CHECK_NOTE),
    ).toBeVisible();

    // act
    await clientCheckIns.joinFromRow(FORM_CHECK_NOTE);

    // assert
    await coachMeetingRoom.expectEntered();
    await coachMeetingRoom.expectLinkLeadsHere(clientJoinLinkOf(checkInId));
    expect(joiningProblems).toEqual([]);
  },
);

test(
  "a client withdraws one request and her coach declines the next, and each hour is offered again",
  { tag: "@completeness" },
  async ({
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // act
    await clientCheckIns.openRequestDialog();
    const withdrawn = await checkInRequestDialog.requestSoonest(WITHDRAWN_NOTE);

    // assert
    await clientCheckIns.expectRequestBlocked();

    // act
    await clientCheckIns.withdraw(WITHDRAWN_NOTE);

    // assert
    await clientCheckIns.expectRequestAllowed();
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", WITHDRAWN_NOTE)).toContainText(
      "Cancelled",
    );
    const withdrawalEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} withdrew the check-in request`,
    );
    expect(withdrawalEmail.text).toContain(
      emailMomentOf(withdrawn.startsAt, COACH_TIME_ZONE),
    );

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectOffers(withdrawn);

    // arrange
    await checkInRequestDialog.closeWithEscape();
    await checkInRequestDialog.expectClosed();
    await clientCheckIns.openRequestDialog();
    const declined = await checkInRequestDialog.requestSoonest(DECLINED_NOTE);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();

    // act
    await coachCheckIns.decline(client.fullName);

    // assert
    await expect(
      coachCheckIns.checkIn("Requests", client.fullName),
    ).toBeHidden();
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );
    const declineEmail = await emailTo(client.email, DECLINED_SUBJECT);
    expect(declineEmail.text).toContain(
      emailMomentOf(declined.startsAt, CLIENT_TIME_ZONE),
    );

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectRequestAllowed();
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectOffers(declined);
  },
);

test(
  "only the client and her coach reach a check-in, and a missing meeting link says so",
  { tag: "@completeness" },
  async ({
    accountPortal,
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachMeetingRoom,
    page,
    provisionCoach,
    provisionOtherMeasuredClient,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
    signInAsOtherClient,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await coachMeetingRoom.unset();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await provisionOtherMeasuredClient(NO_OTHER_MEASUREMENTS);
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.requestSoonest(PRIVATE_NOTE);
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );

    // act
    const pendingJoin = await clientCheckIns.openJoinLink(checkInId);

    // assert
    await clientCheckIns.expectNotFound(pendingJoin);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();
    await coachCheckIns.approve(client.fullName);

    // act
    await coachCheckIns.openJoinLink(checkInId);

    // assert
    await coachCheckIns.expectMeetingLinkNotSet();

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act
    await clientCheckIns.openJoinLink(checkInId);
    await accountPortal.signInWithEmail(client.email);
    await accountPortal.completeEmailOtp();

    // assert
    await clientCheckIns.expectJoinNotReady(checkInId);

    // act
    await clientCheckIns.returnFromNotReadyJoin();

    // assert
    await expect(
      clientCheckIns.checkIn("Upcoming", PRIVATE_NOTE),
    ).toBeVisible();

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsOtherClient();

    // act
    const otherClientJoin = await clientCheckIns.openJoinLink(checkInId);

    // assert
    await clientCheckIns.expectNotFound(otherClientJoin);
  },
);

test(
  "a client asks for a check-in from her phone",
  { tag: "@completeness" },
  async ({
    checkInRequestDialog,
    clientCheckIns,
    clientPortalShell,
    coachAvailability,
    page,
    provisionSubmittedClient,
    signIn,
  }) => {
    // arrange
    await coachAvailability.openEveryDay();
    await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");

    // act
    await setPhoneViewport(page);

    // assert
    await clientPortalShell.expectTabLinks(CLIENT_TAB_LINKS);

    // act
    await clientPortalShell.openCheckInsFromTabs();

    // assert
    await clientCheckIns.expectOpen();
    await clientCheckIns.expectFloatingRequestButton();
    await expectNoHorizontalScroll(page);

    // act
    await clientCheckIns.openRequestDialogWithKeyboard();

    // assert
    await checkInRequestDialog.expectOpen();
    await expectNoHorizontalScroll(page);

    // act
    await checkInRequestDialog.closeWithEscape();

    // assert
    await checkInRequestDialog.expectClosed();
    await clientCheckIns.expectRequestButtonFocused();
  },
);
