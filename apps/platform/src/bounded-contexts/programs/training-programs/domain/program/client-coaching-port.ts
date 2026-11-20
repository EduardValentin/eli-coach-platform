import type { ClientLevel, SessionMinutes, TrainingDays } from "./vocabulary";

export type ClientGender = "female" | "male" | "prefer_not_to_say";

export type ClientCoachingFacts = {
  goal: string | null;
  level: ClientLevel;
  trainingDays: TrainingDays;
  sessionMinutes: SessionMinutes;
  equipment: string[];
};

export type EquipmentOption = { value: string; exclusive: boolean };

export type ClientCoaching = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: ClientGender;
  coachingEnded: boolean;
  answers:
    | { status: "approved"; coachingFacts: ClientCoachingFacts }
    | { status: "not-approved" };
  equipmentOptions: EquipmentOption[];
  goalOptions: string[];
};

export type EquipmentUpdate = {
  clientId: string;
  equipment: readonly string[];
};

export interface ClientCoachingPort {
  find(clientId: string): Promise<ClientCoaching | null>;
  saveEquipment(update: EquipmentUpdate): Promise<void>;
}
