import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";
import type { ClientReachPort, ClientReachReading } from "../client-reach-port";
import {
  ClientSettings,
  type ClientSettingsSourcePort,
} from "../client-settings";
import type {
  ClientMeasurementsSourcePort,
  MeasurementEntry,
} from "../measurement";

import { ClientAvatar } from "./client-avatar";
import type { ClientAvatarsPort } from "./client-avatars-port";
import { ClientProfile, type ClientProfileSnapshot } from "./client-profile";
import type { ClientProfilesPort } from "./client-profiles-port";
import type {
  CoachingFactsSnapshot,
  SharedCoachingFacts,
} from "./coaching-facts";
import { ReadClientProfileUseCase } from "./read-client-profile-use-case";
import { ReadOwnClientProfileUseCase } from "./read-own-client-profile-use-case";
import { UpdateClientProfileAsCoachUseCase } from "./update-client-profile-as-coach-use-case";
import { UpdateOwnClientProfileUseCase } from "./update-own-client-profile-use-case";

const OPENED_AT = new Date("2026-09-20T10:00:00.000Z");
const SEEDED_AT = new Date("2026-09-30T10:00:00.000Z");
const NOW = new Date("2026-10-24T12:00:00.000Z");

const IDENTITY: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

const COACHING: CoachingFactsSnapshot = {
  heightCm: 168,
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: ["Full gym"],
  trainingPlace: "Gym",
  limitations: "",
  level: "beginner",
  primaryGoal: "Lose fat",
  goalWeightKg: 62,
  activityLevel: "Lightly active",
  cycleMode: "adapted",
  dietaryRestrictions: "None",
};

const SHARED: SharedCoachingFacts = {
  heightCm: 170,
  trainingDays: 4,
  sessionMinutes: 45,
  equipment: ["Dumbbells"],
  trainingPlace: "Home",
  limitations: "Knee pain.",
};

const SEEDED: ClientProfileSnapshot = {
  clientId: "client-1",
  coaching: COACHING,
  coachNotes: "Prefers mornings.",
  coachingSeededAt: SEEDED_AT,
  progressPhotosConsentedAt: null,
  createdAt: OPENED_AT,
  updatedAt: SEEDED_AT,
};

const SETTINGS = ClientSettings.reconstitute({
  clientId: "client-1",
  unitPreference: { weightUnit: "kg", heightUnit: "cm" },
  preferredCheckInWeekday: "monday",
  preferredChannel: "whatsapp",
  updatedAt: SEEDED_AT,
});

const FIRST_ENTRY: MeasurementEntry = {
  recordedAt: new Date("2026-09-27T10:00:00.000Z"),
  weightKg: 64.5,
  waistCm: 72,
};

const LATEST_ENTRY: MeasurementEntry = {
  recordedAt: new Date("2026-10-20T10:00:00.000Z"),
  weightKg: 63.8,
  waistCm: 71,
};

function reachOf(portal: ClientReachReading["portal"]): ClientReachReading {
  return {
    clientId: "client-1",
    portal,
    coachingEndsAt: null,
    programStartsAt: null,
    paidThrough: null,
    timeZone: "Europe/Bucharest",
  };
}

function createPorts(
  stored: {
    identity?: ClientIdentity | null;
    profile?: ClientProfile | null;
    settings?: ClientSettings | null;
    avatar?: ClientAvatar | null;
    reach?: ClientReachReading | null;
    saved?: "saved" | "changed-meanwhile";
  } = {},
) {
  const profile =
    stored.profile === undefined
      ? ClientProfile.reconstitute(SEEDED)
      : stored.profile;

  return {
    clientReachPort: {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValue(
          stored.reach === undefined ? reachOf("reachable") : stored.reach,
        ),
    } satisfies Pick<ClientReachPort, "findByAuthSubjectId">,
    clientIdentitiesPort: {
      findByClientId: vi
        .fn()
        .mockResolvedValue(
          stored.identity === undefined ? IDENTITY : stored.identity,
        ),
      findByClientIds: vi.fn(),
    } satisfies ClientIdentitiesPort,
    clientProfilesPort: {
      findByClientId: vi.fn().mockResolvedValue(profile),
      saveSharedFacts: vi.fn().mockResolvedValue(stored.saved ?? "saved"),
      saveCoachFacts: vi.fn().mockResolvedValue(stored.saved ?? "saved"),
      recordPhotoConsent: vi.fn(),
    } satisfies ClientProfilesPort,
    clientSettingsSourcePort: {
      findByClientId: vi
        .fn()
        .mockResolvedValue(
          stored.settings === undefined ? SETTINGS : stored.settings,
        ),
    } satisfies ClientSettingsSourcePort,
    clientAvatarsPort: {
      findByClientId: vi.fn().mockResolvedValue(stored.avatar ?? null),
    } satisfies Pick<ClientAvatarsPort, "findByClientId">,
    clientMeasurementsSourcePort: {
      listByClientId: vi.fn().mockResolvedValue([LATEST_ENTRY, FIRST_ENTRY]),
    } satisfies ClientMeasurementsSourcePort,
    clockPort: { now: () => NOW },
  };
}

const AVATAR = ClientAvatar.reconstitute({
  clientId: "client-1",
  avatarId: "avatar-1",
  reference: { storageKey: "client-1/avatar/avatar-1.bin", keyId: "k1" },
  mimeType: "image/jpeg",
  sizeBytes: 4,
  updatedAt: SEEDED_AT,
});

describe("ReadClientProfileUseCase", () => {
  it("reads her identity, coaching facts, the coach's notes, her preferences, her avatar and her first and latest weights", async () => {
    // arrange
    const ports = createPorts({ avatar: AVATAR });
    const readClientProfileUseCase = new ReadClientProfileUseCase(ports);

    // act
    const reading = await readClientProfileUseCase.execute("client-1");

    // assert
    expect(reading).toEqual({
      identity: IDENTITY,
      coaching: COACHING,
      coachNotes: "Prefers mornings.",
      preferences: {
        preferredCheckInWeekday: "monday",
        preferredChannel: "whatsapp",
      },
      avatarId: "avatar-1",
      startingWeightKg: 64.5,
      currentWeightKg: 63.8,
    });
    expect(ports.clientProfilesPort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
    expect(ports.clientSettingsSourcePort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
    expect(ports.clientAvatarsPort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
  });

  it("reads no coaching facts or preferences before her answers are approved", async () => {
    // arrange
    const ports = createPorts({
      profile: ClientProfile.opened({ clientId: "client-1", now: OPENED_AT }),
      settings: ClientSettings.opened({ clientId: "client-1", now: OPENED_AT }),
    });
    const readClientProfileUseCase = new ReadClientProfileUseCase(ports);

    // act
    const reading = await readClientProfileUseCase.execute("client-1");

    // assert
    expect(reading).toMatchObject({
      coaching: null,
      coachNotes: null,
      preferences: { preferredCheckInWeekday: null, preferredChannel: null },
      avatarId: null,
    });
  });

  it("answers nothing for someone who is not a client, reading nothing more", async () => {
    // arrange
    const ports = createPorts({ identity: null });
    const readClientProfileUseCase = new ReadClientProfileUseCase(ports);

    // act
    const reading = await readClientProfileUseCase.execute("client-9");

    // assert
    expect(reading).toBeNull();
    expect(ports.clientProfilesPort.findByClientId).not.toHaveBeenCalled();
  });
});

describe("ReadOwnClientProfileUseCase", () => {
  it("reads her own profile without the coach's private notes", async () => {
    // arrange
    const ports = createPorts();
    const readOwnClientProfileUseCase = new ReadOwnClientProfileUseCase(ports);

    // act
    const reading = await readOwnClientProfileUseCase.execute("user_ana");

    // assert
    expect(reading).toEqual({
      identity: IDENTITY,
      coaching: COACHING,
      preferences: {
        preferredCheckInWeekday: "monday",
        preferredChannel: "whatsapp",
      },
      avatarId: null,
      startingWeightKg: 64.5,
      currentWeightKg: 63.8,
    });
    expect(ports.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_ana",
    );
    expect(ports.clientIdentitiesPort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
  });

  it("reads nothing for a subject bound to no client", async () => {
    // arrange
    const ports = createPorts({ reach: null });
    const readOwnClientProfileUseCase = new ReadOwnClientProfileUseCase(ports);

    // act
    const reading = await readOwnClientProfileUseCase.execute("user_stranger");

    // assert
    expect(reading).toBeNull();
    expect(ports.clientIdentitiesPort.findByClientId).not.toHaveBeenCalled();
  });
});

describe("UpdateClientProfileAsCoachUseCase", () => {
  it("saves her coaching facts and the coach's notes against the profile it read", async () => {
    // arrange
    const ports = createPorts();
    const updateClientProfileAsCoachUseCase =
      new UpdateClientProfileAsCoachUseCase(ports);
    const coaching = { ...COACHING, level: "intermediate" as const };

    // act
    const result = await updateClientProfileAsCoachUseCase.execute({
      clientId: "client-1",
      edit: { coaching, coachNotes: "Moved to four days." },
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    const [save] = ports.clientProfilesPort.saveCoachFacts.mock.calls[0] ?? [];
    expect(save?.expectedUpdatedAt).toEqual(SEEDED_AT);
    expect(save?.profile.toSnapshot()).toEqual({
      ...SEEDED,
      coaching,
      coachNotes: "Moved to four days.",
      updatedAt: NOW,
    });
  });

  it.each([
    ["an unknown client", { profile: null }, { status: "not-found" }],
    [
      "a client whose answers are not approved yet",
      {
        profile: ClientProfile.opened({ clientId: "client-1", now: OPENED_AT }),
      },
      { status: "not-seeded" },
    ],
  ] as const)("saves nothing for %s", async (_label, stored, expected) => {
    // arrange
    const ports = createPorts(stored);
    const updateClientProfileAsCoachUseCase =
      new UpdateClientProfileAsCoachUseCase(ports);

    // act
    const result = await updateClientProfileAsCoachUseCase.execute({
      clientId: "client-1",
      edit: { coaching: COACHING, coachNotes: null },
    });

    // assert
    expect(result).toEqual(expected);
    expect(ports.clientProfilesPort.saveCoachFacts).not.toHaveBeenCalled();
  });

  it("names the problems and saves nothing", async () => {
    // arrange
    const ports = createPorts();
    const updateClientProfileAsCoachUseCase =
      new UpdateClientProfileAsCoachUseCase(ports);

    // act
    const result = await updateClientProfileAsCoachUseCase.execute({
      clientId: "client-1",
      edit: { coaching: { ...COACHING, heightCm: 20 }, coachNotes: null },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { heightCm: "out-of-range" },
    });
    expect(ports.clientProfilesPort.saveCoachFacts).not.toHaveBeenCalled();
  });

  it("answers changed-meanwhile when her profile moved since it was read", async () => {
    // arrange
    const ports = createPorts({ saved: "changed-meanwhile" });
    const updateClientProfileAsCoachUseCase =
      new UpdateClientProfileAsCoachUseCase(ports);

    // act
    const result = await updateClientProfileAsCoachUseCase.execute({
      clientId: "client-1",
      edit: { coaching: COACHING, coachNotes: null },
    });

    // assert
    expect(result).toEqual({ status: "changed-meanwhile" });
  });
});

describe("UpdateOwnClientProfileUseCase", () => {
  it("saves the facts she shares with her coach against the profile it read", async () => {
    // arrange
    const ports = createPorts();
    const updateOwnClientProfileUseCase = new UpdateOwnClientProfileUseCase(
      ports,
    );

    // act
    const result = await updateOwnClientProfileUseCase.execute({
      authSubjectId: "user_ana",
      facts: SHARED,
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    const [save] = ports.clientProfilesPort.saveSharedFacts.mock.calls[0] ?? [];
    expect(save?.expectedUpdatedAt).toEqual(SEEDED_AT);
    expect(save?.profile.toSnapshot()).toEqual({
      ...SEEDED,
      coaching: { ...COACHING, ...SHARED },
      updatedAt: NOW,
    });
  });

  it.each([
    ["a subject bound to no client", { reach: null }, "not-on-journey"],
    ["a client whose portal has ended", { reach: reachOf("ended") }, "ended"],
    [
      "a client whose answers are not approved yet",
      {
        profile: ClientProfile.opened({ clientId: "client-1", now: OPENED_AT }),
      },
      "not-seeded",
    ],
  ] as const)("saves nothing for %s", async (_label, stored, status) => {
    // arrange
    const ports = createPorts(stored);
    const updateOwnClientProfileUseCase = new UpdateOwnClientProfileUseCase(
      ports,
    );

    // act
    const result = await updateOwnClientProfileUseCase.execute({
      authSubjectId: "user_ana",
      facts: SHARED,
    });

    // assert
    expect(result).toEqual({ status });
    expect(ports.clientProfilesPort.saveSharedFacts).not.toHaveBeenCalled();
  });

  it("answers changed-meanwhile when her profile moved since it was read", async () => {
    // arrange
    const ports = createPorts({ saved: "changed-meanwhile" });
    const updateOwnClientProfileUseCase = new UpdateOwnClientProfileUseCase(
      ports,
    );

    // act
    const result = await updateOwnClientProfileUseCase.execute({
      authSubjectId: "user_ana",
      facts: SHARED,
    });

    // assert
    expect(result).toEqual({ status: "changed-meanwhile" });
  });

  it("names the problems with her facts and saves nothing", async () => {
    // arrange
    const ports = createPorts();
    const updateOwnClientProfileUseCase = new UpdateOwnClientProfileUseCase(
      ports,
    );

    // act
    const result = await updateOwnClientProfileUseCase.execute({
      authSubjectId: "user_ana",
      facts: { ...SHARED, equipment: ["Bodyweight only", "Barbell"] },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { equipment: "exclusive" },
    });
  });
});
