import { test } from "../support/fixtures";
import { BONE_OR_JOINT_PROBLEM_LIST } from "../support/submitted-clients";
import { setDesktopViewport, setPhoneViewport } from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 300_000;

test.use({ trace: "on" });

test(
  "the client's profile in the builder gives her goal, equipment, training place, days, minutes and limitations by copy, from the top bar on a desktop and from Draft actions on a phone",
  { tag: "@completeness" },
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
    await setDesktopViewport(page);
    const facts = {
      Goal: "Lose fat",
      Equipment: "Full gym, Dumbbells",
      Place: "Gym",
      "Days per week": "3 days",
      "Minutes per session": "60 min",
      Limitations: BONE_OR_JOINT_PROBLEM_LIST,
    };

    // act
    await programBuilder.openClientProfile();

    // assert
    await programBuilder.expectClientProfile(client.fullName, facts);

    // act
    await programBuilder.closeClientProfile(client.fullName);
    await setPhoneViewport(page);
    await programBuilder.openClientProfileFromDraftActions();

    // assert
    await programBuilder.expectClientProfile(client.fullName, facts);
  },
);
