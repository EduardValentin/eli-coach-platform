type ClientCoachingFactsDto = {
  primaryGoal: string | null;
  level: "beginner" | "intermediate" | "advanced";
  trainingDays: number;
  sessionMinutes: number;
  equipment: string[];
  trainingPlace: string | null;
  limitations: string;
};

type EquipmentOptionDto = {
  equipment: string;
  exclusive: boolean;
};

export type ClientCoachingDto = {
  clientId: string;
  answersApproved: boolean;
  coachingFacts: ClientCoachingFactsDto | null;
  equipmentOptions: EquipmentOptionDto[];
  primaryGoalOptions: string[];
};

export type ClientEquipmentSaveDto = {
  clientId: string;
  equipment: string[];
};

export type ClientEquipmentSaveOutcomeDto = {
  status:
    | "saved"
    | "unchanged"
    | "not-found"
    | "not-seeded"
    | "unknown-equipment"
    | "invalid"
    | "changed-meanwhile";
};

export interface ClientCoachingFacade {
  coachingOf(clientId: string): Promise<ClientCoachingDto>;
  saveEquipment(
    save: ClientEquipmentSaveDto,
  ): Promise<ClientEquipmentSaveOutcomeDto>;
}
