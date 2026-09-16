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

import { createAccountResolutionMiddleware } from "~/features/accounts/server/account-resolution-middleware.server";
import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext, SIGN_IN_FAILED_PATH } from "~/features/accounts/server/guards/session-context.server";

const servedAtRoot = { appBasePath: "/" };
const servedUnderBasePath = { appBasePath: "/platform" };

describe("createAccountResolutionMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an anonymous request and calls next without provisioning", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: null, userId: null });
    const ensureAccount = vi.fn();
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount, portal: servedAtRoot });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(createArgs({ context }), next);

    // assert
    expect(context.set).toHaveBeenCalledWith(sessionContext, { kind: "anonymous" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(ensureAccount).not.toHaveBeenCalled();
  });

  it("provisions and carries the account for an authenticated request, then calls next", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const account = { authSubjectId: "user_1", deletedAt: null, id: "acct_1", role: "CLIENT" as const };
    const ensureAccount = vi.fn().mockResolvedValue({ account, outcome: "active" });
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount, portal: servedAtRoot });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(createArgs({ context }), next);

    // assert
    expect(ensureAccount).toHaveBeenCalledWith("user_1");
    expect(context.set).toHaveBeenCalledWith(sessionContext, {
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
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount, portal: servedAtRoot });
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
    expect(context.set).toHaveBeenCalledWith(sessionContext, { kind: "anonymous" });
    expect(next).not.toHaveBeenCalled();
  });

  it("revokes the session and redirects to the failure page when the subject has no account", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const ensureAccount = vi.fn().mockResolvedValue({ outcome: "rejected-unprovisioned" });
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount, portal: servedAtRoot });
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
    expect(context.set).toHaveBeenCalledWith(sessionContext, { kind: "anonymous" });
    expect(next).not.toHaveBeenCalled();
  });

  it("revokes the session and redirects to the failure page when ensureAccount throws", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const ensureAccount = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount, portal: servedAtRoot });
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
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount, portal: servedAtRoot });
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

  it("keeps the failure page inside the app when it is served under a base path", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    mocks.clerkClient.mockReturnValue({
      sessions: { revokeSession: vi.fn().mockResolvedValue(undefined) },
    });
    const ensureAccount = vi.fn().mockResolvedValue({ outcome: "rejected-deleted" });
    const middleware = createAccountResolutionMiddleware();

    // act
    const settled = Promise.resolve(
      middleware(
        createArgs({ context: createFakeContext({ ensureAccount, portal: servedUnderBasePath }) }),
        vi.fn(),
      ),
    ).catch((thrown: unknown) => thrown);

    // assert
    const thrown = await settled;

    expect((thrown as Response).headers.get("Location")).toBe(
      "/platform/sign-in-failed",
    );
  });

  it("never loops on a request already targeting the sign-in-failed page, and still marks it anonymous", async () => {
    // arrange
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount: vi.fn(), portal: servedAtRoot });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({ context, url: "https://eli.example/sign-in-failed" }),
      next,
    );

    // assert
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(context.set).toHaveBeenCalledWith(sessionContext, { kind: "anonymous" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("never loops on a request targeting the sign-in-failed page under an app base path", async () => {
    // arrange
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount: vi.fn(), portal: servedUnderBasePath });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({ context, url: "https://eli.example/platform/sign-in-failed" }),
      next,
    );

    // assert
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(context.set).toHaveBeenCalledWith(sessionContext, { kind: "anonymous" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("resolves the account for a path that merely ends in the failure page's name", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const account = {
      authSubjectId: "user_1",
      deletedAt: null,
      id: "acct_1",
      role: "CLIENT" as const,
    };
    const ensureAccount = vi.fn().mockResolvedValue({ account, outcome: "active" });
    const middleware = createAccountResolutionMiddleware();
    const context = createFakeContext({ ensureAccount, portal: servedAtRoot });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({ context, url: "https://eli.example/store/sign-in-failed" }),
      next,
    );

    // assert
    expect(ensureAccount).toHaveBeenCalledWith("user_1");
    expect(context.set).toHaveBeenCalledWith(sessionContext, {
      account,
      kind: "authenticated",
    });
  });
});

function createFakeContext(options: {
  ensureAccount: ReturnType<typeof vi.fn>;
  portal: { appBasePath: string };
}) {
  const accounts = {
    portal: options.portal,
    provisioning: { ensureAccount: options.ensureAccount },
  } as unknown as AccountsFeature;

  return {
    get: vi.fn((key: unknown) => (key === accountsContext ? accounts : undefined)),
    set: vi.fn(),
  } as unknown as RouterContextProvider & { set: ReturnType<typeof vi.fn> };
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
