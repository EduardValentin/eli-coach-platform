import type { AccountSnapshot } from "~/bounded-contexts/access/accounts/domain/account";
import { ClientJourney } from "~/bounded-contexts/clients/clients/domain/client-journey";
import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  sessionContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  clientsContext,
  type ClientsFeature,
} from "~/bounded-contexts/clients/public/request-context";
import {
  waitlistContext,
  type WaitlistFeature,
} from "~/bounded-contexts/sales/public/request-context";
import { presentWaitlist } from "~/bounded-contexts/sales/waitlist/ui/shared/waitlist-presentation";
import { runtimeConfigContext } from "~/composition-root/guards/runtime-config-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader, shouldRevalidate } from "./layout";

const liveWaitlist = {
  availability: "limited",
  enabled: true,
  offer: {
    plan: "all-bundles",
    campaignSlug: "all-bundles-launch-1",
  },
} as const;

const botDetectionConfig = {
  provider: "static",
  token: "XXXX.DUMMY.TOKEN.XXXX",
} as const;

describe("public layout loader", () => {
  it("serves the live waitlist and bot-detection configuration from the request context", async () => {
    // arrange
    const args = createLoaderArgs({ session: { kind: "anonymous" } });

    // act
    const loaderData = await loader(args);

    // assert
    expect(loaderData).toEqual({
      botDetection: botDetectionConfig,
      session: { kind: "anonymous" },
      storePath: "/store",
      waitlist: presentWaitlist(liveWaitlist),
    });
  });

  it("points the coach's nav at her portal and never carries the account id", async () => {
    // arrange
    const account = buildAccount({ id: "acct_should_not_leak", role: "COACH" });
    const args = createLoaderArgs({
      session: { account, kind: "authenticated" },
    });

    // act
    const loaderData = await loader(args);

    // assert
    expect(loaderData.session).toEqual({
      kind: "authenticated",
      portalDestination: { href: "/coach", label: "Coach Portal" },
    });
    expect(JSON.stringify(loaderData)).not.toContain("acct_should_not_leak");
  });

  it("points a client before her onboarding at the step she is on", async () => {
    // arrange
    const args = createLoaderArgs({
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
    });

    // act
    const loaderData = await loader(args);

    // assert
    expect(loaderData.session).toEqual({
      kind: "authenticated",
      portalDestination: {
        href: "/client/welcome",
        label: "Finish your onboarding",
      },
    });
  });

  it("points a client account with no journey at the client portal", async () => {
    // arrange
    const args = createLoaderArgs({
      session: {
        account: buildAccount({ role: "CLIENT" }),
        kind: "authenticated",
      },
    });

    // act
    const loaderData = await loader(args);

    // assert
    expect(loaderData.session).toEqual({
      kind: "authenticated",
      portalDestination: { href: "/client", label: "Client Portal" },
    });
  });

  it("joins the store path under a non-root base path", async () => {
    // arrange
    const args = createLoaderArgs({
      appBasePath: "/app",
      session: { kind: "anonymous" },
    });

    // act
    const loaderData = await loader(args);

    // assert
    expect(loaderData.storePath).toBe("/app/store");
  });
});

describe("public layout revalidation", () => {
  it("stays put when a page changes only its query parameters", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/store");
    const nextUrl = new URL("https://eli.example/store?type=workouts");

    // act
    const revalidates = shouldRevalidate(
      createRevalidationArguments(currentUrl, nextUrl),
    );

    // assert
    expect(revalidates).toBe(false);
  });

  it("defers to the framework when the URL did not change at all", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/store?type=workouts");
    const nextUrl = new URL("https://eli.example/store?type=workouts");

    // act
    const revalidates = shouldRevalidate(
      createRevalidationArguments(currentUrl, nextUrl),
    );

    // assert
    expect(revalidates).toBe(true);
  });

  it("reloads the shell when the visitor opens another page", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/store?type=workouts");
    const nextUrl = new URL("https://eli.example/blog");

    // act
    const revalidates = shouldRevalidate(
      createRevalidationArguments(currentUrl, nextUrl),
    );

    // assert
    expect(revalidates).toBe(true);
  });

  it("stays put after a form submission on the same page", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/");
    const nextUrl = new URL("https://eli.example/");

    // act
    const revalidates = shouldRevalidate({
      ...createRevalidationArguments(currentUrl, nextUrl),
      formMethod: "POST",
    });

    // assert
    expect(revalidates).toBe(false);
  });
});

function createRevalidationArguments(currentUrl: URL, nextUrl: URL) {
  return {
    currentUrl,
    defaultShouldRevalidate: true,
    nextUrl,
  } as unknown as Parameters<typeof shouldRevalidate>[0];
}

function createLoaderArgs(options: {
  appBasePath?: string;
  journey?: ClientJourney;
  session: ResolvedSession;
}): LoaderFunctionArgs {
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

  const waitlist = {
    waitlist: { getWaitlist: vi.fn().mockResolvedValue(liveWaitlist) },
  } as unknown as WaitlistFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(runtimeConfigContext, {
        appBasePath: options.appBasePath ?? "/",
        botDetection: botDetectionConfig,
      }),
      contextEntry(clientsContext, coachingSales),
      contextEntry(sessionContext, options.session),
      contextEntry(waitlistContext, waitlist),
    ],
    request: new Request("https://eli.example/"),
  });
}

function buildAccount(overrides: Partial<AccountSnapshot>): AccountSnapshot {
  return {
    authSubjectId: "user_1",
    id: "acct_1",
    role: "CLIENT",
    ...overrides,
  };
}
