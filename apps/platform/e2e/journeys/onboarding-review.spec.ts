import { clientPronouns } from "../support/client-pronouns";
import { latestEmailTo } from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";
import {
  BONE_OR_JOINT_PROBLEM_LIST,
  BOOKING_CONTACT,
  PROTOTYPE_DETAIL_REQUEST,
  SEEDED_FACT_READINGS,
  SLEEP_HOURS,
} from "../support/submitted-clients";

const JOURNEY_TIMEOUT_MS = 300_000;
const WITHDRAWAL_DAYS = 14;
const DETAILS_EMAIL_SUBJECT = "Eli needs a few more details";
const PORTAL_LINK = /\/client$/;
const SLEEP_QUESTION = "Sleep on a normal night";
const CONDITIONS_QUESTION = "Please list condition(s) here:";
const ANSWERED_SLEEP_HOURS = "7–8 hours";
const ANSWERED_CONDITIONS =
  "Right shoulder impingement, physio cleared overhead work in August.";
const NUTRITION_FORM = "Food and daily life";
const SAFETY_FORM = "A few safety questions";
const GOAL_FORM = "Your goal and your week";
const CYCLE_FORM = "Your cycle and hormonal health";
const NOTE = PROTOTYPE_DETAIL_REQUEST.note;
const SEEDED_PROFILE_FACTS = {
  heightCm: "165.0",
  startingWeightKg: "66.10",
  currentWeightKg: "66.10",
  activityLevel: "Mostly sitting",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "Lactose, mild",
  clientNotes: null,
};

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

test("the coach reviews from the keyboard, the dialog keeps and returns focus, and she approves from inside it", async ({
  coachClient,
  onboardingRecords,
  page,
  provisionCoach,
  provisionSubmittedClient,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionSubmittedClient("waiting");
  await page.goto("/store");
  await signInAsCoach();
  await coachClient.open(client.clientId);

  // act
  await coachClient.openReviewWithKeyboard("Review answers");

  // assert
  await coachClient.expectEveryFormExpanded();
  await coachClient.expectAskForDetails("disabled");
  await coachClient.expectFocusKeptInReview();

  // act
  await coachClient.flagWithKeyboard("Sleep hours");

  // assert
  await coachClient.expectFlagCount(1);
  await coachClient.expectAskForDetails("disabled");

  // act
  await coachClient.writeNoteWithKeyboard(NOTE);

  // assert
  await coachClient.expectAskForDetails("enabled");

  // act
  await coachClient.closeReviewWithEscape();

  // assert
  await coachClient.expectReviewTriggerFocused("Continue review");
  await coachClient.expectStatus("In review");
  expect(await onboardingRecords.detailRequests()).toEqual([]);

  // act
  await coachClient.openReview("Continue review");
  await coachClient.approveFromReview(client.firstName);

  // assert
  await coachClient.expectStatus("Approved");
  await coachClient.expectNoReviewActions();
  await coachClient.expectNoBuildProgram(client.gender);
  expect(await onboardingRecords.reviewStamps()).toMatchObject({
    reviewOpenedAt: expect.any(Date),
    answersApprovedAt: expect.any(Date),
  });
  expect(await onboardingRecords.detailRequests()).toEqual([]);
});

test("approving straight from Awaiting review passes through In review and refuses every later review action", async ({
  coachClient,
  onboardingRecords,
  page,
  portalRequests,
  provisionClientInState,
  provisionCoach,
  provisionSubmittedClient,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionSubmittedClient("waiting");
  const needsDetails = await provisionClientInState("needs-details");
  await page.goto("/store");
  await signInAsCoach();

  // act
  const earlyRequest = await portalRequests.requestDetails(
    client.clientId,
    PROTOTYPE_DETAIL_REQUEST,
  );

  // assert
  expect(earlyRequest).toBe(409);
  expect(await onboardingRecords.detailRequests()).toEqual([]);

  // act
  await coachClient.open(client.clientId);
  await coachClient.approveAnswers(client.firstName);

  // assert
  await coachClient.expectStatus("Approved");
  await coachClient.expectNoReviewActions();
  await coachClient.expectNoBuildProgram(client.gender);
  const approvedStamps = await onboardingRecords.reviewStamps();
  expect(approvedStamps?.reviewOpenedAt).toBeInstanceOf(Date);
  expect(approvedStamps?.answersApprovedAt).toBeInstanceOf(Date);

  // act
  const afterApproval = [
    await portalRequests.openReview(client.clientId),
    await portalRequests.requestDetails(
      client.clientId,
      PROTOTYPE_DETAIL_REQUEST,
    ),
    await portalRequests.approveAnswers(client.clientId),
  ];

  // assert
  expect(afterApproval).toEqual([409, 409, 409]);
  expect(await onboardingRecords.detailRequests()).toEqual([]);
  expect(await onboardingRecords.reviewStamps()).toEqual(approvedStamps);

  // act
  await coachClient.open(needsDetails.clientId);

  // assert
  await coachClient.expectStatus("Needs details");
  await coachClient.expectNoReviewActions();

  // act
  const whileWaiting = [
    await portalRequests.requestDetails(
      needsDetails.clientId,
      PROTOTYPE_DETAIL_REQUEST,
    ),
    await portalRequests.approveAnswers(needsDetails.clientId),
  ];

  // assert
  expect(whileWaiting).toEqual([409, 409]);

  // act
  await coachClient.open(needsDetails.clientId);

  // assert
  await coachClient.expectStatus("Needs details");
});

test("a client answers only what her coach asked, keeps her answers when the send fails and cannot answer a closed request", async ({
  clientDashboard,
  clientOnboarding,
  onboardingRecords,
  page,
  portalRequests,
  provisionSubmittedClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const client = await provisionSubmittedClient("waiting", "needs-details");
  await page.goto("/store");
  await signIn();
  await page.goto("/client");

  // act
  const unasked = await portalRequests.answerDetails({
    "nutrition-lifestyle": {
      sleepHours: ANSWERED_SLEEP_HOURS,
      mealsPerDay: "Two",
    },
  });

  // assert
  expect(unasked).toBe(422);
  const [untouched] = await onboardingRecords.submissions();
  expect(untouched.answers["nutrition-lifestyle"]).toMatchObject({
    sleepHours: SLEEP_HOURS,
    mealsPerDay: "Three",
  });
  const profileBeforeAnswering = await onboardingRecords.clientProfile();
  expect(profileBeforeAnswering).toMatchObject(SEEDED_PROFILE_FACTS);
  const [openRequest] = await onboardingRecords.detailRequests();
  expect(openRequest.answeredAt).toBeNull();

  // act
  await clientDashboard.answerNow();
  await clientOnboarding.choose(SLEEP_QUESTION, ANSWERED_SLEEP_HOURS);
  await clientOnboarding.blockDetailAnswers();
  await clientOnboarding.sendMyAnswers();

  // assert
  await clientOnboarding.expectAnswerSendProblem();
  await expect(page).toHaveURL(/\/client\/onboarding\?answer=1$/);
  await clientOnboarding.expectSelected(SLEEP_QUESTION, ANSWERED_SLEEP_HOURS);
  const [stillOpen] = await onboardingRecords.detailRequests();
  expect(stillOpen.answeredAt).toBeNull();

  // act
  await clientOnboarding.restoreDetailAnswers();
  await clientOnboarding.sendMyAnswers();

  // assert
  await expect(page).toHaveURL(/\/client$/);
  await clientDashboard.expectStatusCard(
    "Your coach is reviewing your answers",
    `Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on ${dayMonthFormatter.format(daysAfter(client.paidAt, WITHDRAWAL_DAYS))}.`,
  );

  // act
  const afterAnswer = await portalRequests.answerDetails({
    "nutrition-lifestyle": { sleepHours: SLEEP_HOURS },
  });

  // assert
  expect(afterAnswer).toBe(409);
  const [answered] = await onboardingRecords.submissions();
  expect(answered.answers["nutrition-lifestyle"]?.sleepHours).toBe(
    ANSWERED_SLEEP_HOURS,
  );
  const rebuiltProfile = await onboardingRecords.clientProfile();
  expect(rebuiltProfile).toMatchObject(SEEDED_PROFILE_FACTS);
  expect(rebuiltProfile?.createdAt).toEqual(profileBeforeAnswering?.createdAt);
  expect(rebuiltProfile?.updatedAt.getTime()).toBeGreaterThan(
    profileBeforeAnswering?.updatedAt.getTime() ?? Number.POSITIVE_INFINITY,
  );
});

test("the onboarding panel raises every safety signal and shows only the questions her answers reached", async ({
  coachClient,
  page,
  provisionCoach,
  provisionProfiledClient,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const flagged = await provisionProfiledClient("flagged");
  const screenedManually = await provisionProfiledClient("manual-screening");
  await page.goto("/store");
  await signInAsCoach();

  // act
  await coachClient.open(flagged.clientId);

  // assert
  await coachClient.expectProfile({
    Gender: "Female",
    Country: "Romania",
    Phone: BOOKING_CONTACT.phone,
    ...SEEDED_FACT_READINGS,
  });
  await coachClient.expectPhoneLink(BOOKING_CONTACT.phone);
  await coachClient.expectSubscription({ Start: "Immediate start" });
  await coachClient.expectReducedPrice("No");
  await coachClient.expectAssessmentCall({
    Name: flagged.fullName,
    Email: flagged.email,
    "Date of birth": "14 March 1994",
    Gender: "Female",
    Country: "Romania",
    Phone: BOOKING_CONTACT.phone,
    "Primary goal": "Build strength",
    "Booking notes": BOOKING_CONTACT.notes,
  });
  await coachClient.expectStatus("Awaiting review");
  await coachClient.expectScreeningWarning(
    "Safety screening needs a look: 2 yes answers",
  );
  await coachClient.expectScreeningWarning("Nutrition advice on hold");
  await coachClient.expectFacts({
    "Waist-to-height ratio": "Not shown during pregnancy or right after birth.",
    "Check-in day": "Monday",
    Channel: "Email",
    "Cycle mode": "Symptom-based",
  });
  await coachClient.expectNeedsALook(SAFETY_FORM, "Bone or joint problem");
  await coachClient.expectNeedsALook(
    SAFETY_FORM,
    "Chronic condition diagnosed",
  );
  await coachClient.expectNeedsALook(CYCLE_FORM, "Life stage");
  await coachClient.expectNeedsALook(CYCLE_FORM, "Recurring symptoms");
  await coachClient.expectFormFullyAnswered(SAFETY_FORM);
  await coachClient.expectQuestionUnreached(
    SAFETY_FORM,
    "Chronic condition medication list",
  );
  await coachClient.expectAnswer({
    form: GOAL_FORM,
    question: "Weight",
    answer: "66.1 kg",
  });
  await coachClient.expectAnswer({
    form: GOAL_FORM,
    question: "Height",
    answer: "165 cm",
  });
  await coachClient.expectMeasurements(["66.1 kg", "74 cm", "98 cm"]);

  // act
  await coachClient.open(screenedManually.clientId);

  // assert
  await coachClient.expectProfile({
    Gender: "Male",
    Country: "Romania",
    Phone: "—",
    ...SEEDED_FACT_READINGS,
    "Current weight": "—",
  });
  await coachClient.expectStatus("Awaiting review");
  await coachClient.expectScreeningWarning(
    "Safety screening: manual screening (age)",
  );
  await coachClient.expectFacts({
    "Waist-to-height ratio": `Waiting on ${clientPronouns(screenedManually.gender).possessive} first measurements`,
    "Cycle mode": "Not applicable",
  });
  await coachClient.expectNoForm(SAFETY_FORM);
  await coachClient.expectNoForm(CYCLE_FORM);
  await coachClient.expectNoMeasurements(screenedManually.gender);
});
