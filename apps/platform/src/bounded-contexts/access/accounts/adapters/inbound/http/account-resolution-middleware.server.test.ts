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

import { SIGN_IN_FAILED_PATH } from "~/bounded-contexts/access/public/paths";
import { createAccountResolutionMiddleware } from "~/bounded-contexts/access/accounts/adapters/inbound/http/account-resolution-middleware.server";
import type { AccountsFeature } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import { accessContext } from "~/bounded-contexts/access/public/session";

const servedAtRoot = { appBasePath: "/" };
const servedUnderBasePath = { appBasePath: "/platform" };

describe("createAccountResolutionMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an anonymous request and calls next without provisioning", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: null, userId: null });
    const execute = vi.fn();
    const { context, middleware } = createSubject({
      execute,
      portal: servedAtRoot,
    });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(createArgs({ context }), next);

    // assert
    expect(context.set).toHaveBeenCalledWith(
      accessContext,
      expect.objectContaining({
        session: {
          kind: "anonymous",
        },
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it("provisions and carries the account for an authenticated request, then calls next", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const account = {
      authSubjectId: "user_1",
      id: "acct_1",
      role: "CLIENT" as const,
    };
    const execute = vi.fn().mockResolvedValue({ account, outcome: "active" });
    const { context, middleware } = createSubject({
      execute,
      portal: servedAtRoot,
    });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(createArgs({ context }), next);

    // assert
    expect(execute).toHaveBeenCalledWith("user_1");
    expect(context.set).toHaveBeenCalledWith(
      accessContext,
      expect.objectContaining({
        session: {
          account,
          kind: "authenticated",
        },
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("revokes the session and redirects to the failure page when the account is rejected-deleted", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const execute = vi.fn().mockResolvedValue({ outcome: "rejected-deleted" });
    const { context, middleware } = createSubject({
      execute,
      portal: servedAtRoot,
    });
    const next = vi.fn();

    // act
    const settled = Promise.resolve(
      middleware(createArgs({ context }), next),
    ).catch((thrown: unknown) => thrown);

    // assert
    const thrown = await settled;
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(
      SIGN_IN_FAILED_PATH,
    );
    expect(revokeSession).toHaveBeenCalledWith("sess_1");
    expect(context.set).toHaveBeenCalledWith(
      accessContext,
      expect.objectContaining({
        session: {
          kind: "anonymous",
        },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("revokes the session and redirects to the failure page when the subject has no account", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const execute = vi
      .fn()
      .mockResolvedValue({ outcome: "rejected-unprovisioned" });
    const { context, middleware } = createSubject({
      execute,
      portal: servedAtRoot,
    });
    const next = vi.fn();

    // act
    const settled = Promise.resolve(
      middleware(createArgs({ context }), next),
    ).catch((thrown: unknown) => thrown);

    // assert
    const thrown = await settled;
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(
      SIGN_IN_FAILED_PATH,
    );
    expect(revokeSession).toHaveBeenCalledWith("sess_1");
    expect(context.set).toHaveBeenCalledWith(
      accessContext,
      expect.objectContaining({
        session: {
          kind: "anonymous",
        },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("revokes the session and redirects to the failure page when provisioning throws", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const execute = vi
      .fn()
      .mockRejectedValue(new Error("database unavailable"));
    const { context, middleware } = createSubject({
      execute,
      portal: servedAtRoot,
    });
    const next = vi.fn();

    // act
    const settled = Promise.resolve(
      middleware(createArgs({ context }), next),
    ).catch((thrown: unknown) => thrown);

    // assert
    const thrown = await settled;
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(
      SIGN_IN_FAILED_PATH,
    );
    expect(revokeSession).toHaveBeenCalledWith("sess_1");
    expect(next).not.toHaveBeenCalled();
  });

  it("still redirects to the failure page when revoking the session itself throws", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const revokeSession = vi
      .fn()
      .mockRejectedValue(new Error("clerk unavailable"));
    mocks.clerkClient.mockReturnValue({ sessions: { revokeSession } });
    const execute = vi.fn().mockResolvedValue({ outcome: "rejected-deleted" });
    const { context, middleware } = createSubject({
      execute,
      portal: servedAtRoot,
    });
    const next = vi.fn();

    // act
    const settled = Promise.resolve(
      middleware(createArgs({ context }), next),
    ).catch((thrown: unknown) => thrown);

    // assert
    const thrown = await settled;
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe(
      SIGN_IN_FAILED_PATH,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("keeps the failure page inside the app when it is served under a base path", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    mocks.clerkClient.mockReturnValue({
      sessions: { revokeSession: vi.fn().mockResolvedValue(undefined) },
    });
    const execute = vi.fn().mockResolvedValue({ outcome: "rejected-deleted" });
    const { context, middleware } = createSubject({
      execute,
      portal: servedUnderBasePath,
    });

    // act
    const settled = Promise.resolve(
      middleware(createArgs({ context }), vi.fn()),
    ).catch((thrown: unknown) => thrown);

    // assert
    const thrown = await settled;

    expect((thrown as Response).headers.get("Location")).toBe(
      "/platform/sign-in-failed",
    );
  });

  it("never loops on a request already targeting the sign-in-failed page, and still marks it anonymous", async () => {
    // arrange
    const { context, middleware } = createSubject({
      execute: vi.fn(),
      portal: servedAtRoot,
    });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({ context, url: "https://eli.example/sign-in-failed" }),
      next,
    );

    // assert
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(context.set).toHaveBeenCalledWith(
      accessContext,
      expect.objectContaining({
        session: {
          kind: "anonymous",
        },
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("never loops on a request targeting the sign-in-failed page under an app base path", async () => {
    // arrange
    const { context, middleware } = createSubject({
      execute: vi.fn(),
      portal: servedUnderBasePath,
    });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({
        context,
        url: "https://eli.example/platform/sign-in-failed",
      }),
      next,
    );

    // assert
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(context.set).toHaveBeenCalledWith(
      accessContext,
      expect.objectContaining({
        session: {
          kind: "anonymous",
        },
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("resolves the account for a path that merely ends in the failure page's name", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ sessionId: "sess_1", userId: "user_1" });
    const account = {
      authSubjectId: "user_1",
      id: "acct_1",
      role: "CLIENT" as const,
    };
    const execute = vi.fn().mockResolvedValue({ account, outcome: "active" });
    const { context, middleware } = createSubject({
      execute,
      portal: servedAtRoot,
    });
    const next = vi.fn().mockResolvedValue(new Response());

    // act
    await middleware(
      createArgs({ context, url: "https://eli.example/store/sign-in-failed" }),
      next,
    );

    // assert
    expect(execute).toHaveBeenCalledWith("user_1");
    expect(context.set).toHaveBeenCalledWith(
      accessContext,
      expect.objectContaining({
        session: {
          account,
          kind: "authenticated",
        },
      }),
    );
  });
});

function createSubject(options: {
  execute: ReturnType<typeof vi.fn>;
  portal: { appBasePath: string };
}) {
  const accounts = {
    portal: options.portal,
    provisionAccountUseCase: { execute: options.execute },
  } as unknown as AccountsFeature;
  const context = { set: vi.fn() } as unknown as RouterContextProvider & {
    set: ReturnType<typeof vi.fn>;
  };

  return { context, middleware: createAccountResolutionMiddleware(accounts) };
}

function createArgs(options: { context: RouterContextProvider; url?: string }) {
  const url = options.url ?? "https://eli.example/store";

  return {
    context: options.context,
    params: {},
    pattern: "/",
    request: new Request(url),
    url: new URL(url),
  } as never;
}
