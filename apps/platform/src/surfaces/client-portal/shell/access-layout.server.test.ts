import { ClientJourney } from "~/bounded-contexts/clients/clients/domain/client-journey";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import {
  clientsContext,
  type ClientsFeature,
} from "~/bounded-contexts/clients/public/request-context";

import { middleware } from "./access-layout.server";

const [guardClientPortal] = middleware;

describe("client portal access middleware", () => {
  it("sends a visitor with no session to sign in without running anything below it", async () => {
    // arrange
    const next = vi.fn();
    const args = createMiddlewareArgs({
      session: { kind: "anonymous" },
      url: "https://evoa.fit/client?tab=plan",
    });

    // act
    const thrown = await captureThrown(() => guardClientPortal(args, next));

    // assert
    expect(next).not.toHaveBeenCalled();
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      `https://accounts.evoa.fit/sign-in?redirect_url=${encodeURIComponent(
        "https://evoa.fit/client?tab=plan",
      )}`,
    );
  });

  it("denies an account that owns another surface without running anything below it", async () => {
    // arrange
    const next = vi.fn();
    const args = createMiddlewareArgs({
      session: {
        account: buildAccount({ role: "COACH" }),
        kind: "authenticated",
      },
      url: "https://evoa.fit/client",
    });

    // act
    const thrown = await captureThrown(() => guardClientPortal(args, next));

    // assert
    expect(next).not.toHaveBeenCalled();
    expect((thrown as Response).status).toBe(403);
    await expect((thrown as Response).json()).resolves.toEqual({
      recovery: "coach-portal",
    });
  });

  it("runs the rest of the request for a CLIENT", async () => {
    // arrange
    const portalDocument = new Response("client portal");
    const next = vi.fn().mockResolvedValue(portalDocument);
    const args = createMiddlewareArgs({
      session: {
        account: buildAccount({ role: "CLIENT" }),
        kind: "authenticated",
      },
      url: "https://evoa.fit/client",
    });

    // act
    const result = await guardClientPortal(args, next);

    // assert
    expect(next).toHaveBeenCalledOnce();
    expect(result).toBe(portalDocument);
  });

  it("holds a client before her onboarding on her journey step without running anything below it", async () => {
    // arrange
    const next = vi.fn();
    const args = createMiddlewareArgs({
      journey: ClientJourney.from({
        clientId: "client_1",
        firstName: "Ana",
        gender: "female",
        lastName: "Popescu",
        welcomeSeenAt: null,
        onboardingSubmittedAt: null,
        reviewOpenedAt: null,
        detailsRequestedAt: null,
        detailsAnsweredAt: null,
        answersApprovedAt: null,
        standing: {
          status: "not-started",
          accessEndsAt: null,
          refundDue: false,
          bundleMonths: null,
          programStartsAt: null,
          paidThrough: null,
        },
      }),
      session: {
        account: buildAccount({ role: "CLIENT" }),
        kind: "authenticated",
      },
      url: "https://evoa.fit/client",
    });

    // act
    const thrown = await captureThrown(() => guardClientPortal(args, next));

    // assert
    expect(next).not.toHaveBeenCalled();
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/client/welcome",
    );
  });

  it("runs the rest of the request for a client on the page of her journey step", async () => {
    // arrange
    const welcomeDocument = new Response("welcome");
    const next = vi.fn().mockResolvedValue(welcomeDocument);
    const args = createMiddlewareArgs({
      journey: ClientJourney.from({
        clientId: "client_1",
        firstName: "Ana",
        gender: "female",
        lastName: "Popescu",
        welcomeSeenAt: null,
        onboardingSubmittedAt: null,
        reviewOpenedAt: null,
        detailsRequestedAt: null,
        detailsAnsweredAt: null,
        answersApprovedAt: null,
        standing: {
          status: "not-started",
          accessEndsAt: null,
          refundDue: false,
          bundleMonths: null,
          programStartsAt: null,
          paidThrough: null,
        },
      }),
      session: {
        account: buildAccount({ role: "CLIENT" }),
        kind: "authenticated",
      },
      url: "https://evoa.fit/client/welcome",
    });

    // act
    const result = await guardClientPortal(args, next);

    // assert
    expect(next).toHaveBeenCalledOnce();
    expect(result).toBe(welcomeDocument);
  });
});

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}

function buildAccount(overrides: Partial<SessionAccount>): SessionAccount {
  return {
    authSubjectId: "user_1",
    id: "acct_1",
    role: "CLIENT",
    ...overrides,
  };
}

function createMiddlewareArgs(options: {
  journey?: ClientJourney;
  session: ResolvedSession;
  url: string;
}): Parameters<typeof guardClientPortal>[0] {
  const coachingSales = {
    readClientPortalStanding: {
      execute: vi.fn().mockResolvedValue(
        options.journey
          ? {
              journey: options.journey,
              portal: options.journey.onboardingSubmittedAt
                ? "reachable"
                : "awaiting_onboarding",
            }
          : null,
      ),
    },
  } as unknown as ClientsFeature;

  return createRequestArgs({
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
    session: options.session,
    contexts: [contextEntry(clientsContext, coachingSales)],
    request: new Request(options.url),
  }) as unknown as Parameters<typeof guardClientPortal>[0];
}
