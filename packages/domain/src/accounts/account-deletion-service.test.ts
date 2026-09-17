import { describe, expect, it, vi } from "vitest";

import { AccountDeletionService } from "./account-deletion-service";
import type { Accounts } from "./accounts";

describe("AccountDeletionService", () => {
  it("marks the account behind the auth subject id as deleted", async () => {
    // arrange
    const accounts: Accounts = {
      findByAuthSubjectId: vi.fn(),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AccountDeletionService({ accounts });

    // act
    await service.markDeleted("auth-subject-1");

    // assert
    expect(accounts.softDeleteByAuthSubjectId).toHaveBeenCalledWith(
      "auth-subject-1",
    );
  });
});
