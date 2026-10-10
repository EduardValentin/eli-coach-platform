import type { ClientOnboarding } from "../support/client-onboarding";
import { expect, test } from "../support/fixtures";
import {
  samplePhotoOf,
  UNPROCESSABLE_PHOTO,
  UNSUPPORTED_TYPE_PHOTO,
} from "../support/sample-photos";

const JOURNEY_TIMEOUT_MS = 240_000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const LAST_PERIOD_DAYS_AGO = 10;
const WORK_STARTS_DAYS_AFTER_PAYMENT = 14;
const OUTSIDE_SCREENING_AGE_DATE_OF_BIRTH = "1950-01-01";
const SUBMISSION_API_PATH = "/api/client-onboarding/submission";
const DRAFT_API_PATH = "/api/client-onboarding/draft";

const FEMALE_HEALTH_CONSENT =
  "I agree that Evoa stores and uses my health and cycle answers to build and adjust my training program. I can withdraw this at any time.";
const HEALTH_CONSENT =
  "I agree that Evoa stores and uses my health answers to build and adjust my training program. I can withdraw this at any time.";
const PARQ_DECLARATION =
  "I have read, understood and completed this questionnaire. My answers are true and complete to the best of my knowledge. If my health changes, I will let my coach know and complete this questionnaire again.";
const DISCLAIMER =
  "The information I give is correct and complete, and I understand this program does not replace medical advice or a consultation with a doctor.";
const PROGRESS_PHOTO_CONSENT =
  "I agree to share progress photos with my coach. They are only used to follow my progress, and I can ask for them to be deleted at any time.";
const PARQ_QUESTIONS = [
  "Has your doctor ever said that you have a heart condition",
  "Do you feel pain in your chest",
  "Do you lose balance because of dizziness",
  "diagnosed with another chronic medical condition",
  "currently taking prescribed medications",
  "bone, joint, or soft tissue",
  "should only do medically supervised physical activity",
] as const;
const PREVIOUS_PT_QUESTION = "Have you worked with a personal trainer before?";
const PREVIOUS_PT_FOLLOW_UP = "What worked well, and what didn't?";
const GYNAECOLOGICAL_QUESTION =
  "Has a doctor diagnosed you with a gynecological condition?";

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});
const dayMonthYearFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

async function answerWeekQuestions(onboarding: ClientOnboarding) {
  await onboarding.choose("What is your primary goal?", "Lose fat");
  await onboarding.tick("Busy schedule");
  await onboarding.choose(
    "What is your training experience?",
    "New to training",
  );
  await onboarding.choose(
    "How many days per week do you want to train?",
    "3 days",
  );
  await onboarding.choose(
    "How much time can you give to each session?",
    "30–45 minutes",
  );
  await onboarding.choose(PREVIOUS_PT_QUESTION, "No");
  await onboarding.answerText(
    "What do you expect from me as your coach?",
    "Clear guidance and accountability.",
  );
  await onboarding.choose("How active your days are", "Active");
  await onboarding.tick("Dumbbells");
  await onboarding.choose("Where you train", "Gym");
}

async function answerGoalFormInKilograms(onboarding: ClientOnboarding) {
  await onboarding.answerText("Your weight", "62");
  await onboarding.answerText("Your height", "168");
  await onboarding.answerText("Target weight", "58");
  await answerWeekQuestions(onboarding);
}

async function clearSafetyScreening(
  onboarding: ClientOnboarding,
  consent: string,
) {
  await onboarding.tick(consent);

  for (const question of PARQ_QUESTIONS) {
    await onboarding.choose(question, "No");
  }

  await onboarding.tick(PARQ_DECLARATION);
}

async function answerFoodAndDailyLife(onboarding: ClientOnboarding) {
  await onboarding.choose("Current diet", "No restrictions");
  await onboarding.choose(
    "Do you have any food allergies or intolerances?",
    "No",
  );
  await onboarding.choose("How many main meals do you usually have?", "Three");
  await onboarding.choose("And snacks?", "One");
  await onboarding.choose("First meal of the day", "7–9am");
  await onboarding.choose("Last meal of the day", "6–8pm");
  await onboarding.choose("Do you get energy dips during the day?", "No");
  await onboarding.choose("Your working day", "Mostly sitting");
  await onboarding.choose("Sleep on a normal night", "7–8 hours");
  await onboarding.choose(
    "During your working day, do you usually",
    "Bring food from home",
  );
  await onboarding.choose(
    "Who usually decides and cooks what you eat?",
    "I do",
  );
  await onboarding.choose(
    "How much time do you have to cook on a normal day?",
    "15–30 minutes",
  );
  await onboarding.choose("Water in a normal day", "2–5 glasses");
  await onboarding.answerText(
    "What would you most like to change about how you eat?",
    "Feel more consistent with home-cooked meals.",
  );
  await onboarding.choose("The day that suits you for check-ins", "Monday");
  await onboarding.choose("Where you want to hear from me", "Email");
}

async function answerEverythingButPhotos(onboarding: ClientOnboarding) {
  await onboarding.startOnboarding();
  await answerGoalFormInKilograms(onboarding);
  await onboarding.continueStep();
  await clearSafetyScreening(onboarding, HEALTH_CONSENT);
  await onboarding.continueStep();
  await answerFoodAndDailyLife(onboarding);
  await onboarding.continueStep();
  await onboarding.expectStep(4, 4);
  await onboarding.answerText("Waist", "76");
  await onboarding.tick(DISCLAIMER);
}

function workStartsOnLine(paidAt: Date): string {
  const workStartsOn = new Date(
    paidAt.getTime() + WORK_STARTS_DAYS_AFTER_PAYMENT * MILLISECONDS_PER_DAY,
  );

  return `Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on ${dayMonthFormatter.format(workStartsOn)}. Your program will be delivered as soon as it is completed.`;
}

test(
  "a female client completes her onboarding in five parts",
  { tag: "@critical" },
  async ({
    clientDashboard,
    clientOnboarding,
    onboardingRecords,
    page,
    provisionPaidClient,
    publicNav,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionPaidClient("female");
    await page.goto("/store");
    await signIn();

    // act
    await page.goto("/client");

    // assert
    await expect(page).toHaveURL(/\/client\/welcome$/);
    await clientOnboarding.expectWelcomeHeading(client.firstName);
    await clientOnboarding.expectWelcomeIntro("five");

    // act
    await clientOnboarding.startOnboarding();

    // assert
    await expect(page).toHaveURL(/\/client\/onboarding$/);
    await clientOnboarding.expectStep(1, 5);

    // act
    await clientOnboarding.chooseUnits("lb · in");
    await clientOnboarding.answerText("Your weight", "150");
    await clientOnboarding.answerText("Your height", "65");
    await clientOnboarding.answerText("Target weight", "140");
    await clientOnboarding.choose("What is your primary goal?", "Lose fat");
    await clientOnboarding.tick("Busy schedule");
    await clientOnboarding.choose(
      "What is your training experience?",
      "New to training",
    );
    await clientOnboarding.choose(
      "How many days per week do you want to train?",
      "3 days",
    );
    await clientOnboarding.choose(
      "How much time can you give to each session?",
      "30–45 minutes",
    );
    await clientOnboarding.choose(
      "Have you worked with a personal trainer before?",
      "No",
    );
    await clientOnboarding.answerText(
      "What do you expect from me as your coach?",
      "Clear guidance and accountability.",
    );
    await clientOnboarding.choose("How active your days are", "Active");
    await clientOnboarding.tick("Dumbbells");
    await clientOnboarding.choose("Where you train", "Gym");
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(2, 5);

    // act
    await clientOnboarding.tick(
      "I agree that Evoa stores and uses my health and cycle answers to build and adjust my training program. I can withdraw this at any time.",
    );
    await clientOnboarding.choose(
      "Has your doctor ever said that you have a heart condition",
      "No",
    );
    await clientOnboarding.choose("Do you feel pain in your chest", "No");
    await clientOnboarding.choose(
      "Do you lose balance because of dizziness",
      "No",
    );
    await clientOnboarding.choose(
      "diagnosed with another chronic medical condition",
      "No",
    );
    await clientOnboarding.choose(
      "currently taking prescribed medications",
      "No",
    );
    await clientOnboarding.choose("bone, joint, or soft tissue", "No");
    await clientOnboarding.choose(
      "should only do medically supervised physical activity",
      "No",
    );
    await clientOnboarding.tick(
      "I have read, understood and completed this questionnaire. My answers are true and complete to the best of my knowledge. If my health changes, I will let my coach know and complete this questionnaire again.",
    );
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectScreeningCleared();
    await clientOnboarding.expectStep(3, 5);

    // act
    await clientOnboarding.choose(
      "Do you currently get a period?",
      "Yes, and it's regular",
    );
    await clientOnboarding.choose("Are you using any contraception?", "None");
    await clientOnboarding.tick("None of these");
    await clientOnboarding.choose(
      "Are you in perimenopause or menopause?",
      "No",
    );
    await clientOnboarding.answerText("Average cycle length (days)", "28");
    await clientOnboarding.choose(
      "Has a doctor diagnosed you with a gynecological condition?",
      "No",
    );
    await clientOnboarding.tick("None");
    await clientOnboarding.pickDate(
      "The day your last period started",
      isoDaysAgo(LAST_PERIOD_DAYS_AGO),
    );
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(4, 5);

    // act
    await clientOnboarding.choose("Current diet", "No restrictions");
    await clientOnboarding.choose(
      "Do you have any food allergies or intolerances?",
      "No",
    );
    await clientOnboarding.choose(
      "How many main meals do you usually have?",
      "Three",
    );
    await clientOnboarding.choose("And snacks?", "One");
    await clientOnboarding.choose("First meal of the day", "7–9am");
    await clientOnboarding.choose("Last meal of the day", "6–8pm");

    // assert
    await clientOnboarding.expectSaved();

    // act
    await page.reload();

    // assert
    await clientOnboarding.expectStep(4, 5);
    await clientOnboarding.expectResumeNote();

    // act
    await clientOnboarding.choose(
      "Do you get energy dips during the day?",
      "No",
    );
    await clientOnboarding.choose("Your working day", "Mostly sitting");
    await clientOnboarding.choose("Sleep on a normal night", "7–8 hours");
    await clientOnboarding.choose(
      "During your working day, do you usually",
      "Bring food from home",
    );
    await clientOnboarding.choose(
      "Who usually decides and cooks what you eat?",
      "I do",
    );
    await clientOnboarding.choose(
      "How much time do you have to cook on a normal day?",
      "15–30 minutes",
    );
    await clientOnboarding.choose("Water in a normal day", "2–5 glasses");
    await clientOnboarding.answerText(
      "What would you most like to change about how you eat?",
      "Feel more consistent with home-cooked meals.",
    );
    await clientOnboarding.choose(
      "The day that suits you for check-ins",
      "Monday",
    );
    await clientOnboarding.choose("Where you want to hear from me", "Email");
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(5, 5);

    // act
    await clientOnboarding.answerText("Waist", "30");
    await clientOnboarding.tick(
      "The information I give is correct and complete, and I understand this program does not replace medical advice or a consultation with a doctor.",
    );
    await clientOnboarding.sendToCoach();

    // assert
    await expect(page).toHaveURL(/\/client$/);
    await clientDashboard.expectStatusCard(
      "Sent to your coach",
      workStartsOnLine(client.paidAt),
    );
    expect(await onboardingRecords.clientProfile()).toMatchObject({
      activityLevel: "Active",
      primaryGoal: "Lose fat",
      dietaryRestrictions: "None",
      clientNotes: null,
    });

    // act
    await page.goto("/client/onboarding");

    // assert
    await expect(page).toHaveURL(/\/client$/);

    // act
    await page.goto("/");

    // assert
    await publicNav.expectPortalPillVisible("CLIENT");
  },
);

test(
  "a client who prefers not to say sees the four-part onboarding",
  { tag: "@completeness" },
  async ({ clientOnboarding, page, provisionPaidClient, signIn }) => {
    // arrange
    await provisionPaidClient("prefer_not_to_say");
    await page.goto("/store");
    await signIn();

    // act
    await page.goto("/client");

    // assert
    await expect(page).toHaveURL(/\/client\/welcome$/);
    await clientOnboarding.expectWelcomeIntro("four");

    // act
    await clientOnboarding.startOnboarding();

    // assert
    await clientOnboarding.expectStep(1, 4);
  },
);

test(
  "a client's answers are refused inline, hidden questions are dropped and an exclusive option clears the others",
  { tag: "@completeness" },
  async ({
    clientOnboarding,
    onboardingRecords,
    page,
    provisionPaidClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionPaidClient("female");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await clientOnboarding.startOnboarding();

    // act
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(1, 5);
    await clientOnboarding.expectEntryProblem("Your weight", "Enter a weight.");
    await clientOnboarding.expectEntryFocused("Your weight");
    await clientOnboarding.expectChoiceProblem(
      "What is keeping you from reaching that goal?",
      "Choose at least one option.",
    );
    await clientOnboarding.expectChoiceProblem(
      "How many days per week do you want to train?",
      "Choose one option.",
    );

    // act
    await clientOnboarding.answerText("Your weight", "400");
    await clientOnboarding.answerText("Your height", "168");
    await clientOnboarding.answerText("Target weight", "130");
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(1, 5);
    await clientOnboarding.expectEntryProblem(
      "Your weight",
      "Enter a weight between 30 and 300 kg.",
    );

    // act
    await clientOnboarding.answerText("Your weight", "62");
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectEntryProblem(
      "Target weight",
      "Keep your goal within 60 kg of your current weight.",
    );

    // act
    await clientOnboarding.answerText("Target weight", "58");
    await answerWeekQuestions(clientOnboarding);
    await clientOnboarding.choose(PREVIOUS_PT_QUESTION, "Yes");
    await clientOnboarding.answerText(
      PREVIOUS_PT_FOLLOW_UP,
      "Weekly check-ins kept me going.",
    );
    await clientOnboarding.choose(PREVIOUS_PT_QUESTION, "No");

    // assert
    await clientOnboarding.expectQuestionHidden(PREVIOUS_PT_FOLLOW_UP);
    await clientOnboarding.expectSaved();
    await expect
      .poll(async () => (await onboardingRecords.draft())?.answers)
      .toMatchObject({
        "goal-availability": { previousPt: "No", weight: 62, goalWeight: 58 },
      });
    expect(
      (await onboardingRecords.draft())?.answers["goal-availability"],
    ).not.toHaveProperty("previousPtExperience");

    // act
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(2, 5);
    await clientOnboarding.expectStepHeadingFocused("A few safety questions");
    await clientOnboarding.expectConsentStatement(FEMALE_HEALTH_CONSENT);
    await clientOnboarding.expectPrivacyLink();

    // act
    for (const question of PARQ_QUESTIONS) {
      await clientOnboarding.choose(question, "No");
    }
    await clientOnboarding.tick(PARQ_DECLARATION);
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(2, 5);
    await clientOnboarding.expectConsentProblem();

    // act
    await clientOnboarding.tick(FEMALE_HEALTH_CONSENT);
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectScreeningCleared();
    await clientOnboarding.expectStep(3, 5);

    // act
    await clientOnboarding.tick("Pregnant");
    await clientOnboarding.tick("Breastfeeding");
    await clientOnboarding.tick("None of these");

    // assert
    await clientOnboarding.expectNotTicked("Pregnant");
    await clientOnboarding.expectNotTicked("Breastfeeding");
    await clientOnboarding.expectTicked("None of these");
    await clientOnboarding.expectSaved();
    await expect
      .poll(
        async () =>
          (await onboardingRecords.draft())?.answers["cycle-context"]
            ?.lifeStage,
      )
      .toEqual(["None of these"]);
    expect(await onboardingRecords.submissions()).toHaveLength(0);
  },
);

test(
  "a client who measures in pounds and inches sends her answers once, even after a failed send",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientOnboarding,
    onboardingRecords,
    page,
    provisionPaidClient,
    publicNav,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/");
    await publicNav.expectFinishOnboardingLink("/client/welcome");
    await page.goto("/client");
    await clientOnboarding.expectWelcomeIntro("four");
    await clientOnboarding.startOnboarding();

    // act
    await clientOnboarding.chooseUnits("lb · in");
    await clientOnboarding.answerText("Your weight", "700");
    await clientOnboarding.answerText("Your height", "20");
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(1, 4);
    await clientOnboarding.expectEntryProblem(
      "Your weight",
      "Enter a weight between 66 and 661 lb.",
    );
    await clientOnboarding.expectEntryProblem(
      "Your height",
      "Enter a height between 47 and 91 in.",
    );

    // act
    await clientOnboarding.answerText("Your weight", "150");
    await clientOnboarding.answerText("Your height", "70");
    await clientOnboarding.answerText("Target weight", "140");
    await answerWeekQuestions(clientOnboarding);

    // assert
    await clientOnboarding.expectSaved();
    await expect
      .poll(() => onboardingRecords.unitPreference())
      .toEqual({ weightUnit: "lb", heightUnit: "ft-in" });
    await expect
      .poll(async () => (await onboardingRecords.draft())?.answers)
      .toMatchObject({
        "goal-availability": { weight: 68.04, height: 178, goalWeight: 63.5 },
      });

    // act
    await page.reload();

    // assert
    await clientOnboarding.expectResumeNote();
    await clientOnboarding.expectUnits("lb · in");
    await clientOnboarding.expectAnswer("Your weight", "150");
    await clientOnboarding.expectAnswer("Your height", "70");
    await clientOnboarding.expectAnswer("Target weight", "140");

    // act
    await clientOnboarding.continueStep();
    for (const question of PARQ_QUESTIONS) {
      await clientOnboarding.choose(question, "No");
    }
    await clientOnboarding.tick(PARQ_DECLARATION);
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(2, 4);
    await clientOnboarding.expectConsentStatement(HEALTH_CONSENT);
    await clientOnboarding.expectConsentProblem();

    // act
    await clientOnboarding.tick(HEALTH_CONSENT);
    await clientOnboarding.continueStep();
    await clientOnboarding.expectStep(3, 4);
    await answerFoodAndDailyLife(clientOnboarding);
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(4, 4);
    await clientOnboarding.expectStepHeadingFocused("Your measurements");
    await clientOnboarding.expectEntryHint(
      "Waist",
      "Narrowest point, usually just above the belly button. Relaxed, don't pull the tape tight.",
    );
    await clientOnboarding.expectOptional("Hips");
    await clientOnboarding.expectEntryHint("Hips", "Widest point.");
    await clientOnboarding.expectOptional("Thigh");
    await clientOnboarding.expectEntryHint(
      "Thigh",
      "Mid-thigh, same leg every time.",
    );
    await clientOnboarding.expectOptional("Arm");
    await clientOnboarding.expectEntryHint("Arm", "Relaxed, mid-bicep.");
    await clientOnboarding.expectSendToCoach("disabled");

    // act
    await clientOnboarding.answerText("Waist", "30");
    await clientOnboarding.tick(PROGRESS_PHOTO_CONSENT);

    // assert
    await clientOnboarding.expectSendToCoach("disabled");

    // act
    await clientOnboarding.tick(DISCLAIMER);

    // assert
    await clientOnboarding.expectSendToCoach("enabled");

    // act
    await clientOnboarding.blockSubmissions();
    await clientOnboarding.sendToCoach();

    // assert
    await clientOnboarding.expectSubmitProblem();
    await clientOnboarding.expectStep(4, 4);
    await expect(page).toHaveURL(/\/client\/onboarding$/);
    expect(await onboardingRecords.submissions()).toHaveLength(0);
    expect(await onboardingRecords.onboardingSubmittedAt()).toBeNull();
    expect(await onboardingRecords.clientProfile()).toBeNull();
    expect(await onboardingRecords.draft()).not.toBeNull();

    // act
    await clientOnboarding.restoreConnection();
    await clientOnboarding.sendToCoach();

    // assert
    await expect(page).toHaveURL(/\/client$/);
    await clientDashboard.expectStatusCard(
      "Sent to your coach",
      workStartsOnLine(client.paidAt),
    );
    await clientDashboard.expectOnlyStartNowAction();
    const [submission] = await onboardingRecords.submissions();
    expect(await onboardingRecords.submissions()).toHaveLength(1);
    expect(submission.progressPhotosConsentedAt).toBeInstanceOf(Date);
    expect(submission.disclaimerConsentedAt).toBeInstanceOf(Date);
    expect(submission.specialCategoryConsentedAt).toBeInstanceOf(Date);
    expect(submission.answers["measurements"]).toEqual({ waist: 76 });
    expect(await onboardingRecords.measurements()).toEqual([
      {
        recordedAt: submission.submittedAt,
        weightKg: "68.04",
        waistCm: "76.0",
        hipsCm: null,
        thighCm: null,
        armCm: null,
      },
    ]);
    expect(await onboardingRecords.onboardingSubmittedAt()).toEqual(
      submission.submittedAt,
    );
    expect(await onboardingRecords.clientProfile()).toMatchObject({
      heightCm: "178.0",
      activityLevel: "Active",
      primaryGoal: "Lose fat",
      dietaryRestrictions: "None",
      clientNotes: null,
    });
    expect(await onboardingRecords.draft()).toBeNull();

    // act
    const secondSubmission = await page.request.post(SUBMISSION_API_PATH, {
      multipart: {
        submission: JSON.stringify({
          answers: submission.answers,
          consents: {
            specialCategoryAt: new Date().toISOString(),
            disclaimerAt: new Date().toISOString(),
            progressPhotosAt: null,
          },
        }),
      },
    });

    // assert
    expect(secondSubmission.status()).toBe(409);
    expect(await onboardingRecords.submissions()).toHaveLength(1);

    // act
    await page.goto("/client/welcome");

    // assert
    await expect(page).toHaveURL(/\/client$/);

    // act
    await page.goto("/");

    // assert
    await publicNav.expectPortalPillVisible("CLIENT");
  },
);

test(
  "a client who agrees to share progress photos sends front, side and back with her answers and finds them on her first entry",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientOnboarding,
    clientProfile,
    measurementRecords,
    measurementsSheet,
    page,
    photoView,
    provisionPaidClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionPaidClient("male");
    const today = dayMonthFormatter.format(new Date());
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await answerEverythingButPhotos(clientOnboarding);

    // assert
    await clientOnboarding.expectPhotosLocked();

    // act
    await clientOnboarding.agreeToPhotos();

    // assert
    await clientOnboarding.expectPhotosUnlocked();

    // act
    await clientOnboarding.addPhoto("front", samplePhotoOf("front"));
    await clientOnboarding.addPhoto("side", samplePhotoOf("side"));
    await clientOnboarding.addPhoto("back", samplePhotoOf("back"));

    // assert
    await clientOnboarding.expectPhotoPreview("front");
    await clientOnboarding.expectPhotoPreview("side");
    await clientOnboarding.expectPhotoPreview("back");

    // act
    const sentViews =
      await clientOnboarding.sendToCoachCapturingSentPhotoViews();

    // assert
    expect(sentViews).toEqual(["front", "side", "back"]);
    await expect(page).toHaveURL(/\/client$/);
    await clientDashboard.expectStatusCard(
      "Sent to your coach",
      workStartsOnLine(client.paidAt),
    );
    await clientDashboard.expectNoRefusedPhotoToast();
    expect(await measurementRecords.photos(client.clientId)).toEqual([
      { view: "back", mimeType: "image/jpeg" },
      { view: "front", mimeType: "image/jpeg" },
      { view: "side", mimeType: "image/jpeg" },
    ]);

    // act
    await clientProfile.open();
    await photoView.openFor(today);

    // assert
    await photoView.expectPhotos(["front", "side", "back"]);

    // act
    await photoView.close();
    await clientProfile.openAdd();

    // assert
    await measurementsSheet.expectConsentAlreadyGiven();
  },
);

test(
  "a client who takes back her photo consent before sending sends no photos",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientOnboarding,
    measurementRecords,
    onboardingRecords,
    page,
    provisionPaidClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await answerEverythingButPhotos(clientOnboarding);
    await clientOnboarding.agreeToPhotos();
    await clientOnboarding.addPhoto("front", samplePhotoOf("front"));
    await clientOnboarding.expectPhotoPreview("front");

    await clientOnboarding.withdrawFromPhotos();
    await clientOnboarding.expectPhotosLocked();

    // act
    const sentViews =
      await clientOnboarding.sendToCoachCapturingSentPhotoViews();

    // assert
    expect(sentViews).toEqual([]);
    await expect(page).toHaveURL(/\/client$/);
    await clientDashboard.expectStatusCard(
      "Sent to your coach",
      workStartsOnLine(client.paidAt),
    );
    await clientDashboard.expectNoRefusedPhotosCarried();
    await clientDashboard.expectNoRefusedPhotoToast();
    const [submission] = await onboardingRecords.submissions();
    expect(submission.progressPhotosConsentedAt).toBeNull();
    expect(await measurementRecords.photos(client.clientId)).toEqual([]);
  },
);

test(
  "a client who takes back her photo consent and agrees again starts from empty tiles and sends only what she picks afterwards",
  { tag: "@completeness" },
  async ({
    clientOnboarding,
    measurementRecords,
    page,
    provisionPaidClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await answerEverythingButPhotos(clientOnboarding);
    await clientOnboarding.agreeToPhotos();
    await clientOnboarding.addPhoto("front", samplePhotoOf("front"));
    await clientOnboarding.addPhoto("side", UNSUPPORTED_TYPE_PHOTO);
    await clientOnboarding.expectPhotoPreview("front");
    await clientOnboarding.expectPhotoRefusal();

    // act
    await clientOnboarding.withdrawFromPhotos();

    // assert
    await clientOnboarding.expectPhotosLocked();
    await clientOnboarding.expectNoPhotoRefusal();

    // act
    await clientOnboarding.agreeToPhotos();

    // assert
    await clientOnboarding.expectPhotosUnlocked();
    await clientOnboarding.expectNoPhotoPreview("front");
    await clientOnboarding.expectNoPhotoPreview("side");
    await clientOnboarding.expectNoPhotoPreview("back");
    await clientOnboarding.expectNoPhotoRefusal();

    // act
    await clientOnboarding.addPhoto("back", samplePhotoOf("back"));
    const sentViews =
      await clientOnboarding.sendToCoachCapturingSentPhotoViews();

    // assert
    expect(sentViews).toEqual(["back"]);
    await expect(page).toHaveURL(/\/client$/);
    expect(await measurementRecords.photos(client.clientId)).toEqual([
      { view: "back", mimeType: "image/jpeg" },
    ]);
  },
);

test(
  "a client's onboarding photo that cannot be processed is named once on her dashboard and her other photo is kept",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientOnboarding,
    measurementRecords,
    page,
    provisionPaidClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await answerEverythingButPhotos(clientOnboarding);
    await clientOnboarding.agreeToPhotos();

    // act
    await clientOnboarding.addPhoto("front", UNPROCESSABLE_PHOTO);
    await clientOnboarding.addPhoto("side", samplePhotoOf("side"));
    const sentViews =
      await clientOnboarding.sendToCoachCapturingSentPhotoViews();

    // assert
    expect(sentViews).toEqual(["front", "side"]);
    await expect(page).toHaveURL(/\/client$/);
    await clientDashboard.expectStatusCard(
      "Sent to your coach",
      workStartsOnLine(client.paidAt),
    );
    await clientDashboard.expectRefusedPhotoToast("front");
    await clientDashboard.expectNoRefusedPhotosCarried();
    expect(await measurementRecords.photos(client.clientId)).toEqual([
      { view: "side", mimeType: "image/jpeg" },
    ]);

    // act
    await clientDashboard.reload();

    // assert
    await clientDashboard.expectNoRefusedPhotosCarried();
    await clientDashboard.expectNoRefusedPhotoToast();

    // act
    await clientDashboard.open();

    // assert
    await clientDashboard.expectNoRefusedPhotoToast();
  },
);

test(
  "a client's unsent answers wait on her device and she picks up on another one",
  { tag: "@completeness" },
  async ({
    clientOnboarding,
    onboardingRecords,
    page,
    provisionPaidClient,
    publicNav,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await clientOnboarding.startOnboarding();
    await answerGoalFormInKilograms(clientOnboarding);
    await clientOnboarding.continueStep();
    await clientOnboarding.expectStep(2, 4);
    await clientOnboarding.expectSaved();

    // act
    await clientOnboarding.blockDraftSaves();
    await clientOnboarding.tick(HEALTH_CONSENT);
    await clientOnboarding.choose(PARQ_QUESTIONS[0], "No");

    // assert
    await clientOnboarding.expectUnsaved();
    expect(
      (await onboardingRecords.draft())?.answers["safety-screening"] ?? {},
    ).not.toHaveProperty("heartCondition");

    // act
    await page.reload();

    // assert
    await clientOnboarding.expectStep(2, 4);
    await clientOnboarding.expectTicked(HEALTH_CONSENT);
    await clientOnboarding.expectChosen(PARQ_QUESTIONS[0], "No");
    await clientOnboarding.expectUnsaved();

    // act
    await clientOnboarding.restoreConnection();

    // assert
    await clientOnboarding.expectSaved();
    await expect
      .poll(
        async () =>
          (await onboardingRecords.draft())?.answers["safety-screening"],
      )
      .toMatchObject({ heartCondition: "No" });

    // act
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/store");
    await publicNav.signOut();
    await signIn();
    await page.goto("/client");

    // assert
    await expect(page).toHaveURL(/\/client\/onboarding$/);
    await clientOnboarding.expectStep(2, 4);
    await clientOnboarding.expectResumeNote();
    await clientOnboarding.expectTicked(HEALTH_CONSENT);
    await clientOnboarding.expectChosen(PARQ_QUESTIONS[0], "No");
  },
);

test(
  "a client outside the safety questionnaire's age range only gives her consent",
  { tag: "@completeness" },
  async ({ clientOnboarding, page, provisionPaidClient, signIn }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionPaidClient("female", {
      dateOfBirth: OUTSIDE_SCREENING_AGE_DATE_OF_BIRTH,
    });
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await clientOnboarding.startOnboarding();
    await answerGoalFormInKilograms(clientOnboarding);

    // act
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(2, 5);
    await clientOnboarding.expectManualScreening();
    await clientOnboarding.expectConsentStatement(FEMALE_HEALTH_CONSENT);

    // act
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(2, 5);
    await clientOnboarding.expectConsentProblem();

    // act
    await clientOnboarding.tick(FEMALE_HEALTH_CONSENT);
    await clientOnboarding.continueStep();

    // assert
    await clientOnboarding.expectStep(3, 5);
  },
);

test(
  "a client answers the safety questions with the keyboard alone",
  { tag: "@completeness" },
  async ({ clientOnboarding, page, provisionPaidClient, signIn }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await clientOnboarding.startOnboarding();
    await clientOnboarding.expectOnePageHeading();
    await answerGoalFormInKilograms(clientOnboarding);
    await clientOnboarding.continueStep();
    await clientOnboarding.expectStepHeadingFocused("A few safety questions");
    await clientOnboarding.expectStepHeadingDescribed(
      "A few safety questions",
      2,
      4,
    );

    // act
    await clientOnboarding.keyboardContinue();

    // assert
    await clientOnboarding.expectStep(2, 4);
    await clientOnboarding.expectConsentProblem();
    await clientOnboarding.expectChoiceProblem(
      PARQ_QUESTIONS[0],
      "Choose one option.",
    );

    // act
    await clientOnboarding.keyboardTick(HEALTH_CONSENT);
    for (const question of PARQ_QUESTIONS) {
      await clientOnboarding.keyboardChoose(question, "No");
    }
    await clientOnboarding.keyboardTick(PARQ_DECLARATION);
    await clientOnboarding.keyboardContinue();

    // assert
    await clientOnboarding.expectScreeningCleared();
    await clientOnboarding.expectStep(3, 4);
    await clientOnboarding.expectStepHeadingFocused("Food and daily life");
    await clientOnboarding.expectStepHeadingDescribed(
      "Food and daily life",
      3,
      4,
    );
    await clientOnboarding.expectOnePageHeading();
  },
);

test(
  "the onboarding draft is refused to a coach and to a visitor who is not signed in",
  { tag: "@completeness" },
  async ({ page, playwright, provisionAccount, signIn }) => {
    // arrange
    const draft = {
      formId: "goal-availability",
      answers: {},
      currentFormIndex: 0,
      consents: {
        specialCategoryAt: null,
        disclaimerAt: null,
        progressPhotosAt: null,
      },
    };
    const visitor = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
    });

    // act
    const visitorSave = await visitor.put(DRAFT_API_PATH, { data: draft });

    // assert
    expect(visitorSave.status()).toBe(401);

    // arrange
    await visitor.dispose();
    await provisionAccount("COACH");
    await page.goto("/store");
    await signIn();

    // act
    const coachSave = await page.request.put(DRAFT_API_PATH, { data: draft });

    // assert
    expect(coachSave.status()).toBe(403);
  },
);

test(
  "a client answers the next question right after picking the day her last period started",
  { tag: "@completeness" },
  async ({ clientOnboarding, page, provisionPaidClient, signIn }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionPaidClient("female");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await clientOnboarding.startOnboarding();
    await answerGoalFormInKilograms(clientOnboarding);
    await clientOnboarding.continueStep();
    await clearSafetyScreening(clientOnboarding, FEMALE_HEALTH_CONSENT);
    await clientOnboarding.continueStep();
    await clientOnboarding.expectStep(3, 5);
    await clientOnboarding.choose(
      "Do you currently get a period?",
      "Yes, and it's regular",
    );
    await clientOnboarding.choose("Are you using any contraception?", "None");
    await clientOnboarding.tick("None of these");
    await clientOnboarding.choose(
      "Are you in perimenopause or menopause?",
      "No",
    );

    // act
    await clientOnboarding.pickDate(
      "The day your last period started",
      isoDaysAgo(LAST_PERIOD_DAYS_AGO),
    );
    await clientOnboarding.clickChoice(GYNAECOLOGICAL_QUESTION, "No");

    // assert
    await clientOnboarding.expectChosen(GYNAECOLOGICAL_QUESTION, "No");

    // act
    await clientOnboarding.pickDate(
      "The day your last period started",
      isoDaysAgo(LAST_PERIOD_DAYS_AGO + 1),
    );
    await clientOnboarding.choose(GYNAECOLOGICAL_QUESTION, "Yes");

    // assert
    await clientOnboarding.expectChosen(GYNAECOLOGICAL_QUESTION, "Yes");
  },
);

test(
  "a client's units stay chosen when saving them fails the first time",
  { tag: "@completeness" },
  async ({
    clientOnboarding,
    onboardingRecords,
    page,
    provisionPaidClient,
    signIn,
  }) => {
    // arrange
    await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await clientOnboarding.startOnboarding();
    await clientOnboarding.blockUnitPreference();

    // act
    await clientOnboarding.chooseUnits("lb · in");

    // assert
    await clientOnboarding.expectUnsaved();
    expect(await onboardingRecords.unitPreference()).toBeNull();

    // act
    await clientOnboarding.answerText("Your weight", "150");

    // assert
    await clientOnboarding.expectSaved();
    await expect
      .poll(() => onboardingRecords.unitPreference())
      .toEqual({ weightUnit: "lb", heightUnit: "ft-in" });

    // act
    await clientOnboarding.restoreConnection();
    await page.reload();

    // assert
    await clientOnboarding.expectUnits("lb · in");
    await clientOnboarding.expectAnswer("Your weight", "150");
  },
);

test(
  "a client's unsaved units come back on reload and are saved once she is online",
  { tag: "@completeness" },
  async ({
    clientOnboarding,
    onboardingRecords,
    page,
    provisionPaidClient,
    signIn,
  }) => {
    // arrange
    await provisionPaidClient("male");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");
    await clientOnboarding.startOnboarding();
    await clientOnboarding.keepUnitPreferenceOffline();

    // act
    await clientOnboarding.chooseUnits("lb · in");
    await clientOnboarding.expectUnsaved();
    await page.reload();

    // assert
    await clientOnboarding.expectUnits("lb · in");
    await clientOnboarding.expectUnsaved();
    expect(await onboardingRecords.unitPreference()).toBeNull();

    // act
    await clientOnboarding.restoreConnection();

    // assert
    await clientOnboarding.expectSaved();
    await expect
      .poll(() => onboardingRecords.unitPreference())
      .toEqual({ weightUnit: "lb", heightUnit: "ft-in" });

    // act
    await page.reload();

    // assert
    await clientOnboarding.expectUnits("lb · in");
  },
);
