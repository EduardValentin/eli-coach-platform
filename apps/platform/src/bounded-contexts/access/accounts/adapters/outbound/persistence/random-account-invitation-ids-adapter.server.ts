import { randomUUID } from "node:crypto";

import type { AccountInvitationIdsPort } from "~/bounded-contexts/access/accounts/domain/account";

export class RandomAccountInvitationIdsAdapter implements AccountInvitationIdsPort {
  generate(): string {
    return randomUUID();
  }
}
