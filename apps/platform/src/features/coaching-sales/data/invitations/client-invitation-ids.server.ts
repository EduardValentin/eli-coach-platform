import { randomUUID } from "node:crypto";

import type { ClientInvitationIdGenerator } from "@eli-coach-platform/domain/client-invitation";

export class RandomClientInvitationIdGenerator implements ClientInvitationIdGenerator {
  generate(): string {
    return randomUUID();
  }
}
