import { describe, expect, it } from "vitest";

import {
  ClientProfile,
  type ClientProfileSave,
  type ClientProfilesPort,
  type ClientProfileSnapshot,
} from "../client-profile";

import { SaveClientEquipmentUseCase } from "./save-client-equipment-use-case";

const SEEDED_AT = new Date("2026-09-30T10:00:00.000Z");
const NOW = new Date("2026-11-20T12:00:00.000Z");

const SEEDED: ClientProfileSnapshot = {
  clientId: "client-1",
  coaching: {
    heightCm: 168,
    trainingDays: 3,
    sessionMinutes: 45,
    equipment: ["Dumbbells", "Resistance bands"],
    trainingPlace: "Home",
    limitations: "",
    level: "beginner",
    primaryGoal: "Build muscle",
    goalWeightKg: null,
    activityLevel: null,
    cycleMode: "adapted",
    dietaryRestrictions: "None",
  },
  coachNotes: "Prefers mornings.",
  coachingSeededAt: SEEDED_AT,
  progressPhotosConsentedAt: null,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
};

function saveClientEquipmentUseCaseOver(
  stored: ClientProfileSnapshot | null = SEEDED,
) {
  const saves: ClientProfileSave[] = [];
  const clientProfilesPort: Pick<
    ClientProfilesPort,
    "findByClientId" | "saveSharedFacts"
  > = {
    findByClientId: async (clientId) =>
      stored?.clientId === clientId ? ClientProfile.reconstitute(stored) : null,
    saveSharedFacts: async (save) => {
      saves.push(save);
      return "saved";
    },
  };
  const saveClientEquipmentUseCase = new SaveClientEquipmentUseCase({
    clientProfilesPort,
    clockPort: { now: () => NOW },
  });

  return { saveClientEquipmentUseCase, saves };
}

describe("SaveClientEquipmentUseCase", () => {
  it("saves her new equipment against the profile it read", async () => {
    // arrange
    const { saveClientEquipmentUseCase, saves } =
      saveClientEquipmentUseCaseOver();

    // act
    const result = await saveClientEquipmentUseCase.execute({
      clientId: "client-1",
      equipment: ["Full gym"],
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(saves).toHaveLength(1);
    expect(saves[0]?.expectedUpdatedAt).toEqual(SEEDED_AT);
    expect(saves[0]?.profile.toSnapshot()).toEqual({
      ...SEEDED,
      coaching: { ...SEEDED.coaching, equipment: ["Full gym"] },
      updatedAt: NOW,
    });
  });

  it("refuses Bodyweight only together with other equipment and writes nothing", async () => {
    // arrange
    const { saveClientEquipmentUseCase, saves } =
      saveClientEquipmentUseCaseOver();

    // act
    const result = await saveClientEquipmentUseCase.execute({
      clientId: "client-1",
      equipment: ["Bodyweight only", "Dumbbells"],
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { equipment: "exclusive" },
    });
    expect(saves).toEqual([]);
  });

  it("writes nothing when her equipment is unchanged", async () => {
    // arrange
    const { saveClientEquipmentUseCase, saves } =
      saveClientEquipmentUseCaseOver();

    // act
    const result = await saveClientEquipmentUseCase.execute({
      clientId: "client-1",
      equipment: ["Resistance bands", "Dumbbells"],
    });

    // assert
    expect(result).toEqual({ status: "unchanged" });
    expect(saves).toEqual([]);
  });

  it("refuses equipment outside the vocabulary and writes nothing", async () => {
    // arrange
    const { saveClientEquipmentUseCase, saves } =
      saveClientEquipmentUseCaseOver();

    // act
    const result = await saveClientEquipmentUseCase.execute({
      clientId: "client-1",
      equipment: ["Full gym", "Trampoline"],
    });

    // assert
    expect(result).toEqual({ status: "unknown-equipment" });
    expect(saves).toEqual([]);
  });

  it("refuses a profile whose coaching was never seeded", async () => {
    // arrange
    const { saveClientEquipmentUseCase, saves } =
      saveClientEquipmentUseCaseOver({ ...SEEDED, coaching: null });

    // act
    const result = await saveClientEquipmentUseCase.execute({
      clientId: "client-1",
      equipment: ["Full gym"],
    });

    // assert
    expect(result).toEqual({ status: "not-seeded" });
    expect(saves).toEqual([]);
  });

  it("answers not found for a client without a profile", async () => {
    // arrange
    const { saveClientEquipmentUseCase, saves } =
      saveClientEquipmentUseCaseOver(null);

    // act
    const result = await saveClientEquipmentUseCase.execute({
      clientId: "client-1",
      equipment: ["Full gym"],
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(saves).toEqual([]);
  });
});
