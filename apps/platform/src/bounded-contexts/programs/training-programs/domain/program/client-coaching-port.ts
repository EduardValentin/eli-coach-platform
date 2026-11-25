import type { ClientLevel, SessionMinutes, TrainingDays } from "./vocabulary";

export type ClientCoachingFacts = {
  goal: string | null;
  level: ClientLevel;
  trainingDays: TrainingDays;
  sessionMinutes: SessionMinutes;
  equipment: string[];
  trainingPlace: string | null;
  limitations: string;
};

export type EquipmentOption = { value: string; exclusive: boolean };

export type ClientCoaching = {
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
  find(clientId: string): Promise<ClientCoaching>;
  saveEquipment(update: EquipmentUpdate): Promise<void>;
}
