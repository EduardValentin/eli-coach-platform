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
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
  answersApproved: true,
  coachingEnded: false,
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

  constructor(
    private readonly coaching: ClientCoachingDto | null = ANA,
    private readonly saveStatus: SaveStatus = "saved",
  ) {}

  async coachingOf(clientId: string): Promise<ClientCoachingDto | null> {
    return this.coaching?.clientId === clientId ? this.coaching : null;
  }

  async saveEquipment(
    save: ClientEquipmentSaveDto,
  ): Promise<ClientEquipmentSaveOutcomeDto> {
    this.saves.push(save);

    return { status: this.saveStatus };
  }
}

describe("ClientsClientCoachingAdapter.find", () => {
  it("translates who she is, her approved coaching facts and her goal and equipment options", async () => {
    // arrange
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      new ClientCoachingFacadeDouble(),
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoaching).toEqual({
      clientId: "client-1",
      firstName: "Ana",
      lastName: "Popescu",
      gender: "female",
      coachingEnded: false,
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

  it("carries ended coaching and a profile without a primary goal", async () => {
    // arrange
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      new ClientCoachingFacadeDouble({
        ...ANA,
        coachingEnded: true,
        coachingFacts: { ...ANAS_FACTS, primaryGoal: null },
      }),
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoaching).toMatchObject({
      coachingEnded: true,
      answers: { status: "approved", coachingFacts: { goal: null } },
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
    expect(clientCoaching?.answers).toEqual({ status: "not-approved" });
  });

  it("answers approved answers without coaching facts as not approved, since there is nothing to start from", async () => {
    // arrange
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      new ClientCoachingFacadeDouble({ ...ANA, coachingFacts: null }),
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoaching?.answers).toEqual({ status: "not-approved" });
  });

  it("answers nothing for a client the clients facade does not know", async () => {
    // arrange
    const clientsClientCoachingAdapter = new ClientsClientCoachingAdapter(
      new ClientCoachingFacadeDouble(null),
    );

    // act
    const clientCoaching = await clientsClientCoachingAdapter.find("client-1");

    // assert
    expect(clientCoaching).toBeNull();
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
