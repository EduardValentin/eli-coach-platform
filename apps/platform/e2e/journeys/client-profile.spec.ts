import { test } from "../support/fixtures";
import { profilePictureSample } from "../support/sample-photos";
import {
  BONE_OR_JOINT_PROBLEM_LIST,
  SEEDED_PREFERENCE_READINGS,
} from "../support/submitted-clients";

const JOURNEY_TIMEOUT_MS = 240_000;
const EMAIL_REASON = "Why the email can't be changed";
const PREFERENCES_REASON = "Your coach changes these for you for now.";
const COACH_RENAMED_LAST_NAME = "Marinescu";
const CLIENT_RENAMED_LAST_NAME = "Ionescu";
const COACH_NOTE = "Prefers morning sessions, keep the shoulder work light.";
const CLIENT_LIMITATIONS = "Left knee twinges on deep squats.";

test(
  "the coach edits a client's details and coaching facts section by section and gives her a profile picture",
  { tag: "@critical" },
  async ({
    coachClient,
    coachClientProfile,
    page,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting", "approved");
    const renamed = {
      ...client,
      fullName: `${client.firstName} ${COACH_RENAMED_LAST_NAME}`,
    };
    const about = coachClientProfile.about(client.gender);
    const { coaching, preferences } = coachClientProfile;
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectProfile(client.clientId, {
      Gender: "Female",
      Country: "Romania",
      Phone: "—",
      Email: client.email,
    });
    await coachClient.expectStatus("Approved");
    await coachClient.expectOnboardingCollapsed();
    await coachClient.expectHeaderInitials(client.fullName);

    // act
    await coachClient.openProfile();

    // assert
    await coachClientProfile.expectOpen(client);
    await coachClientProfile.avatar(client.fullName).expectInitials();
    await about.expectText("First name", client.firstName);
    await about.expectText("Last name", client.lastName);
    await about.expectReadOnly(client.email, EMAIL_REASON);
    await coaching.expectChosen("Training days per week", "3 days");
    await coaching.expectText("Limitations", BONE_OR_JOINT_PROBLEM_LIST);
    await coaching.expectText("Coach notes", "");
    await preferences.expectReadings(SEEDED_PREFERENCE_READINGS);

    // act
    await about.fillText("Last name", COACH_RENAMED_LAST_NAME);
    await about.save();
    await coaching.choose("Training days per week", "4 days");
    await coaching.fillText("Coach notes", COACH_NOTE);
    await coaching.save();
    await page.reload();

    // assert
    await coachClientProfile.expectOpen(renamed);
    await about.expectText("Last name", COACH_RENAMED_LAST_NAME);
    await coaching.expectChosen("Training days per week", "4 days");
    await coaching.expectText("Coach notes", COACH_NOTE);
    await coaching.expectText("Limitations", BONE_OR_JOINT_PROBLEM_LIST);

    // act
    await coachClientProfile
      .avatar(renamed.fullName)
      .upload(await profilePictureSample());

    // assert
    await coachClientProfile.avatar(renamed.fullName).expectPicture();

    // act
    await coachClientProfile.backToClient(renamed);

    // assert
    await coachClient.expectHeaderPicture(renamed.fullName);

    // act
    await coachClient.openProfile();
    await coachClientProfile.avatar(renamed.fullName).remove();

    // assert
    await coachClientProfile.avatar(renamed.fullName).expectInitials();

    // act
    await coachClientProfile.backToClient(renamed);

    // assert
    await coachClient.expectHeaderInitials(renamed.fullName);
  },
);

test(
  "a client edits who she is and her training, sets her picture, reads what her coach keeps and her check-in preferences, and her coach sees her changes",
  { tag: "@critical" },
  async ({
    clientPortalShell,
    clientProfile,
    clientSettings,
    coachClientProfile,
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
    const client = await provisionSubmittedClient("waiting", "approved");
    const renamed = {
      ...client,
      fullName: `${client.firstName} ${CLIENT_RENAMED_LAST_NAME}`,
    };
    const { aboutYou, training } = clientProfile;
    await page.goto("/store");
    await signIn();

    // act
    await clientProfile.open();

    // assert
    await clientProfile.expectOpen();
    await clientProfile.avatar(client.fullName).expectInitials();
    await aboutYou.expectText("First name", client.firstName);
    await aboutYou.expectText("Last name", client.lastName);
    await aboutYou.expectReadOnly(client.email, EMAIL_REASON);
    await training.expectAmount("Height", "165");
    await training.expectChosen("Training days per week", "3 days");
    await training.expectChosen("Minutes per session", "60 min");
    await training.expectTicked(["Full gym", "Dumbbells"]);
    await training.expectChosen("Training place", "Gym");
    await training.expectText("Limitations", BONE_OR_JOINT_PROBLEM_LIST);
    await clientProfile.expectCoachFacts({
      Gender: "Female",
      Level: "Beginner",
      "Primary goal": "Lose fat",
      "Goal weight": "62 kg",
      "Lifestyle activity level": "Mostly sitting",
      "Cycle mode": "Adapted to symptoms",
      "Dietary restrictions": "Lactose, mild",
    });

    // act
    await aboutYou.fillText("Last name", CLIENT_RENAMED_LAST_NAME);
    await aboutYou.save();
    await training.choose("Training place", "Home");
    await training.fillText("Limitations", CLIENT_LIMITATIONS);
    await training.save();
    await page.reload();

    // assert
    await clientProfile.expectOpen();
    await aboutYou.expectText("Last name", CLIENT_RENAMED_LAST_NAME);
    await training.expectChosen("Training place", "Home");
    await training.expectText("Limitations", CLIENT_LIMITATIONS);
    await clientPortalShell.expectSidebarWithoutPicture(renamed.fullName);

    // act
    await clientProfile
      .avatar(renamed.fullName)
      .upload(await profilePictureSample());

    // assert
    await clientProfile.avatar(renamed.fullName).expectPicture();
    await clientPortalShell.expectSidebarPicture(renamed.fullName);

    // act
    await clientSettings.open();

    // assert
    await clientSettings.preferences.expectReadings(SEEDED_PREFERENCE_READINGS);
    await clientSettings.preferences.expectReason(PREFERENCES_REASON);

    // act
    await page.goto("/");
    await publicNav.signOut();
    await signInAsCoach();
    await coachClientProfile.open(client.clientId);

    // assert
    await coachClientProfile.expectOpen(renamed);
    await coachClientProfile.avatar(renamed.fullName).expectPicture();
    await coachClientProfile
      .about(client.gender)
      .expectText("Last name", CLIENT_RENAMED_LAST_NAME);
    await coachClientProfile.coaching.expectChosen("Training place", "Home");
    await coachClientProfile.coaching.expectText(
      "Limitations",
      CLIENT_LIMITATIONS,
    );
  },
);
