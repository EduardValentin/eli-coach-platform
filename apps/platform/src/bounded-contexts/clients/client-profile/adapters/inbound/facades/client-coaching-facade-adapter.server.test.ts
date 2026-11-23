import { describe, expect, it } from "vitest";

import { ClientCoaching } from "~/bounded-contexts/clients/client-profile/domain/client-coaching";
import type {
  ReadClientCoachingUseCase,
  SaveClientEquipmentUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-coaching";
import { ClientProfile } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

import { ClientCoachingFacadeAdapter } from "./client-coaching-facade-adapter.server";

const SEEDED_AT = new Date("2026-09-30T10:00:00.000Z");

const PROFILE = ClientProfile.reconstitute({
  clientId: "client-1",
  coaching: {
    heightCm: 168,
    trainingDays: 3,
    sessionMinutes: 45,
    equipment: ["Dumbbells"],
    trainingPlace: "Home",
    limitations: "",
    level: "beginner",
    primaryGoal: "Build muscle",
    goalWeightKg: null,
    activityLevel: null,
    cycleMode: "adapted",
    dietaryRestrictions: "None",
  },
  coachNotes: null,
  coachingSeededAt: SEEDED_AT,
  progressPhotosConsentedAt: null,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
});

const passThroughUnitOfWork: UnitOfWork = (work) => work();

function clientCoachingFacadeAdapterOver(coaching: ClientCoaching) {
  const savedEquipment: unknown[] = [];

  return {
    clientCoachingFacadeAdapter: new ClientCoachingFacadeAdapter({
      readClientCoachingUseCase: {
        execute: async () => coaching,
      } as unknown as ReadClientCoachingUseCase,
      saveClientEquipmentUseCase: {
        execute: async (command: unknown) => {
          savedEquipment.push(command);

          return { status: "invalid", problems: { equipment: "exclusive" } };
        },
      } as unknown as SaveClientEquipmentUseCase,
      unitOfWork: passThroughUnitOfWork,
    }),
    savedEquipment,
  };
}

describe("ClientCoachingFacadeAdapter.coachingOf", () => {
  it("answers whether her answers are approved, her facts and the options, and nothing of who she is or where her coaching stands", async () => {
    // arrange
    const { clientCoachingFacadeAdapter } = clientCoachingFacadeAdapterOver(
      ClientCoaching.of({
        clientId: "client-1",
        answersApprovedAt: SEEDED_AT,
        profile: PROFILE,
      }),
    );

    // act
    const dto = await clientCoachingFacadeAdapter.coachingOf("client-1");

    // assert
    expect(dto).toEqual({
      clientId: "client-1",
      answersApproved: true,
      coachingFacts: {
        primaryGoal: "Build muscle",
        level: "beginner",
        trainingDays: 3,
        sessionMinutes: 45,
        equipment: ["Dumbbells"],
      },
      equipmentOptions: expect.arrayContaining([
        { equipment: "Dumbbells", exclusive: false },
        { equipment: "Bodyweight only", exclusive: true },
      ]),
      primaryGoalOptions: expect.arrayContaining(["Build muscle"]),
    });
    expect(dto.equipmentOptions).toHaveLength(7);
    expect(dto.primaryGoalOptions).toHaveLength(6);
  });

  it("answers unapproved answers without facts for a client it holds nothing for", async () => {
    // arrange
    const { clientCoachingFacadeAdapter } = clientCoachingFacadeAdapterOver(
      ClientCoaching.of({
        clientId: "client-9",
        answersApprovedAt: null,
        profile: null,
      }),
    );

    // act
    const dto = await clientCoachingFacadeAdapter.coachingOf("client-9");

    // assert
    expect(dto).toMatchObject({
      clientId: "client-9",
      answersApproved: false,
      coachingFacts: null,
    });
  });
});

describe("ClientCoachingFacadeAdapter.saveEquipment", () => {
  it("hands her equipment to the use case and answers only its status", async () => {
    // arrange
    const { clientCoachingFacadeAdapter, savedEquipment } =
      clientCoachingFacadeAdapterOver(
        ClientCoaching.of({
          clientId: "client-1",
          answersApprovedAt: null,
          profile: null,
        }),
      );

    // act
    const outcome = await clientCoachingFacadeAdapter.saveEquipment({
      clientId: "client-1",
      equipment: ["Full gym"],
    });

    // assert
    expect(outcome).toEqual({ status: "invalid" });
    expect(savedEquipment).toEqual([
      { clientId: "client-1", equipment: ["Full gym"] },
    ]);
  });
});
