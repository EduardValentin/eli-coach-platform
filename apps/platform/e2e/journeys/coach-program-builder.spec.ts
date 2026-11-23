import { test } from "../support/fixtures";

const JOURNEY_TIMEOUT_MS = 240_000;

test(
  "the coach reshapes a plan, reloads and finds it as she left it",
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
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);

    // act
    await programBuilder.moveBlockUpByKeyboard("Hypertrophy");
    await programBuilder.addProposedBlock();
    await programBuilder.expectOnBlock(4, "Hypertrophy");
    await programBuilder.chooseTrainingDays("4 days");
    await programBuilder.makeRestDay("Monday");
    await programBuilder.expectSaved();
    await page.reload();

    // assert
    await programBuilder.expectOnBlock(4, "Hypertrophy");
    await programBuilder.expectTrainingDays("4 days");
    await programBuilder.expectDay("Monday", "Rest");

    // act
    await programBuilder.openOverview();

    // assert
    await programBuilder.expectPlan([
      { type: "Hypertrophy", weeks: "6" },
      { type: "Foundation", weeks: "4" },
      { type: "Deload", weeks: "1" },
      { type: "Hypertrophy", weeks: "4" },
    ]);

    // act
    await programBuilder.goBackToClient(client.fullName);
    await coachClient.continueDraft();

    // assert
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
  },
);
