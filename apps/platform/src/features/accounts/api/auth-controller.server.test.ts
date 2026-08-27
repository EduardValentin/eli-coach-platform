import { AccountProvisioningService } from "@eli-coach-platform/domain";
import type {
  IdentityAuthentication,
  IdentityProvider,
} from "@eli-coach-platform/infrastructure/identity/server";
import { describe, expect, it } from "vitest";

import { AuthController } from "./auth-controller.server";

const authenticated: IdentityAuthentication = {
  headers: new Headers(),
  status: "authenticated",
  identity: { sessionId: "sess_1", subjectId: "user_1" },
};

type ProviderOverrides = {
  authentication?: IdentityAuthentication;
  onSignOut?: (sessionId: string) => void;
};

const createIdentityProvider = (overrides: ProviderOverrides = {}) => {
  const provider: IdentityProvider = {
    authenticate: async () =>
      overrides.authentication ?? { headers: new Headers(), status: "anonymous" },
    buildSignInUrl: (returnUrl) =>
      `https://portal.example/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`,
    signOut: async (sessionId) => overrides.onSignOut?.(sessionId),
  };

  return provider;
};

const createController = (options: {
  appBasePath?: string;
  deleted?: boolean;
  identityProvider: IdentityProvider;
  provisionFails?: boolean;
  role?: "USER" | "CLIENT" | "COACH";
}) =>
  new AuthController({
    appBasePath: options.appBasePath ?? "/",
    identityProvider: options.identityProvider,
    identityPublishableKey: "pk_test_publishable",
    provisioningService: new AccountProvisioningService({
      repository: {
        provisionByAuthSubjectId: async (command) => {
          if (options.provisionFails) {
            throw new Error("database is down");
          }

          return {
            id: "11111111-1111-1111-1111-111111111111",
            authSubjectId: command.authSubjectId,
            role: options.role ?? command.roleWhenNew,
            deleted: options.deleted ?? false,
          };
        },
      },
    }),
  });

describe("AuthController", () => {
  it("sends the visitor to the portal with the destination carried through", () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider(),
    });

    // act
    const response = controller.startSignIn(
      new Request("http://localhost:3000/auth/sign-in?redirect_url=%2Fcoach"),
    );

    // assert
    expect(response.headers.get("Location")).toBe(
      "https://portal.example/sign-in?redirect_url=" +
        encodeURIComponent("http://localhost:3000/auth/complete?redirect_url=%2Fcoach"),
    );
  });

  it("refuses an off-site destination and offers the Store instead", () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider(),
    });

    // act
    const response = controller.startSignIn(
      new Request("http://localhost:3000/auth/sign-in?redirect_url=https%3A%2F%2Fevil.example"),
    );

    // assert
    expect(response.headers.get("Location")).toContain(
      encodeURIComponent("http://localhost:3000/auth/complete?redirect_url=%2Fstore"),
    );
  });

  it("returns Clerk's redirect untouched on the first pass through completion", async () => {
    // arrange
    const handshake = new Response(null, {
      headers: { location: "https://fapi.example/v1/client/handshake" },
      status: 307,
    });
    const controller = createController({
      identityProvider: createIdentityProvider({
        authentication: { status: "redirect", response: handshake },
      }),
    });

    // act
    const response = await controller.completeSignIn(
      new Request("http://localhost:3000/auth/complete"),
    );

    // assert
    expect(response).toBe(handshake);
  });

  it("returns the visitor to the validated destination once provisioned", async () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider({ authentication: authenticated }),
    });

    // act
    const response = await controller.completeSignIn(
      new Request("http://localhost:3000/auth/complete?redirect_url=%2Fcoach"),
    );

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/coach");
  });

  it("revokes the session before showing the failure page when the account is gone", async () => {
    // arrange
    const revoked: string[] = [];
    const controller = createController({
      deleted: true,
      identityProvider: createIdentityProvider({
        authentication: authenticated,
        onSignOut: (sessionId) => revoked.push(sessionId),
      }),
    });

    // act
    const response = await controller.completeSignIn(
      new Request("http://localhost:3000/auth/complete?redirect_url=%2Fcoach"),
    );

    // assert
    expect(revoked).toEqual(["sess_1"]);
    expect(response.headers.get("Location")).toBe("/sign-in-failed");
    expect(response.headers.get("Set-Cookie")).toContain("__session=;");
  });

  it("clears the suffixed cookies the provider actually set, not just the bare names", async () => {
    // arrange
    const controller = createController({
      deleted: true,
      identityProvider: createIdentityProvider({ authentication: authenticated }),
    });

    // act
    const response = await controller.completeSignIn(
      new Request("http://localhost:3000/auth/complete", {
        headers: { Cookie: "__session=stale; __session_0ocFdLKf=stale-suffixed" },
      }),
    );

    // assert
    const cleared = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split("=")[0]);

    expect(cleared).toContain("__session_0ocFdLKf");
  });

  it("keeps a session the visitor just established when the database is down", async () => {
    // arrange
    const revoked: string[] = [];
    const controller = createController({
      identityProvider: createIdentityProvider({
        authentication: authenticated,
        onSignOut: (sessionId) => revoked.push(sessionId),
      }),
      provisionFails: true,
    });

    // act
    const completing = controller.completeSignIn(
      new Request("http://localhost:3000/auth/complete?redirect_url=%2Fcoach"),
    );

    // assert
    await expect(completing).rejects.toThrow("database is down");
    expect(revoked).toEqual([]);
  });

  it("shows the failure page when the portal established no session", async () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider(),
    });

    // act
    const response = await controller.completeSignIn(
      new Request("http://localhost:3000/auth/complete"),
    );

    // assert
    expect(response.headers.get("Location")).toBe("/sign-in-failed");
  });

  it("reports an anonymous session without touching the database", async () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider(),
    });

    // act
    const response = await controller.getSession(
      new Request("http://localhost:3000/api/session"),
    );

    // assert
    expect(await response.json()).toEqual({ status: "anonymous" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports the role and nothing else for a signed-in visitor", async () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider({ authentication: authenticated }),
      role: "COACH",
    });

    // act
    const response = await controller.getSession(
      new Request("http://localhost:3000/api/session"),
    );

    // assert
    expect(await response.json()).toEqual({ status: "authenticated", role: "COACH" });
  });

  it("serves the publishable key so a build carries no identity configuration", async () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider({ authentication: authenticated }),
    });

    // act
    const response = controller.getIdentityConfig();

    // assert
    expect(await response.json()).toEqual({ publishableKey: "pk_test_publishable" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps a database outage a failure rather than reporting it as signed out", async () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider({ authentication: authenticated }),
      provisionFails: true,
    });

    // act
    const failing = controller.getSession(
      new Request("http://localhost:3000/api/session"),
    );

    // assert
    await expect(failing).rejects.toThrow("database is down");
  });

  it("returns Clerk's redirect untouched when a portal request needs a handshake", async () => {
    // arrange
    const handshake = new Response(null, {
      headers: { location: "https://fapi.example/v1/client/handshake" },
      status: 307,
    });
    const controller = createController({
      identityProvider: createIdentityProvider({
        authentication: { status: "redirect", response: handshake },
      }),
    });

    // act
    const authorization = await controller.authorizePortal({
      portal: "client",
      request: new Request("http://localhost:3000/client"),
    });

    // assert
    expect(authorization).toEqual({ response: handshake, status: "denied" });
  });

  it("sends a signed-out visitor to sign in, remembering where she was aiming", async () => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider(),
    });

    // act
    const authorization = await controller.authorizePortal({
      portal: "coach",
      request: new Request("http://localhost:3000/coach?tab=clients"),
    });

    // assert
    expect(authorization.status).toBe("denied");
    expect(
      authorization.status === "denied"
        ? authorization.response.headers.get("Location")
        : null,
    ).toBe("/auth/sign-in?redirect_url=%2Fcoach%3Ftab%3Dclients");
  });

  it("strips the base path so the destination is not doubled on the way back", async () => {
    // arrange
    const controller = createController({
      appBasePath: "/eli-coach-platform",
      identityProvider: createIdentityProvider(),
    });

    // act
    const authorization = await controller.authorizePortal({
      portal: "client",
      request: new Request("http://localhost:3000/eli-coach-platform/client"),
    });

    // assert
    expect(
      authorization.status === "denied"
        ? authorization.response.headers.get("Location")
        : null,
    ).toBe("/eli-coach-platform/auth/sign-in?redirect_url=%2Fclient");
  });

  it("carries the base path on a denial, which middleware redirects never get for free", async () => {
    // arrange
    const controller = createController({
      appBasePath: "/eli-coach-platform",
      identityProvider: createIdentityProvider({ authentication: authenticated }),
      role: "USER",
    });

    // act
    const authorization = await controller.authorizePortal({
      portal: "coach",
      request: new Request("http://localhost:3000/eli-coach-platform/coach"),
    });

    // assert
    expect(
      authorization.status === "denied"
        ? authorization.response.headers.get("Location")
        : null,
    ).toBe("/eli-coach-platform/403");
  });

  it.each([
    ["CLIENT", "client"],
    ["COACH", "coach"],
  ] as const)("admits a %s to the %s portal", async (role, portal) => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider({ authentication: authenticated }),
      role,
    });

    // act
    const authorization = await controller.authorizePortal({
      portal,
      request: new Request(`http://localhost:3000/${portal}`),
    });

    // assert
    expect(authorization).toMatchObject({ role, status: "granted" });
  });

  it.each([
    ["CLIENT", "coach"],
    ["COACH", "client"],
    ["USER", "client"],
    ["USER", "coach"],
  ] as const)("refuses a %s at the %s portal", async (role, portal) => {
    // arrange
    const controller = createController({
      identityProvider: createIdentityProvider({ authentication: authenticated }),
      role,
    });

    // act
    const authorization = await controller.authorizePortal({
      portal,
      request: new Request(`http://localhost:3000/${portal}`),
    });

    // assert
    expect(
      authorization.status === "denied"
        ? authorization.response.headers.get("Location")
        : null,
    ).toBe("/403");
  });

  it("drops the session of an identity whose account was deleted", async () => {
    // arrange
    const revoked: string[] = [];
    const controller = createController({
      deleted: true,
      identityProvider: createIdentityProvider({
        authentication: authenticated,
        onSignOut: (sessionId) => revoked.push(sessionId),
      }),
    });

    // act
    const authorization = await controller.authorizePortal({
      portal: "client",
      request: new Request("http://localhost:3000/client"),
    });

    // assert
    expect(revoked).toEqual(["sess_1"]);
    expect(
      authorization.status === "denied"
        ? authorization.response.headers.get("Location")
        : null,
    ).toBe("/sign-in-failed");
  });

  it("carries the base path into the URL it asks Clerk to return to", () => {
    // arrange
    const controller = createController({
      appBasePath: "/eli-coach-platform",
      identityProvider: createIdentityProvider(),
    });

    // act
    const response = controller.startSignIn(
      new Request("http://localhost:3000/eli-coach-platform/auth/sign-in?redirect_url=%2Fcoach"),
    );

    // assert
    expect(response.headers.get("Location")).toContain(
      encodeURIComponent(
        "http://localhost:3000/eli-coach-platform/auth/complete?redirect_url=%2Fcoach",
      ),
    );
  });

  it.each([
    ["the session endpoint", (controller: AuthController) =>
      controller.getSession(new Request("http://localhost:3000/api/session"))],
    ["sign-in completion", (controller: AuthController) =>
      controller.completeSignIn(new Request("http://localhost:3000/auth/complete"))],
  ])(
    "puts the cookies Clerk asked for onto the response from %s",
    async (_description, act) => {
      // arrange
      // A production instance resolves its handshake exactly this way: cookies
      // to set, and no redirect. Dropping them signs nobody in.
      const headers = new Headers();
      headers.append("Set-Cookie", "__session=fresh; Path=/");
      headers.append("Set-Cookie", "__client_uat=1; Path=/");
      const controller = createController({
        identityProvider: createIdentityProvider({
          authentication: { ...authenticated, headers },
        }),
      });

      // act
      const response = await act(controller);

      // assert
      expect(response.headers.getSetCookie()).toEqual([
        "__session=fresh; Path=/",
        "__client_uat=1; Path=/",
      ]);
    },
  );

  it("carries those cookies through a granted portal authorization", async () => {
    // arrange
    const headers = new Headers();
    headers.append("Set-Cookie", "__session=fresh; Path=/");
    const controller = createController({
      identityProvider: createIdentityProvider({
        authentication: { ...authenticated, headers },
      }),
      role: "CLIENT",
    });

    // act
    const authorization = await controller.authorizePortal({
      portal: "client",
      request: new Request("http://localhost:3000/client"),
    });

    // assert
    expect(
      authorization.status === "granted"
        ? authorization.headers.getSetCookie()
        : null,
    ).toEqual(["__session=fresh; Path=/"]);
  });
});
