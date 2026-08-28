import type { Account } from "@eli-coach-platform/domain";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  accountContext,
  type ResolvedSession,
} from "~/features/accounts/ui/shared/account-context.server";

const mocks = vi.hoisted(() => ({
  getPlatformContainer: vi.fn(() => ({
    waitlistController: {
      getWaitlist: vi.fn(),
    },
  })),
  runtimeEnvironment: {
    APP_BASE_PATH: "/",
    ENVIRONMENT: "test",
    NODE_ENV: "test",
    TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
    TURNSTILE_SITEVERIFY_URL: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    TURNSTILE_STATIC_TOKEN: "XXXX.DUMMY.TOKEN.XXXX",
    WAITLIST_ACTIVE_OFFER_PLAN: "all-bundles",
    WAITLIST_ACTIVE_CAMPAIGN_SLUG: "all-bundles-launch-1",
    WAITLIST_CAP: 10,
    WAITLIST_MODE: false,
  },
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

vi.mock("~/server/runtime-environment.server", () => ({
  getRuntimeEnvironment: () => mocks.runtimeEnvironment,
}));

import { loader, shouldRevalidate } from "./layout";

const importTimePlatformContainerCallCount = mocks.getPlatformContainer.mock.calls.length;

describe("public layout loader", () => {
  beforeEach(() => {
    mocks.getPlatformContainer.mockClear();
  });

  it("does not resolve runtime services when the route module is imported", () => {
    // arrange
    const importTimeCallCount = importTimePlatformContainerCallCount;

    // act
    const didResolveRuntimeServicesOnImport = importTimeCallCount > 0;

    // assert
    expect(didResolveRuntimeServicesOnImport).toBe(false);
  });

  it("loads the static public shell configuration without touching runtime services", async () => {
    // arrange
    const args = createLoaderArgs({ kind: "anonymous" });
    const expectedStaticShellConfiguration = {
      session: { kind: "anonymous" },
      storePath: "/store",
      waitlist: {
        enabled: false,
        offer: {
          plan: "all-bundles",
          campaignSlug: "all-bundles-launch-1",
        },
        availability: null,
      },
    };

    // act
    const staticShellConfiguration = await loader(args);

    // assert
    expect(staticShellConfiguration).toEqual(expectedStaticShellConfiguration);
    expect(mocks.getPlatformContainer).not.toHaveBeenCalled();
  });

  it("maps an authenticated session down to its role, never the account id", async () => {
    // arrange
    const account = buildAccount({ id: "acct_should_not_leak", role: "COACH" });
    const args = createLoaderArgs({ account, kind: "authenticated" });

    // act
    const staticShellConfiguration = await loader(args);

    // assert
    expect(staticShellConfiguration.session).toEqual({
      kind: "authenticated",
      role: "COACH",
    });
    expect(JSON.stringify(staticShellConfiguration)).not.toContain(
      "acct_should_not_leak",
    );
  });

  it("joins the store path under a non-root base path", async () => {
    // arrange
    mocks.runtimeEnvironment.APP_BASE_PATH = "/app";
    const args = createLoaderArgs({ kind: "anonymous" });

    // act
    const staticShellConfiguration = await loader(args);

    // assert
    expect(staticShellConfiguration.storePath).toBe("/app/store");
    mocks.runtimeEnvironment.APP_BASE_PATH = "/";
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
});

function createRevalidationArguments(currentUrl: URL, nextUrl: URL) {
  return {
    currentUrl,
    defaultShouldRevalidate: true,
    nextUrl,
  } as unknown as Parameters<typeof shouldRevalidate>[0];
}

function createLoaderArgs(session: ResolvedSession): LoaderFunctionArgs {
  const context = new RouterContextProvider(new Map([[accountContext, session]]));

  return {
    context,
    params: {},
    request: new Request("https://eli.example/"),
  } as unknown as LoaderFunctionArgs;
}

function buildAccount(overrides: Partial<Account>): Account {
  return {
    authSubjectId: "user_1",
    deletedAt: null,
    id: "acct_1",
    role: "USER",
    ...overrides,
  };
}
