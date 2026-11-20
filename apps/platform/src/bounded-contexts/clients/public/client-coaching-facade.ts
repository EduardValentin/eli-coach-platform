type ClientCoachingFactsDto = {
  primaryGoal: string | null;
  level: "beginner" | "intermediate" | "advanced";
  trainingDays: number;
  sessionMinutes: number;
  equipment: string[];
};

type EquipmentOptionDto = {
  equipment: string;
  exclusive: boolean;
};

export type ClientCoachingDto = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: "female" | "male" | "prefer_not_to_say";
  answersApproved: boolean;
  coachingEnded: boolean;
  coachingFacts: ClientCoachingFactsDto | null;
  equipmentOptions: EquipmentOptionDto[];
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
  coachingOf(clientId: string): Promise<ClientCoachingDto | null>;
  saveEquipment(
    save: ClientEquipmentSaveDto,
  ): Promise<ClientEquipmentSaveOutcomeDto>;
}
