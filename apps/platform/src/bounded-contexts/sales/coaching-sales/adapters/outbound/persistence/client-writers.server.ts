import type {
  Client,
  CoachingStanding,
} from "~/bounded-contexts/clients/clients/domain/client";

export type ClientWriter = (
  client: Client,
) => Promise<"written" | "call_already_has_client">;

export type CoachingStandingWriter = (input: {
  clientId: string;
  standing: CoachingStanding;
}) => Promise<void>;

export type ClientProfileOpener = (admission: {
  clientId: string;
  at: Date;
}) => Promise<void>;
