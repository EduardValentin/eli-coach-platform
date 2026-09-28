import type { StartChoice } from "../coaching-subscription";

export type ClientSubscriptionStart = {
  startChoice: StartChoice;
  purchasedAt: Date;
};

export interface ClientSubscriptionStarts {
  findOpenForClient(clientId: string): Promise<ClientSubscriptionStart | null>;
}
