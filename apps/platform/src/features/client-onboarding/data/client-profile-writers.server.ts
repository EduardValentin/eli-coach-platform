import type { DatabaseTransaction } from "@eli-coach-platform/db";
import type { ClientProfile } from "@eli-coach-platform/domain/client-profile";
import type { MeasurementEntry } from "@eli-coach-platform/domain/measurement";

export type ClientProfileWriter = (
  transaction: DatabaseTransaction,
  profile: ClientProfile,
) => Promise<void>;

export type MeasurementEntryWriter = (
  transaction: DatabaseTransaction,
  input: { clientId: string; entry: MeasurementEntry },
) => Promise<string>;
