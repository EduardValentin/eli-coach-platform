import { randomUUID } from "node:crypto";

import type { ProgramIdsPort } from "~/bounded-contexts/programs/training-programs/domain/program";

export class RandomProgramIdsAdapter implements ProgramIdsPort {
  generate(): string {
    return randomUUID();
  }
}
