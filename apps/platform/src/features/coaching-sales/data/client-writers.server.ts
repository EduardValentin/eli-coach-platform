import type { DatabaseTransaction } from "@eli-coach-platform/db";
import type {
  ClientIntake,
  CoachingStanding,
} from "@eli-coach-platform/domain/client";

export type ClientWriter = (
  transaction: DatabaseTransaction,
  admission: { intake: ClientIntake; admittedAt: Date },
) => Promise<{ clientId: string } | "call_already_has_client">;

export type CoachingStandingWriter = (
  transaction: DatabaseTransaction,
  input: { clientId: string; standing: CoachingStanding },
) => Promise<void>;
