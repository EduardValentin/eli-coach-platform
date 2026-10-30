import type {
  ClientMeasurementEntry,
  CoachingSeed,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";

type ClientMoment = { clientId: string; at: Date };

export type PhotoConsentWriter = (consent: ClientMoment) => Promise<void>;

export type CoachingSeedWriter = (
  seeding: ClientMoment & { seed: CoachingSeed },
) => Promise<void>;

export type MeasurementEntryWriter = (
  record: ClientMeasurementEntry,
) => Promise<void>;
