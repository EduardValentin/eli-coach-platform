import { describe, expect, it, vi } from "vitest";

import type { AccountsPort } from "./accounts-port";
import { DeleteAccountUseCase } from "./delete-account-use-case";

describe("DeleteAccountUseCase", () => {
  it("marks the account behind the auth subject id as deleted", async () => {
    // arrange
    const accounts: AccountsPort = {
      findByAuthSubjectId: vi.fn(),
      insert: vi.fn(),
      softDeleteByAuthSubjectId: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new DeleteAccountUseCase({ accounts });

    // act
    await useCase.execute("auth-subject-1");

    // assert
    expect(accounts.softDeleteByAuthSubjectId).toHaveBeenCalledWith(
      "auth-subject-1",
    );
  });
});
