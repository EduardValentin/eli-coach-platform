import { describe, expect, it, vi } from "vitest";

import type {
  ApiKeyAccountResolutionDto,
  ApiKeyAccountsFacade,
} from "~/bounded-contexts/access/public/api-key-accounts-facade";

import { ApiKeyManagementAuthenticatorAdapter } from "./api-key-management-authenticator-adapter.server";

function facadeResolving(
  resolution: ApiKeyAccountResolutionDto,
): ApiKeyAccountsFacade {
  return { resolve: vi.fn().mockResolvedValue(resolution) };
}

describe("ApiKeyManagementAuthenticatorAdapter#authenticate", () => {
  it("admits the coach's key as her account", async () => {
    // arrange
    const apiKeyAccountsFacade = facadeResolving({
      status: "resolved",
      account: { id: "account-coach", role: "COACH" },
    });
    const apiKeyManagementAuthenticatorAdapter =
      new ApiKeyManagementAuthenticatorAdapter(apiKeyAccountsFacade);

    // act
    const result = await apiKeyManagementAuthenticatorAdapter.authenticate({
      authorizationHeader: "Bearer ak_coach",
    });

    // assert
    expect(result).toEqual({
      status: "authenticated",
      principal: { kind: "user", id: "account-coach" },
    });
    expect(apiKeyAccountsFacade.resolve).toHaveBeenCalledWith(
      "Bearer ak_coach",
    );
  });

  it.each<[string, ApiKeyAccountResolutionDto, string]>([
    [
      "a client's key",
      { status: "resolved", account: { id: "account-client", role: "CLIENT" } },
      "forbidden",
    ],
    [
      "a key whose user has no account",
      { status: "unprovisioned" },
      "forbidden",
    ],
    ["a key Clerk does not accept", { status: "invalid" }, "unauthenticated"],
    ["a key Clerk could not check", { status: "unavailable" }, "unavailable"],
  ])("answers %s as %s", async (_label, resolution, status) => {
    // arrange
    const apiKeyManagementAuthenticatorAdapter =
      new ApiKeyManagementAuthenticatorAdapter(facadeResolving(resolution));

    // act
    const result = await apiKeyManagementAuthenticatorAdapter.authenticate({
      authorizationHeader: "Bearer ak_any",
    });

    // assert
    expect(result).toEqual({ status });
  });
});
