import { latestEmailTo } from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import {
  BONE_OR_JOINT_PROBLEM_LIST,
  PROTOTYPE_DETAIL_REQUEST,
  SLEEP_HOURS,
} from "../support/submitted-clients";

const JOURNEY_TIMEOUT_MS = 300_000;
const DETAILS_EMAIL_SUBJECT = "Eli needs a few more details";
const PORTAL_LINK = /\/client$/;
const SLEEP_QUESTION = "Sleep on a normal night";
const CONDITIONS_QUESTION = "Please list condition(s) here:";
const ANSWERED_SLEEP_HOURS = "7–8 hours";
const ANSWERED_CONDITIONS =
  "Right shoulder impingement, physio cleared overhead work in August.";
const NUTRITION_FORM = "Food and daily life";
const SAFETY_FORM = "A few safety questions";
const NOTE = PROTOTYPE_DETAIL_REQUEST.note;

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

test("the coach asks for more details, the client answers only what was asked and the coach approves", async ({
  clientDashboard,
  clientOnboarding,
  coachClient,
  onboardingRecords,
  page,
  provisionCoach,
  provisionSubmittedClient,
  publicNav,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionSubmittedClient("immediate");
  await page.goto("/store");
  await signInAsCoach();

  // act
  await coachClient.open(client.clientId);

  // assert
  await coachClient.expectStatus("Awaiting review");
  await coachClient.expectScreeningWarning(
    "Safety screening needs a look: 1 yes answer",
  );
  await coachClient.expectFacts({
    "Waist-to-height ratio": "0.45",
    "Check-in day": "Monday",
    Channel: "Email",
    "Cycle mode": "Phase-based",
  });
  await coachClient.expectNeedsALook(SAFETY_FORM, "Bone or joint problem");
  await coachClient.expectMeasurements([
    "66.1 kg",
    "74 cm",
    "98 cm",
    "57 cm",
    "28 cm",
    "0.45",
  ]);
  await coachClient.expectReviewActions("Review answers");

  // act
  await coachClient.openReview("Review answers");
  await coachClient.closeReview();

  // assert
  await coachClient.expectStatus("In review");
  await coachClient.expectReviewActions("Continue review");
  expect(
    (await onboardingRecords.reviewStamps())?.reviewOpenedAt,
  ).toBeInstanceOf(Date);

  // act
  await coachClient.openReview("Continue review");
  await coachClient.flag("Sleep hours");
  await coachClient.flag("Bone or joint problem list");
  await coachClient.writeNote(NOTE);

  // assert
  await coachClient.expectFlagCount(2);

  // act
  await coachClient.askForDetails();

  // assert
  await coachClient.expectToast(`Email sent to ${client.email}.`);
  await coachClient.expectStatus("Needs details");
  await coachClient.expectWaitingOn(2, {
    askedOn: dayMonthFormatter.format(new Date()),
    note: NOTE,
  });
  await coachClient.expectAskedAgain(NUTRITION_FORM, "Sleep hours");
  await coachClient.expectAskedAgain(SAFETY_FORM, "Bone or joint problem list");
  await coachClient.expectNoReviewActions();
  const detailsEmail = await latestEmailTo(client.email);
  expect(detailsEmail.subject).toBe(DETAILS_EMAIL_SUBJECT);
  expect(detailsEmail.links.some((link) => PORTAL_LINK.test(link))).toBe(true);
  for (const leak of [NOTE, "sleepHours", "boneOrJointProblemList"]) {
    expect(detailsEmail.text).not.toContain(leak);
    expect(detailsEmail.html).not.toContain(leak);
  }
  const [request] = await onboardingRecords.detailRequests();
  expect(request).toMatchObject({
    questionIds: PROTOTYPE_DETAIL_REQUEST.questions,
    note: NOTE,
    answeredAt: null,
  });

  // act
  await page.goto("/");
  await publicNav.signOut();
  await signIn();
  await page.goto("/client");

  // assert
  await clientDashboard.expectRequestNote(NOTE);

  // act
  await clientDashboard.answerNow();

  // assert
  await expect(page).toHaveURL(/\/client\/onboarding\?answer=1$/);
  await clientOnboarding.expectAnswerPage(NOTE);
  await clientOnboarding.expectOnlyQuestions([
    SLEEP_QUESTION,
    CONDITIONS_QUESTION,
  ]);
  await clientOnboarding.expectSelected(SLEEP_QUESTION, SLEEP_HOURS);
  await clientOnboarding.expectAnswer(
    CONDITIONS_QUESTION,
    BONE_OR_JOINT_PROBLEM_LIST,
  );

  // act
  await clientOnboarding.notNow();

  // assert
  await expect(page).toHaveURL(/\/client$/);
  await clientDashboard.expectRequestNote(NOTE);

  // act
  await clientDashboard.answerNow();
  await clientOnboarding.choose(SLEEP_QUESTION, ANSWERED_SLEEP_HOURS);
  await clientOnboarding.answerText(CONDITIONS_QUESTION, ANSWERED_CONDITIONS);
  await clientOnboarding.sendMyAnswers();

  // assert
  await expect(page).toHaveURL(/\/client$/);
  await clientDashboard.expectStatusCard(
    "Your coach is reviewing your answers",
    "You'll see the next step here as soon as she has looked through your answers.",
  );
  const [submission] = await onboardingRecords.submissions();
  expect(submission.answers["nutrition-lifestyle"]?.sleepHours).toBe(
    ANSWERED_SLEEP_HOURS,
  );
  expect(submission.answers["safety-screening"]).toMatchObject({
    boneOrJointProblem: "Yes",
    boneOrJointProblemList: ANSWERED_CONDITIONS,
  });
  const [answeredRequest] = await onboardingRecords.detailRequests();
  expect(answeredRequest.answeredAt).toBeInstanceOf(Date);

  // act
  await page.goto("/client/onboarding?answer=1");

  // assert
  await expect(page).toHaveURL(/\/client$/);

  // act
  await page.goto("/");
  await publicNav.signOut();
  await signInAsCoach();
  await coachClient.open(client.clientId);

  // assert
  await coachClient.expectStatus("In review");
  await coachClient.expectNoOpenRequest();
  await coachClient.expectAnswer({
    form: NUTRITION_FORM,
    question: "Sleep hours",
    answer: ANSWERED_SLEEP_HOURS,
  });
  await coachClient.expectReviewActions("Continue review");

  // act
  await coachClient.approveAnswers(client.firstName);

  // assert
  await coachClient.expectStatus("Approved");
  await coachClient.expectNoReviewActions();
  expect(
    (await onboardingRecords.reviewStamps())?.answersApprovedAt,
  ).toBeInstanceOf(Date);

  // act
  await page.goto("/");
  await publicNav.signOut();
  await signIn();
  await page.goto("/client");

  // assert
  await clientDashboard.expectProgramCard(
    "Your answers are approved",
    "Eli is putting your program together.",
  );
});
