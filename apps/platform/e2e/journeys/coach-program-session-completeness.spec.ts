import { expect, test } from "../support/fixtures";
import { setPhoneViewport } from "../support/viewport";
import { SESSION_LIBRARY } from "../support/session-library";

const JOURNEY_TIMEOUT_MS = 300_000;

test.use({ trace: "on" });

test(
  "the coach fills a session from her library by button, keyboard and drag, and finds it after a reload and on the client's Program card",
  { tag: "@completeness" },
  async ({
    coachClient,
    exerciseRequests,
    page,
    programBuilder,
    programSession,
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
    await exerciseRequests.createManyAccepted(SESSION_LIBRARY);
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await page.setViewportSize({ width: 1440, height: 2400 });
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await programSession.openFirstStrengthDay();

    // act
    await programSession.addFromLibrary("A · Main lift", "Back squat");
    await programSession.addFromLibrary("C · Accessories", "Lateral raise");
    await programSession.addFromLibrary("C · Accessories", "Calf raise");

    // assert
    await programSession.expectCardLabels([
      "A Back squat",
      "C Lateral raise",
      "C Calf raise",
    ]);

    // act
    await programSession.chooseFromActions(
      "Lateral raise",
      "Superset with next",
    );

    // assert
    await programSession.expectAnnounced(
      "Lateral raise and Calf raise grouped as a superset",
    );
    await programSession.expectActionsFocused("Lateral raise");
    await programSession.expectSuperset("C1 and C2");

    // act
    await programSession.ungroupByKeyboard("C1 and C2");

    // assert
    await programSession.expectAnnounced("C1 and C2 ungrouped");

    // act
    await programSession.chooseFromActions("Calf raise", "Move up");

    // assert
    await programSession.expectAnnounced("Calf raise moved up");
    await programSession.expectActionsFocused("Calf raise");

    // act
    await programSession.dragLibraryExerciseOnto("Plank", "card", "Calf raise");

    // assert
    await programSession.expectSuperset("C1 and C2");
    await programBuilder.expectSaved();

    // act
    await page.reload();
    await programSession.openFirstStrengthDay();

    // assert
    await programSession.expectCardLabels([
      "A Back squat",
      "C1 Calf raise",
      "C2 Plank",
      "C Lateral raise",
    ]);

    // act
    await programBuilder.goBackToClient(client.fullName);

    // assert
    await programSession.expectProgramCardBlock(
      "Hypertrophy",
      "1 of 3 sessions",
    );
  },
);

test(
  "on a phone the library opens as a drawer that says what it is adding to, closes after an add, and the client's profile is in Draft actions",
  { tag: "@completeness" },
  async ({
    coachClient,
    exerciseRequests,
    page,
    programBuilder,
    programSession,
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
    await exerciseRequests.createManyAccepted(SESSION_LIBRARY);
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await setPhoneViewport(page);
    await programBuilder.openSectionsDrawer();
    await programBuilder.openBlockFromDrawer(2, "Hypertrophy");
    await page.getByRole("button", { name: "Open session" }).click();

    // act
    await page
      .getByRole("button", {
        name: /^Add or drop an exercise.* in A · Main lift/,
      })
      .click();

    // assert
    await programSession.expectLibraryDrawerOpen();
    await programSession.expectLibraryAddingTo("Full Body A · A Main lift");
    await programSession.expectFiltersButton("Filters, 1 active");

    // act
    await programSession.searchLibrary("zzz");

    // assert
    await programSession.expectNoMatchChips([
      "Search: “zzz”",
      "Only her equipment",
    ]);

    // act
    await programSession.removeFilterChip("Search: “zzz”");
    await page
      .getByRole("button", { name: "Add Back squat", exact: true })
      .click();

    // assert
    await programSession.expectLibraryDrawerClosed();
    await programSession.expectAnnounced(
      "Back squat added to Full Body A · A Main lift",
    );
    await programSession.expectCardLabels(["A Back squat"]);

    // act
    await programSession.openClientProfileFromDraftActions();

    // assert
    await programSession.expectClientProfile(["Goal", "Lose fat", "Equipment"]);
  },
);
