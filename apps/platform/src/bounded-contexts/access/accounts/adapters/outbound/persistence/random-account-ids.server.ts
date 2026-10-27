import { randomUUID } from "node:crypto";

import type { AccountIds } from "~/bounded-contexts/access/accounts/domain/account";

export class RandomAccountIds implements AccountIds {
  generate(): string {
    return randomUUID();
  }
}
