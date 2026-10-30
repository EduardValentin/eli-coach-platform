import { describe, expect, it, vi } from "vitest";

import type { AccountsPort } from "./accounts-port";
import { DeleteAccountUseCase } from "./delete-account-use-case";

describe("DeleteAccountUseCase", () => {
  it("marks the account behind the auth subject id as deleted", async () => {
    // arrange
    const accountsPort: AccountsPort = {
      findByAuthSubjectId: vi.fn(),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const deleteAccountUseCase = new DeleteAccountUseCase({ accountsPort });

    // act
    await deleteAccountUseCase.execute("auth-subject-1");

    // assert
    expect(accountsPort.softDeleteByAuthSubjectId).toHaveBeenCalledWith(
      "auth-subject-1",
    );
  });
});
