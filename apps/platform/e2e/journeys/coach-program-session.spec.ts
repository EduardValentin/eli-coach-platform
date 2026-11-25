import { test } from "../support/fixtures";
import { SESSION_LIBRARY, WARM_UP_LIBRARY } from "../support/session-library";

const JOURNEY_TIMEOUT_MS = 300_000;
const DESKTOP_VIEWPORT = { width: 1440, height: 2400 };

test.use({ trace: "on" });

test(
  "the coach fills a session from her library, reloads, and finds the client's Program card counting it",
  { tag: "@critical" },
  async ({
    coachClient,
    exerciseRequests,
    libraryPanel,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    sessionCard,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await exerciseRequests.createManyAccepted([
      ...SESSION_LIBRARY,
      ...WARM_UP_LIBRARY,
    ]);
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await sessionCard.openFirstStrengthDay();

    // act
    await sessionCard.openLibraryFor("A · Main lift");
    await libraryPanel.add("Back squat");
    await sessionCard.openLibraryFor("C · Accessories");
    await libraryPanel.add("Lateral raise");
    await sessionCard.openLibraryForWarmUp();
    await libraryPanel.add("Hip circles");

    // assert
    await programBuilder.expectAnnounced(
      "Hip circles added to Full Body A · Warm-up",
    );
    await sessionCard.expectCardLabels(["A Back squat", "C Lateral raise"]);
    await sessionCard.expectWarmUp(["Hip circles"]);
    await programBuilder.expectSaved();

    // act
    await page.reload();
    await sessionCard.openFirstStrengthDay();

    // assert
    await sessionCard.expectCardLabels(["A Back squat", "C Lateral raise"]);
    await sessionCard.expectWarmUp(["Hip circles"]);

    // act
    await programBuilder.goBackToClient(client.fullName);

    // assert
    await coachClient.expectProgramCardBlock("Hypertrophy", "1 of 3 sessions");
  },
);
