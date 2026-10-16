import type { DatabaseTransaction } from "@eli-coach-platform/db";
import type {
  Client,
  CoachingStanding,
} from "@eli-coach-platform/domain/client";

export type ClientWriter = (
  transaction: DatabaseTransaction,
  client: Client,
) => Promise<{ clientId: string } | "call_already_has_client">;

export type CoachingStandingWriter = (
  transaction: DatabaseTransaction,
  input: { clientId: string; standing: CoachingStanding },
) => Promise<void>;
