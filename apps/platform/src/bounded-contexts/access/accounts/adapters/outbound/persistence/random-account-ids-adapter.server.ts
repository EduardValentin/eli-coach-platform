import { randomUUID } from "node:crypto";

import type { AccountIdsPort } from "~/bounded-contexts/access/accounts/domain/account";

export class RandomAccountIdsAdapter implements AccountIdsPort {
  generate(): string {
    return randomUUID();
  }
}
