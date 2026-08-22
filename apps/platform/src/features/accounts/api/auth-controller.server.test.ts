import { AccountProvisioningService } from "@eli-coach-platform/domain";
import type {
  IdentityAuthentication,
  IdentityProvider,
} from "@eli-coach-platform/infrastructure/identity/server";
import { describe, expect, it } from "vitest";

import { AuthController } from "./auth-controller.server";

const authenticated: IdentityAuthentication = {
  status: "authenticated",
  identity: { email: null, sessionId: "sess_1", subjectId: "user_1" },
};

type ProviderOverrides = {
  authentication?: IdentityAuthentication;
  onSignOut?: (sessionId: string) => void;
};

const createIdentityProvider = (overrides: ProviderOverrides = {}) => {
  const provider: IdentityProvider = {
    authenticate: async () => overrides.authentication ?? { status: "anonymous" },
    buildSignInUrl: (returnUrl) =>
      `https://portal.example/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`,
    signOut: async (sessionId) => overrides.onSignOut?.(sessionId),
  };

  return provider;
};

const createController = (options: {
  identityProvider: IdentityProvider;
  provisionFails?: boolean;
  role?: "USER" | "CLIENT" | "COACH";
}) =>
  new AuthController({
    identityProvider: options.identityProvider,
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
            deleted: false,
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

  it("revokes the session before showing the failure page when provisioning fails", async () => {
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
    const response = await controller.completeSignIn(
      new Request("http://localhost:3000/auth/complete?redirect_url=%2Fcoach"),
    );

    // assert
    expect(revoked).toEqual(["sess_1"]);
    expect(response.headers.get("Location")).toBe("/sign-in-failed");
    expect(response.headers.get("Set-Cookie")).toContain("__session=;");
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

  it("revokes the session and clears its cookies on sign-out", async () => {
    // arrange
    const revoked: string[] = [];
    const controller = createController({
      identityProvider: createIdentityProvider({
        authentication: authenticated,
        onSignOut: (sessionId) => revoked.push(sessionId),
      }),
    });

    // act
    const response = await controller.signOut(
      new Request("http://localhost:3000/auth/sign-out", { method: "POST" }),
    );

    // assert
    expect(revoked).toEqual(["sess_1"]);
    expect(response.headers.get("Location")).toBe("/store");
    expect(response.headers.get("Set-Cookie")).toContain("__client_uat=;");
  });
});
