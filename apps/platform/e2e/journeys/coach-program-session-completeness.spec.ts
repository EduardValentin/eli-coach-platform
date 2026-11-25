import { expect, test } from "../support/fixtures";
import { expectLayoutFits } from "../support/layout-fit";
import { SESSION_LIBRARY, WARM_UP_LIBRARY } from "../support/session-library";
import { setPhoneViewport, setTallDesktopViewport } from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 300_000;
const OTHER_SQUATS = ["Front squat", "Goblet squat", "Hack squat"] as const;

function squatOutside(held: readonly string[]): string {
  const found = OTHER_SQUATS.find((squat) => !held.includes(squat));

  if (!found) throw new Error("There is no squat left to add.");

  return found;
}

test.use({ trace: "on" });

test(
  "the coach groups exercises into a superset and moves them by keyboard, drops one from the library, and finds the session after a reload",
  { tag: "@completeness" },
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
    await exerciseRequests.createManyAccepted(SESSION_LIBRARY);
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await setTallDesktopViewport(page);
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await sessionCard.openFirstStrengthDay();
    await sessionCard.openLibraryFor("A · Main lift");
    await libraryPanel.add("Back squat");
    await sessionCard.openLibraryFor("C · Accessories");
    await libraryPanel.add("Lateral raise");
    await libraryPanel.add("Calf raise");

    // act
    await sessionCard.chooseFromActions("Lateral raise", "Superset with next");

    // assert
    await programBuilder.expectAnnounced(
      "Lateral raise and Calf raise grouped as a superset",
    );
    await sessionCard.expectActionsFocused("Lateral raise");
    await sessionCard.expectSuperset("C1 and C2");

    // act
    await sessionCard.ungroupByKeyboard("C1 and C2");

    // assert
    await programBuilder.expectAnnounced("C1 and C2 ungrouped");

    // act
    await sessionCard.chooseFromActions("Calf raise", "Move up");

    // assert
    await programBuilder.expectAnnounced("Calf raise moved up");
    await sessionCard.expectActionsFocused("Calf raise");

    // act
    await libraryPanel.dragOnto("Plank", sessionCard.cardOf("Calf raise"));

    // assert
    await sessionCard.expectSuperset("C1 and C2");
    await sessionCard.expectCardLabels([
      "A Back squat",
      "C1 Calf raise",
      "C2 Plank",
      "C Lateral raise",
    ]);
    await programBuilder.expectSaved();
    await expectLayoutFits(page);

    // act
    await page.reload();
    await sessionCard.openFirstStrengthDay();

    // assert
    await sessionCard.expectCardLabels([
      "A Back squat",
      "C1 Calf raise",
      "C2 Plank",
      "C Lateral raise",
    ]);
  },
);

test(
  "the coach reads an exercise's suggested substitutions, removes one and has them suggested again, and builds the cool-down once it is on",
  { tag: "@completeness" },
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
    await exerciseRequests.createManyAccepted(SESSION_LIBRARY);
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await setTallDesktopViewport(page);
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await sessionCard.openFirstStrengthDay();
    await sessionCard.openLibraryFor("A · Main lift");
    await libraryPanel.add("Back squat");

    // act
    await sessionCard.openDetails("Back squat");

    // assert
    await sessionCard.expectSubstitutionCount("Back squat", 2);

    // act
    const [kept, removed] = await sessionCard.substitutionNames("Back squat");
    await sessionCard.removeSubstitution("Back squat", removed);

    // assert
    await sessionCard.expectSubstitutionCount("Back squat", 1);
    expect(await sessionCard.substitutionNames("Back squat")).toEqual([kept]);

    // act
    await sessionCard.suggestSubstitutions("Back squat");

    // assert
    await sessionCard.expectSubstitutionCount("Back squat", 2);

    // act
    await sessionCard.switchCoolDownOn();
    await sessionCard.openLibraryForCoolDown();

    // assert
    await libraryPanel.expectAddingTo("Full Body A · Cool-down");
    await libraryPanel.expectType("Stretching");

    // act
    await libraryPanel.add("Couch stretch");

    // assert
    await sessionCard.expectCoolDown(["Couch stretch"]);
    await programBuilder.expectSaved();

    // act
    await page.reload();
    await sessionCard.openFirstStrengthDay();

    // assert
    await sessionCard.expectCoolDown(["Couch stretch"]);
  },
);

test(
  "an add the session refuses is announced as refused, not as added: a repeat in the warm-up or cool-down, and a fifth warm-up exercise",
  { tag: "@completeness" },
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
    await setTallDesktopViewport(page);
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await sessionCard.openFirstStrengthDay();
    await sessionCard.openLibraryForWarmUp();
    await libraryPanel.add("Hip circles");
    await programBuilder.expectAnnounced(
      "Hip circles added to Full Body A · Warm-up",
    );

    // act
    await libraryPanel.add("Hip circles");

    // assert
    await programBuilder.expectAnnounced(
      "Hip circles is already in the warm-up",
    );

    // act
    await libraryPanel.add("Cat cow");
    await libraryPanel.add("Thoracic rotation");
    await libraryPanel.add("Ankle rocks");
    await libraryPanel.add("Leg swings");

    // assert
    await programBuilder.expectAnnounced(
      "Leg swings not added: the warm-up holds four exercises",
    );
    await sessionCard.expectWarmUp([
      "Hip circles",
      "Cat cow",
      "Thoracic rotation",
      "Ankle rocks",
    ]);

    // act
    await sessionCard.switchCoolDownOn();
    await sessionCard.openLibraryForCoolDown();
    await libraryPanel.add("Couch stretch");
    await libraryPanel.add("Couch stretch");

    // assert
    await programBuilder.expectAnnounced(
      "Couch stretch is already in the cool-down",
    );
    await sessionCard.expectCoolDown(["Couch stretch"]);
  },
);

test(
  "a substitution the exercise cannot take is announced as refused: the exercise itself, one it already has, or a third",
  { tag: "@completeness" },
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
    await exerciseRequests.createManyAccepted(SESSION_LIBRARY);
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await setTallDesktopViewport(page);
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await sessionCard.openFirstStrengthDay();
    await sessionCard.openLibraryFor("A · Main lift");
    await libraryPanel.add("Back squat");
    await sessionCard.openDetails("Back squat");
    const [kept, removed] = await sessionCard.substitutionNames("Back squat");
    const third = squatOutside([kept, removed]);
    await sessionCard.removeSubstitution("Back squat", removed);
    await sessionCard.openLibraryForSubstitution("Back squat");
    await libraryPanel.expectAddingSubstitutionFor("Back squat");

    // act
    await libraryPanel.add("Back squat");

    // assert
    await programBuilder.expectAnnounced(
      "Back squat can’t be its own substitution",
    );

    // act
    await libraryPanel.add(kept);

    // assert
    await programBuilder.expectAnnounced(
      `${kept} is already one of its substitutions`,
    );

    // act
    await libraryPanel.add(removed);

    // assert
    await programBuilder.expectAnnounced(
      `${removed} added to the substitutions for Back squat`,
    );
    await sessionCard.expectSubstitutionCount("Back squat", 2);

    // act
    await libraryPanel.add(third);

    // assert
    await programBuilder.expectAnnounced(
      `${third} not added: an exercise holds two substitutions`,
    );
    await sessionCard.expectSubstitutionCount("Back squat", 2);
  },
);

test(
  "the library counts its filters, shows the ones that leave nothing as chips she can remove, and tells an empty type from no matches",
  { tag: "@completeness" },
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
    await exerciseRequests.createManyAccepted(SESSION_LIBRARY);
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await setTallDesktopViewport(page);
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await sessionCard.openFirstStrengthDay();
    await libraryPanel.expectPaneOpen();

    // assert
    await libraryPanel.expectFiltersButton("Filters, 1 active");

    // act
    await libraryPanel.search("zzz");

    // assert
    await libraryPanel.expectNoMatches();
    await libraryPanel.expectActiveFilterChips([
      "Search: “zzz”",
      "Only her equipment",
    ]);

    // act
    await libraryPanel.removeFilterChip("Search: “zzz”");

    // assert
    await libraryPanel.expectFiltersButton("Filters, 1 active");

    // act
    await libraryPanel.openFilters();
    await libraryPanel.switchFilter("Only her equipment");
    await libraryPanel.closeFilters();

    // assert
    await libraryPanel.expectFiltersButton("Filters");

    // act
    await libraryPanel.chooseType("Cardio");

    // assert
    await libraryPanel.expectEmptyType("Cardio");

    // act
    await libraryPanel.chooseType("Resistance");
    await libraryPanel.search("zzz");
    await libraryPanel.clearFiltersFromNoMatches();

    // assert
    await libraryPanel.expectFiltersButton("Filters");
  },
);

test(
  "on a phone the library opens as a drawer that says what it is adding to, closes after an add, and stays open when an add is refused",
  { tag: "@completeness" },
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
    await setPhoneViewport(page);
    await programBuilder.openSectionsDrawer();
    await programBuilder.openBlockFromDrawer(2, "Hypertrophy");
    await programBuilder.chooseDayTab("Tuesday");

    // assert
    await programBuilder.expectNoOpenSessionOffered();

    // act
    await programBuilder.chooseDayTab("Monday");
    await sessionCard.openSessionOfChosenDay();
    await sessionCard.openLibraryFor("A · Main lift");

    // assert
    await libraryPanel.expectDrawerOpen();
    await libraryPanel.expectAddingTo("Full Body A · A Main lift");
    await libraryPanel.expectFiltersButton("Filters, 1 active");

    // act
    await libraryPanel.search("zzz");

    // assert
    await libraryPanel.expectActiveFilterChips([
      "Search: “zzz”",
      "Only her equipment",
    ]);

    // act
    await libraryPanel.removeFilterChip("Search: “zzz”");
    await libraryPanel.add("Back squat");

    // assert
    await libraryPanel.expectDrawerClosed();
    await programBuilder.expectAnnounced(
      "Back squat added to Full Body A · A Main lift",
    );
    await sessionCard.expectCardLabels(["A Back squat"]);
    await expectLayoutFits(page);

    // act
    await sessionCard.openLibraryForWarmUp();
    await libraryPanel.add("Hip circles");
    await sessionCard.openLibraryForWarmUp();
    await libraryPanel.add("Hip circles");

    // assert
    await libraryPanel.expectDrawerOpen();

    // act
    await libraryPanel.closeDrawer();

    // assert
    await programBuilder.expectAnnounced(
      "Hip circles is already in the warm-up",
    );
  },
);
