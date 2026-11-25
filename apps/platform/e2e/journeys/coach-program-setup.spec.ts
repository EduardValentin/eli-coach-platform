import { test } from "../support/fixtures";
import type { ProgramSetupChoices } from "../support/program-setup-page";

const JOURNEY_TIMEOUT_MS = 180_000;

const PREFILLED_FROM_HER_PROFILE: ProgramSetupChoices = {
  goal: "Fat loss",
  level: "Beginner",
  trainingDays: "3 days",
  split: "Full Body",
  sessionLength: "60 min",
  dailySteps: "6,000",
  equipment: ["Full gym", "Dumbbells"],
  language: "English",
};

test(
  "the coach builds a program for an approved client, lands in its builder and finds the draft on her page",
  { tag: "@critical" },
  async ({
    coachClient,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // act
    await coachClient.buildProgram();

    // assert
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.expectChoices(PREFILLED_FROM_HER_PROFILE);

    // act
    await programSetup.chooseTrainingDays("4 days");

    // assert
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "4 days",
      split: "Upper / Lower",
    });

    // act
    await programSetup.create();

    // assert
    await programBuilder.expectOpenFor(client.fullName, client.clientId);

    // act
    await programBuilder.goBackToClient(client.fullName);

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: [
        { label: "Foundation · 4 wk", sessions: "0 of 4 sessions" },
        { label: "Hypertrophy · 6 wk", sessions: "0 of 4 sessions" },
        { label: "Deload · 1 wk", sessions: "0 of 4 sessions" },
      ],
      stillMissing: ["12 sessions without exercises"],
    });
  },
);
