import type { DatabaseTransaction } from "@eli-coach-platform/db";
import type {
  ClientMeasurementEntry,
  ClientProfile,
} from "@eli-coach-platform/domain/client-profile";

export type ClientProfileWriter = (
  transaction: DatabaseTransaction,
  profile: ClientProfile,
) => Promise<void>;

export type MeasurementEntryWriter = (
  transaction: DatabaseTransaction,
  record: ClientMeasurementEntry,
) => Promise<void>;
