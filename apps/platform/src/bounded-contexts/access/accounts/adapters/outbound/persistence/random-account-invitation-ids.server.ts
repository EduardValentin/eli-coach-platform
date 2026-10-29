import { randomUUID } from "node:crypto";

import type { AccountInvitationIds } from "~/bounded-contexts/access/accounts/domain/account";

export class RandomAccountInvitationIds implements AccountInvitationIds {
  generate(): string {
    return randomUUID();
  }
}
