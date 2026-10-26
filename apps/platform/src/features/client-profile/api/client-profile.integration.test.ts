import sharp from "sharp";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  ApiIntegrationTestSuite,
  CLIENT_MEDIA_KEY_ID,
} from "~integration-test-config/api-integration-test-suite";
import { ClientOnboardingJourney } from "~integration-test-config/client-onboarding-journey";
import {
  ClientProfileJourney,
  coachAvatarApi,
  coachIdentityApi,
  coachProfileApi,
  OWN_AVATAR_API,
  OWN_IDENTITY_API,
  OWN_PROFILE_API,
  type AvatarPart,
} from "~integration-test-config/client-profile-journey";
import {
  ANA,
  CoachingSalesJourney,
  SECOND_PURCHASE,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";
import {
  cameraJpegWithOrientationAndLocation,
  landscapePng,
} from "~integration-test-config/sample-images";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const profiles = new ClientProfileJourney(rig);

const OWNER: AccountSession = {
  sessionId: "sess_profile_owner",
  subjectId: "user_profile_owner",
};

const STRANGER: AccountSession = {
  sessionId: "sess_profile_stranger",
  subjectId: "user_profile_stranger",
};

const MARIA: Visitor = {
  email: "maria.profile@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const EDITED_AT = new Date("2026-10-26T10:00:00.000Z");

const PROFILE_PAGE = "/client/profile";
const SETTINGS_PAGE = "/client/settings";

const SEEDED_COACHING = {
  heightCm: 165,
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: ["Full gym", "Dumbbells"],
  trainingPlace: "Gym",
  limitations: "Right shoulder aches on overhead pressing.",
  level: "beginner",
  primaryGoal: "Lose fat",
  goalWeightKg: 62,
  activityLevel: "Mostly sitting",
  cycleMode: "adapted",
  dietaryRestrictions: "Lactose, mild",
};

const SHARED_FACTS = {
  heightCm: 166.5,
  trainingDays: 4,
  sessionMinutes: 45,
  equipment: ["Resistance bands"],
  trainingPlace: "Home",
  limitations: "",
};

const EDITED_IDENTITY = {
  firstName: "Ana-Maria",
  lastName: "Ionescu",
  dateOfBirth: "1994-03-15",
  country: "MD",
  phoneCountry: "MD",
  phoneNumber: "068 123 456",
};

describe.sequential("client profile integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("the coach's edit of her coaching facts", () => {
    it("saves her coaching facts and the coach's private notes once her answers are approved", async () => {
      // arrange
      const clientId = await approvedClient();
      await rig.holdClock(EDITED_AT);

      // act
      const saved = await profiles.putJson(
        COACH_SESSION,
        coachProfileApi(clientId),
        {
          coaching: {
            ...SEEDED_COACHING,
            level: "intermediate",
            trainingDays: 5,
          },
          coachNotes: "  Prefers morning sessions.  ",
        },
      );

      // assert
      expect(saved.status).toBe(200);
      expect(await saved.json()).toEqual({ status: "saved" });
      expect(await onboarding.profileRowOf(clientId)).toEqual(
        expect.objectContaining({
          level: "intermediate",
          trainingDaysPerWeek: 5,
          heightCm: "165.0",
          coachNotes: "Prefers morning sessions.",
          updatedAt: EDITED_AT,
        }),
      );
    });

    it("refuses her coaching facts before her answers are approved and writes nothing", async () => {
      // arrange
      const clientId = await submittedClient();

      // act
      const refused = await profiles.putJson(
        COACH_SESSION,
        coachProfileApi(clientId),
        { coaching: SEEDED_COACHING, coachNotes: null },
      );

      // assert
      expect(refused.status).toBe(409);
      expect(await refused.json()).toEqual({ error: "not-seeded" });
      expect(await onboarding.profileRowOf(clientId)).toEqual(
        expect.objectContaining({ level: null, coachingSeededAt: null }),
      );
    });

    it("names a fact outside the profile rules and writes nothing", async () => {
      // arrange
      const clientId = await approvedClient();

      // act
      const refused = await profiles.putJson(
        COACH_SESSION,
        coachProfileApi(clientId),
        {
          coaching: { ...SEEDED_COACHING, goalWeightKg: 400 },
          coachNotes: "a".repeat(501),
        },
      );

      // assert
      expect(refused.status).toBe(422);
      expect(await refused.json()).toEqual({
        problems: { goalWeightKg: "out-of-range", coachNotes: "too-long" },
      });
      expect(await onboarding.profileRowOf(clientId)).toEqual(
        expect.objectContaining({ goalWeightKg: "62.00", coachNotes: null }),
      );
    });

    it("answers not found for someone who is not a client", async () => {
      // arrange
      const unknownClientId = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

      // act
      const refused = await profiles.putJson(
        COACH_SESSION,
        coachProfileApi(unknownClientId),
        { coaching: SEEDED_COACHING, coachNotes: null },
      );

      // assert
      expect(refused.status).toBe(404);
    });

    it("keeps a client off the coach's edit", async () => {
      // arrange
      const clientId = await approvedClient();

      // act
      const refused = await profiles.putJson(OWNER, coachProfileApi(clientId), {
        coaching: SEEDED_COACHING,
        coachNotes: "My own note.",
      });

      // assert
      expect(refused.status).toBe(403);
      expect(await onboarding.profileRowOf(clientId)).toEqual(
        expect.objectContaining({ coachNotes: null }),
      );
    });
  });

  describe("her own edit of the facts she shares with her coach", () => {
    it("saves her shared facts and leaves the coach's facts and notes alone", async () => {
      // arrange
      const clientId = await approvedClient();
      await profiles.putJson(COACH_SESSION, coachProfileApi(clientId), {
        coaching: { ...SEEDED_COACHING, level: "advanced" },
        coachNotes: "Coach only.",
      });
      await rig.holdClock(EDITED_AT);

      // act
      const saved = await profiles.putJson(OWNER, OWN_PROFILE_API, {
        facts: SHARED_FACTS,
      });

      // assert
      expect(saved.status).toBe(200);
      expect(await saved.json()).toEqual({ status: "saved" });
      expect(await onboarding.profileRowOf(clientId)).toEqual(
        expect.objectContaining({
          heightCm: "166.5",
          trainingDaysPerWeek: 4,
          sessionMinutes: 45,
          equipment: ["Resistance bands"],
          trainingPlace: "Home",
          limitations: "",
          level: "advanced",
          coachNotes: "Coach only.",
          updatedAt: EDITED_AT,
        }),
      );
    });

    it("refuses her shared facts before her answers are approved", async () => {
      // arrange
      await submittedClient();

      // act
      const refused = await profiles.putJson(OWNER, OWN_PROFILE_API, {
        facts: SHARED_FACTS,
      });

      // assert
      expect(refused.status).toBe(409);
      expect(await refused.json()).toEqual({ error: "not-seeded" });
    });

    it("names bodyweight only beside other equipment", async () => {
      // arrange
      await approvedClient();

      // act
      const refused = await profiles.putJson(OWNER, OWN_PROFILE_API, {
        facts: { ...SHARED_FACTS, equipment: ["Bodyweight only", "Barbell"] },
      });

      // assert
      expect(refused.status).toBe(422);
      expect(await refused.json()).toEqual({
        problems: { equipment: "exclusive" },
      });
    });

    it("keeps the coach off her own edit", async () => {
      // arrange
      await approvedClient();

      // act
      const refused = await profiles.putJson(COACH_SESSION, OWN_PROFILE_API, {
        facts: SHARED_FACTS,
      });

      // assert
      expect(refused.status).toBe(403);
    });
  });

  describe("identity edits", () => {
    it("saves the identity the coach edits, with her phone in E.164, and keeps her email", async () => {
      // arrange
      const clientId = await admittedClient();

      // act
      const saved = await profiles.putJson(
        COACH_SESSION,
        coachIdentityApi(clientId),
        { ...EDITED_IDENTITY, gender: "prefer_not_to_say" },
      );

      // assert
      expect(saved.status).toBe(200);
      expect(await saved.json()).toEqual({ status: "saved" });
      expect(await profiles.identityRowOf(clientId)).toEqual({
        firstName: "Ana-Maria",
        lastName: "Ionescu",
        email: ANA.email,
        phone: "+37368123456",
        dateOfBirth: "1994-03-15",
        country: "MD",
        gender: "prefer_not_to_say",
      });
    });

    it("saves the identity she edits herself and keeps the gender the coach holds", async () => {
      // arrange
      const clientId = await admittedClient();

      // act
      const saved = await profiles.putJson(
        OWNER,
        OWN_IDENTITY_API,
        EDITED_IDENTITY,
      );

      // assert
      expect(saved.status).toBe(200);
      expect(await saved.json()).toEqual({ status: "saved" });
      expect(await profiles.identityRowOf(clientId)).toEqual(
        expect.objectContaining({
          firstName: "Ana-Maria",
          gender: "female",
          email: ANA.email,
        }),
      );
    });

    it("names the fields outside the booking rules and writes nothing", async () => {
      // arrange
      const clientId = await admittedClient();
      const before = await profiles.identityRowOf(clientId);

      // act
      const refused = await profiles.putJson(OWNER, OWN_IDENTITY_API, {
        ...EDITED_IDENTITY,
        firstName: " ",
        dateOfBirth: "2015-01-01",
      });

      // assert
      expect(refused.status).toBe(422);
      expect(await refused.json()).toEqual({
        problems: { firstName: "missing", dateOfBirth: "too-young" },
      });
      expect(await profiles.identityRowOf(clientId)).toEqual(before);
    });

    it("names every field outside the booking rules in one answer", async () => {
      // arrange
      const clientId = await admittedClient();
      const before = await profiles.identityRowOf(clientId);

      // act
      const refused = await profiles.putJson(OWNER, OWN_IDENTITY_API, {
        ...EDITED_IDENTITY,
        firstName: " ",
        dateOfBirth: "2015-01-01",
        phoneNumber: "12",
        country: "ZZ",
      });

      // assert
      expect(refused.status).toBe(422);
      expect(await refused.json()).toEqual({
        problems: {
          firstName: "missing",
          dateOfBirth: "too-young",
          phone: "invalid",
          country: "invalid",
        },
      });
      expect(await profiles.identityRowOf(clientId)).toEqual(before);
    });

    it("keeps a client off the coach's identity edit", async () => {
      // arrange
      const clientId = await admittedClient();

      // act
      const refused = await profiles.putJson(
        OWNER,
        coachIdentityApi(clientId),
        {
          ...EDITED_IDENTITY,
          gender: "male",
        },
      );

      // assert
      expect(refused.status).toBe(403);
    });
  });

  describe("her avatar", () => {
    it("seals the photo she uploads as a square JPEG under her avatar folder and serves it to her and the coach only", async () => {
      // arrange
      const clientId = await admittedClient();
      await strangerClient();

      // act
      const uploaded = await profiles.uploadAvatar(
        OWNER,
        OWN_AVATAR_API,
        await cameraAvatar(),
      );
      const forHer = await profiles.openAvatar(OWNER, clientId);
      const forCoach = await profiles.openAvatar(COACH_SESSION, clientId);
      const forStranger = await profiles.openAvatar(STRANGER, clientId);
      const forAnonymous = await profiles.openAvatarAnonymously(clientId);

      // assert
      expect(uploaded.status).toBe(200);
      expect(await uploaded.json()).toEqual({ status: "uploaded" });
      const avatar = await profiles.avatarRowOf(clientId);
      expect(avatar).toEqual(
        expect.objectContaining({
          keyId: CLIENT_MEDIA_KEY_ID,
          mimeType: "image/jpeg",
          storageKey: `${clientId}/avatar/${avatar?.avatarId}.bin`,
        }),
      );
      expect(forHer.status).toBe(200);
      expect(forHer.headers.get("cache-control")).toBe("private, no-store");
      const rendition = Buffer.from(await forHer.arrayBuffer());
      const facts = await sharp(rendition).metadata();
      expect([facts.format, facts.width, facts.height]).toEqual([
        "jpeg",
        512,
        512,
      ]);
      expect(facts.exif).toBeUndefined();
      const sealed = await profiles.storedFileOf(avatar?.storageKey ?? "");
      expect(sealed).not.toBeNull();
      expect(sealed?.includes(rendition.subarray(0, 64))).toBe(false);
      expect(forCoach.status).toBe(200);
      expect(forStranger.status).toBe(404);
      expect(forAnonymous.status).toBe(401);
    });

    it("replaces her avatar for the coach and deletes the previous file", async () => {
      // arrange
      const clientId = await admittedClient();
      await profiles.uploadAvatar(OWNER, OWN_AVATAR_API, await cameraAvatar());
      const previous = await profiles.avatarRowOf(clientId);

      // act
      const replaced = await profiles.uploadAvatar(
        COACH_SESSION,
        coachAvatarApi(clientId),
        await pngAvatar(),
      );

      // assert
      expect(replaced.status).toBe(200);
      expect(await replaced.json()).toEqual({ status: "uploaded" });
      const current = await profiles.avatarRowOf(clientId);
      expect(current?.avatarId).not.toBe(previous?.avatarId);
      expect(
        await profiles.storedFileOf(previous?.storageKey ?? ""),
      ).toBeNull();
      expect(
        await profiles.storedFileOf(current?.storageKey ?? ""),
      ).not.toBeNull();
    });

    it("removes her avatar and its file", async () => {
      // arrange
      const clientId = await admittedClient();
      await profiles.uploadAvatar(OWNER, OWN_AVATAR_API, await cameraAvatar());
      const uploaded = await profiles.avatarRowOf(clientId);

      // act
      const removed = await profiles.removeAvatar(OWNER, OWN_AVATAR_API);

      // assert
      expect(removed.status).toBe(200);
      expect(await removed.json()).toEqual({ status: "removed" });
      expect(await profiles.avatarRowOf(clientId)).toBeUndefined();
      expect(
        await profiles.storedFileOf(uploaded?.storageKey ?? ""),
      ).toBeNull();
      expect((await profiles.openAvatar(OWNER, clientId)).status).toBe(404);
    });

    it("lets the coach remove her avatar", async () => {
      // arrange
      const clientId = await admittedClient();
      await profiles.uploadAvatar(OWNER, OWN_AVATAR_API, await cameraAvatar());

      // act
      const removed = await profiles.removeAvatar(
        COACH_SESSION,
        coachAvatarApi(clientId),
      );

      // assert
      expect(removed.status).toBe(200);
      expect(await removed.json()).toEqual({ status: "removed" });
      expect(await profiles.avatarRowOf(clientId)).toBeUndefined();
    });

    it("refuses a GIF and keeps no avatar", async () => {
      // arrange
      const clientId = await admittedClient();

      // act
      const refused = await profiles.uploadAvatar(OWNER, OWN_AVATAR_API, {
        bytes: await sharp({
          create: { width: 8, height: 8, channels: 3, background: "#336699" },
        })
          .gif()
          .toBuffer(),
        fileName: "me.gif",
        mimeType: "image/gif",
      });

      // assert
      expect(refused.status).toBe(422);
      expect(await refused.json()).toEqual({ error: "not-accepted" });
      expect(await profiles.avatarRowOf(clientId)).toBeUndefined();
    });

    it("keeps a client off the coach's avatar routes", async () => {
      // arrange
      await admittedClient();
      const strangerId = await strangerClient();

      // act
      const refused = await profiles.uploadAvatar(
        OWNER,
        coachAvatarApi(strangerId),
        await cameraAvatar(),
      );

      // assert
      expect(refused.status).toBe(403);
      expect(await profiles.avatarRowOf(strangerId)).toBeUndefined();
    });
  });

  describe("her profile and settings pages", () => {
    it("shows her who she is, her training and the facts her coach keeps once her answers are approved, without the coach's notes", async () => {
      // arrange
      const clientId = await approvedClient();
      await profiles.putJson(COACH_SESSION, coachProfileApi(clientId), {
        coaching: SEEDED_COACHING,
        coachNotes: "Coach only.",
      });

      // act
      const response = await rig.requestAs(OWNER, PROFILE_PAGE);

      // assert
      const page = await visibleDocument(response);
      const texts = textNodesOf(page);
      expect(response.status).toBe(200);
      expect(texts).toContain("Your Profile");
      expect(texts).toContain(
        "Keep your details up to date so your coach plans with the right facts.",
      );
      expect(texts).toContain("About you");
      expect(texts).toContain("Your training");
      expect(texts).toContain("Your coach keeps these up to date");
      expect(texts).toContain(ANA.email);
      expect(page).not.toContain("Coach only.");
    });

    it("offers only who she is before her answers are approved", async () => {
      // arrange
      await submittedClient();

      // act
      const response = await rig.requestAs(OWNER, PROFILE_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));
      expect(response.status).toBe(200);
      expect(texts).toContain("About you");
      expect(texts).not.toContain("Your training");
      expect(texts).not.toContain("Your coach keeps these up to date");
    });

    it("shows her units and, once her answers are approved, her check-in day and channel read-only", async () => {
      // arrange
      await approvedClient();

      // act
      const response = await rig.requestAs(OWNER, SETTINGS_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));
      expect(response.status).toBe(200);
      expect(texts).toContain("Settings");
      expect(texts).toContain("Subscription");
      expect(texts).toContain("Units &amp; Measurements");
      expect(texts).toContain("Check-ins and contact");
      expect(texts).toContain("Check-in day");
      expect(texts).toContain("Channel");
    });

    it("leaves her check-in day and channel out of her settings before her answers are approved", async () => {
      // arrange
      await submittedClient();

      // act
      const response = await rig.requestAs(OWNER, SETTINGS_PAGE);

      // assert
      const texts = textNodesOf(await visibleDocument(response));
      expect(response.status).toBe(200);
      expect(texts).toContain("Units &amp; Measurements");
      expect(texts).not.toContain("Check-ins and contact");
    });
  });
});

async function admittedClient(): Promise<string> {
  await onboarding.admit(ANA, OWNER);

  return onboarding.clientIdOf(OWNER);
}

async function submittedClient(): Promise<string> {
  await onboarding.admit(ANA, OWNER);
  await onboarding.submit(OWNER);

  return onboarding.clientIdOf(OWNER);
}

async function approvedClient(): Promise<string> {
  const clientId = await submittedClient();
  await onboarding.approve(COACH_SESSION, clientId);

  return clientId;
}

async function strangerClient(): Promise<string> {
  await onboarding.admit(MARIA, STRANGER, SECOND_PURCHASE);

  return onboarding.clientIdOf(STRANGER);
}

async function cameraAvatar(): Promise<AvatarPart> {
  return {
    bytes: await cameraJpegWithOrientationAndLocation(),
    fileName: "me.jpg",
    mimeType: "image/jpeg",
  };
}

async function pngAvatar(): Promise<AvatarPart> {
  return {
    bytes: await landscapePng(),
    fileName: "me.png",
    mimeType: "image/png",
  };
}
