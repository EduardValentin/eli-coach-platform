import { describe, expect, it } from "vitest";

import type {
  ClientCoachingDto,
  ClientCoachingFacade,
  ClientEquipmentSaveDto,
  ClientEquipmentSaveOutcomeDto,
} from "~/bounded-contexts/clients/public/client-coaching-facade";

import { ClientsClientCoachingAdapter } from "./clients-client-coaching-adapter.server";

type SaveStatus = ClientEquipmentSaveOutcomeDto["status"];

const ANAS_FACTS: NonNullable<ClientCoachingDto["coachingFacts"]> = {
  primaryGoal: "Build muscle",
  level: "intermediate",
  trainingDays: 4,
  sessionMinutes: 45,
  equipment: ["Dumbbells", "Resistance bands"],
};

const ANA: ClientCoachingDto = {
  clientId: "client-1",
  answersApproved: true,
  coachingFacts: ANAS_FACTS,
  equipmentOptions: [
    { equipment: "Dumbbells", exclusive: false },
    { equipment: "Resistance bands", exclusive: false },
    { equipment: "Bodyweight only", exclusive: true },
  ],
  primaryGoalOptions: ["Lose fat", "Build muscle"],
};

class ClientCoachingFacadeDouble implements ClientCoachingFacade {
  readonly saves: ClientEquipmentSaveDto[] = [];

  readonly asked: string[] = [];

  constructor(
    private readonly coaching: ClientCoachingDto = ANA,
    private readonly saveStatus: SaveStatus = "saved",
  ) {}

  async coachingOf(clientId: string): Promise<ClientCoachingDto> {
    this.asked.push(clientId);

    return this.coaching;
  }

  async saveEquipment(
    save: ClientEquipmentSaveDto,
  ): Promise<ClientEquipmentSaveOutcomeDto> {
    this.saves.push(save);

    return { status: this.saveStatus };
  }
}

describe("ClientsClientCoachingAdapter.find", () => {
  it("translates her approved coaching facts and her goal and equipment options, asking the facade for the client it was given", async () => {
    // arrange
    const clientCoachingFacadeDouble = new ClientCoachingFacadeDouble();
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      clientCoachingFacadeDouble,
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoachingFacadeDouble.asked).toEqual(["client-1"]);
    expect(clientCoaching).toEqual({
      answers: {
        status: "approved",
        coachingFacts: {
          goal: "Build muscle",
          level: "intermediate",
          trainingDays: 4,
          sessionMinutes: 45,
          equipment: ["Dumbbells", "Resistance bands"],
        },
      },
      equipmentOptions: [
        { value: "Dumbbells", exclusive: false },
        { value: "Resistance bands", exclusive: false },
        { value: "Bodyweight only", exclusive: true },
      ],
      goalOptions: ["Lose fat", "Build muscle"],
    });
  });

  it("carries a profile without a primary goal as a goal of null", async () => {
    // arrange
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      new ClientCoachingFacadeDouble({
        ...ANA,
        coachingFacts: { ...ANAS_FACTS, primaryGoal: null },
      }),
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoaching.answers).toEqual({
      status: "approved",
      coachingFacts: expect.objectContaining({ goal: null }),
    });
  });

  it("answers her answers not approved while they wait for approval", async () => {
    // arrange
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      new ClientCoachingFacadeDouble({ ...ANA, answersApproved: false }),
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoaching.answers).toEqual({ status: "not-approved" });
  });

  it("answers approved answers without coaching facts as not approved, since there is nothing to start from", async () => {
    // arrange
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      new ClientCoachingFacadeDouble({ ...ANA, coachingFacts: null }),
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoaching.answers).toEqual({ status: "not-approved" });
  });

  it.each([
    ["training days", { trainingDays: 6 }],
    ["session minutes", { sessionMinutes: 50 }],
  ])(
    "fails rather than translate %s outside the program's options",
    async (_label, facts) => {
      // arrange
      const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
        new ClientCoachingFacadeDouble({
          ...ANA,
          coachingFacts: { ...ANAS_FACTS, ...facts },
        }),
      );

      // act
      const found = clientsClientCoachingAdapter.find("client-1");

      // assert
      await expect(found).rejects.toThrow(Error);
    },
  );
});

describe("ClientsClientCoachingAdapter.saveEquipment", () => {
  it.each<SaveStatus>(["saved", "unchanged"])(
    "hands her equipment to the clients facade and succeeds when it answers %s",
    async (status) => {
      // arrange
      const clientCoachingFacadeDouble = new ClientCoachingFacadeDouble(
        ANA,
        status,
      );
      const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
        clientCoachingFacadeDouble,
      );

      // act
      const saved = clientsClientCoachingAdapter.saveEquipment({
        clientId: "client-1",
        equipment: ["Full gym"],
      });

      // assert
      await expect(saved).resolves.toBeUndefined();
      expect(clientCoachingFacadeDouble.saves).toEqual([
        { clientId: "client-1", equipment: ["Full gym"] },
      ]);
    },
  );

  it.each<SaveStatus>([
    "not-found",
    "not-seeded",
    "unknown-equipment",
    "invalid",
    "changed-meanwhile",
  ])(
    "fails when the clients facade answers %s, so the start rolls the program back",
    async (status) => {
      // arrange
      const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
        new ClientCoachingFacadeDouble(ANA, status),
      );

      // act
      const saved = clientsClientCoachingAdapter.saveEquipment({
        clientId: "client-1",
        equipment: ["Full gym"],
      });

      // assert
      await expect(saved).rejects.toThrow(status);
    },
  );
});
