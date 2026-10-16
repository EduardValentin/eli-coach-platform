import { randomUUID } from "node:crypto";

import type { AccountIds } from "@eli-coach-platform/domain/account";

export class RandomAccountIds implements AccountIds {
  generate(): string {
    return randomUUID();
  }
}
