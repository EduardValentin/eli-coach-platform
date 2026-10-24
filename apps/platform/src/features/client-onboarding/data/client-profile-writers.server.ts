import type { DatabaseTransaction } from "@eli-coach-platform/db";
import type {
  ClientMeasurementEntry,
  CoachingSeed,
} from "@eli-coach-platform/domain/client-profile";

type ClientMoment = { clientId: string; at: Date };

export type PhotoConsentWriter = (
  transaction: DatabaseTransaction,
  consent: ClientMoment,
) => Promise<void>;

export type CoachingSeedWriter = (
  transaction: DatabaseTransaction,
  seeding: ClientMoment & { seed: CoachingSeed },
) => Promise<void>;

export type MeasurementEntryWriter = (
  transaction: DatabaseTransaction,
  record: ClientMeasurementEntry,
) => Promise<void>;
