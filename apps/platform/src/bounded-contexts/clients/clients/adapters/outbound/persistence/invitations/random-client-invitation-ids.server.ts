import { randomUUID } from "node:crypto";

import type { ClientInvitationIds } from "~/bounded-contexts/clients/clients/domain/client-invitation";

export class RandomClientInvitationIds implements ClientInvitationIds {
  generate(): string {
    return randomUUID();
  }
}
