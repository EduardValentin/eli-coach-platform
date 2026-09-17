import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import { waitlistContext } from "~/features/waitlist/server/guards/waitlist-context.server";
import type { WaitlistFeature } from "~/features/waitlist/server/waitlist-composition.server";
import { presentWaitlist } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { runtimeConfigContext } from "~/server/guards/runtime-config-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

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

  it("maps an authenticated session down to its role, never the account id", async () => {
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
      role: "COACH",
    });
    expect(JSON.stringify(loaderData)).not.toContain("acct_should_not_leak");
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
  session: ResolvedSession;
}): LoaderFunctionArgs {
  const waitlist = {
    waitlist: { getWaitlist: vi.fn().mockResolvedValue(liveWaitlist) },
  } as unknown as WaitlistFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(runtimeConfigContext, {
        appBasePath: options.appBasePath ?? "/",
        botDetection: botDetectionConfig,
      }),
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
