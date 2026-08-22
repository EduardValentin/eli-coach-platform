import { describe, expect, it } from "vitest";

import {
  AccountDeletedError,
  AccountProvisioningService,
  type AccountRepository,
  type AccountSnapshot,
} from "./account-provisioning-service";

describe("AccountProvisioningService", () => {
  const createRepository = (existing: AccountSnapshot | null = null) => {
    const calls: { authSubjectId: string; roleWhenNew: string }[] = [];
    const repository: AccountRepository = {
      provisionByAuthSubjectId: async (options) => {
        calls.push(options);

        return (
          existing ?? {
            id: "11111111-1111-1111-1111-111111111111",
            authSubjectId: options.authSubjectId,
            role: options.roleWhenNew,
            deleted: false,
          }
        );
      },
    };

    return { calls, repository };
  };

  it("gives a new account the general-user role", async () => {
    // arrange
    const { calls, repository } = createRepository();
    const service = new AccountProvisioningService({ repository });

    // act
    const account = await service.resolveAccount("user_new");

    // assert
    expect(calls[0]?.roleWhenNew).toBe("USER");
    expect(account.role).toBe("USER");
  });

  it("gives the configured bootstrap identity the coach role", async () => {
    // arrange
    const { calls, repository } = createRepository();
    const service = new AccountProvisioningService({
      bootstrapCoachAuthSubjectId: "user_coach",
      repository,
    });

    // act
    await service.resolveAccount("user_coach");

    // assert
    expect(calls[0]?.roleWhenNew).toBe("COACH");
  });

  it("does not elevate any other identity to coach", async () => {
    // arrange
    const { calls, repository } = createRepository();
    const service = new AccountProvisioningService({
      bootstrapCoachAuthSubjectId: "user_coach",
      repository,
    });

    // act
    await service.resolveAccount("user_someone_else");

    // assert
    expect(calls[0]?.roleWhenNew).toBe("USER");
  });

  it("preserves the role an existing account already holds", async () => {
    // arrange
    const { repository } = createRepository({
      id: "22222222-2222-2222-2222-222222222222",
      authSubjectId: "user_returning",
      role: "CLIENT",
      deleted: false,
    });
    const service = new AccountProvisioningService({ repository });

    // act
    const account = await service.resolveAccount("user_returning");

    // assert
    expect(account.role).toBe("CLIENT");
  });

  it("refuses to sign in to a deleted account", async () => {
    // arrange
    const { repository } = createRepository({
      id: "33333333-3333-3333-3333-333333333333",
      authSubjectId: "user_deleted",
      role: "USER",
      deleted: true,
    });
    const service = new AccountProvisioningService({ repository });

    // act
    const resolveDeletedAccount = () => service.resolveAccount("user_deleted");

    // assert
    await expect(resolveDeletedAccount).rejects.toThrow(AccountDeletedError);
    await expect(resolveDeletedAccount).rejects.toThrow(
      "Account for user_deleted has been deleted.",
    );
  });
});
