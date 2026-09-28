import { expect, test } from "../support/fixtures";

const JOURNEY_TIMEOUT_MS = 240_000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const LAST_PERIOD_DAYS_AGO = 10;
const WORK_STARTS_DAYS_AFTER_PAYMENT = 14;

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function workStartsOnLine(paidAt: Date): string {
  const workStartsOn = new Date(
    paidAt.getTime() + WORK_STARTS_DAYS_AFTER_PAYMENT * MILLISECONDS_PER_DAY,
  );

  return `Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on ${dayMonthFormatter.format(workStartsOn)}. Your program will be delivered as soon as it is completed.`;
}

test("a female client completes her onboarding in five parts", async ({
  clientDashboard,
  clientOnboarding,
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
  await clientOnboarding.choose("Are you in perimenopause or menopause?", "No");
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
  await clientOnboarding.choose("Do you get energy dips during the day?", "No");
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

  // act
  await page.goto("/client/onboarding");

  // assert
  await expect(page).toHaveURL(/\/client$/);

  // act
  await page.goto("/");

  // assert
  await publicNav.expectPortalPillVisible("CLIENT");
});

test("a client who prefers not to say sees the four-part onboarding", async ({
  clientOnboarding,
  page,
  provisionPaidClient,
  signIn,
}) => {
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
});
