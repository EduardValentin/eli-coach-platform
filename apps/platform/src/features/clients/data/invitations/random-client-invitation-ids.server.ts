import { randomUUID } from "node:crypto";

import type { ClientInvitationIds } from "@eli-coach-platform/domain/client-invitation";

export class RandomClientInvitationIds implements ClientInvitationIds {
  generate(): string {
    return randomUUID();
  }
}
