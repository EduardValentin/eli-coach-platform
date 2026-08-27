import type { RouterContextProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  clerkClient: vi.fn(),
}));

// @clerk/react-router/server is the third-party auth SDK boundary (not our own
// API layer), so mocking it here is the accepted seam per AGENTS.md.
vi.mock("@clerk/react-router/server", () => ({
  getAuth: mocks.getAuth,
  clerkClient: mocks.clerkClient,
}));

import {
  accountContext,
  SIGN_IN_FAILED_PATH,
} from "~/features/accounts/ui/shared/account-context.server";
import { createAccountResolutionMiddleware } from "./account-resolution-middleware.server";

describe("createAccountResolutionMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an anonymous request and calls next without provisioning", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: null, userId: null });
    const ensureAccount = vi.fn();
    const middleware = createAccountResolutionMiddleware(() => ({
      accountProvisioningService: { ensureAccount },
    }));
    const context = createFakeContext();
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(createArgs({ context }), next);

    // assert
    expect(context.set).toHaveBeenCalledWith(accountContext, { kind: "anonymous" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(ensureAccount).not.toHaveBeenCalled();
  });

  it("provisions and carries the account for an authenticated request, then calls next", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const account = { authSubjectId: "user_1", deletedAt: null, id: "acct_1", role: "USER" as const };
    const ensureAccount = vi.fn().mockResolvedValue({ account, outcome: "active" });
    const middleware = createAccountResolutionMiddleware(() => ({
      accountProvisioningService: { ensureAccount },
    }));
    const context = createFakeContext();
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(createArgs({ context }), next);

    // assert
    expect(ensureAccount).toHaveBeenCalledWith("user_1");
    expect(context.set).toHaveBeenCalledWith(accountContext, {
      account,
      kind: "authenticated",
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("revokes the session and redirects to the failure page when the account is rejected-deleted", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const ensureAccount = vi.fn().mockResolvedValue({ outcome: "rejected-deleted" });
    const middleware = createAccountResolutionMiddleware(() => ({
      accountProvisioningService: { ensureAccount },
    }));
    const context = createFakeContext();
    const next = vi.fn();

    // act
    const settled = Promise.resolve(middleware(createArgs({ context }), next)).catch(
      (thrown: unknown) => thrown,
    );

    // assert
    const thrown = await settled;
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(SIGN_IN_FAILED_PATH);
    expect(revokeSession).toHaveBeenCalledWith("sess_1");
    expect(context.set).toHaveBeenCalledWith(accountContext, { kind: "anonymous" });
    expect(next).not.toHaveBeenCalled();
  });

  it("revokes the session and redirects to the failure page when ensureAccount throws", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const ensureAccount = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const middleware = createAccountResolutionMiddleware(() => ({
      accountProvisioningService: { ensureAccount },
    }));
    const context = createFakeContext();
    const next = vi.fn();

    // act
    const settled = Promise.resolve(middleware(createArgs({ context }), next)).catch(
      (thrown: unknown) => thrown,
    );

    // assert
    const thrown = await settled;
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(SIGN_IN_FAILED_PATH);
    expect(revokeSession).toHaveBeenCalledWith("sess_1");
    expect(next).not.toHaveBeenCalled();
  });

  it("still redirects to the failure page when revoking the session itself throws", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockRejectedValue(new Error("clerk unavailable"));
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const ensureAccount = vi.fn().mockResolvedValue({ outcome: "rejected-deleted" });
    const middleware = createAccountResolutionMiddleware(() => ({
      accountProvisioningService: { ensureAccount },
    }));
    const context = createFakeContext();
    const next = vi.fn();

    // act
    const settled = Promise.resolve(middleware(createArgs({ context }), next)).catch(
      (thrown: unknown) => thrown,
    );

    // assert
    const thrown = await settled;
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(SIGN_IN_FAILED_PATH);
    expect(next).not.toHaveBeenCalled();
  });

  it("never loops on a request already targeting the sign-in-failed page", async () => {
    // arrange
    const middleware = createAccountResolutionMiddleware(() => ({
      accountProvisioningService: { ensureAccount: vi.fn() },
    }));
    const context = createFakeContext();
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({ context, url: "https://eli.example/sign-in-failed" }),
      next,
    );

    // assert
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("never loops on a request targeting the sign-in-failed page under an app base path", async () => {
    // arrange
    const middleware = createAccountResolutionMiddleware(() => ({
      accountProvisioningService: { ensureAccount: vi.fn() },
    }));
    const context = createFakeContext();
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({ context, url: "https://eli.example/platform/sign-in-failed" }),
      next,
    );

    // assert
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

function createFakeContext() {
  return { set: vi.fn() } as unknown as RouterContextProvider & { set: ReturnType<typeof vi.fn> };
}

function createArgs(options: {
  context: RouterContextProvider;
  url?: string;
}) {
  const url = options.url ?? "https://eli.example/store";

  return {
    context: options.context,
    params: {},
    pattern: "/",
    request: new Request(url),
    url: new URL(url),
  } as never;
}
