import { describe, expect, it, vi } from "vitest";

import type { OnboardingPage } from "~/features/client-onboarding/public/onboarding";
import type { ClientOnboardingFeature } from "~/features/client-onboarding/server/client-onboarding-composition.server";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./onboarding-page";

describe("onboarding page route", () => {
  it("loads her onboarding from the client onboarding controller", async () => {
    // arrange
    const onboardingPage = { clientId: "client_ana", resumed: false };
    const controller = {
      loadOnboarding: vi.fn().mockResolvedValue(onboardingPage),
    };
    const args = createRequestArgs({
      contexts: [
        contextEntry(clientOnboardingContext, {
          controller,
        } as unknown as ClientOnboardingFeature),
      ],
      request: new Request("https://evoa.fit/client/onboarding"),
    });

    // act
    const page = await loader(args);

    // assert
    expect(page).toBe(onboardingPage);
    expect(controller.loadOnboarding).toHaveBeenCalledWith(args);
  });

  it("titles her first onboarding and keeps it out of search results", () => {
    // arrange
    const data = { mode: "wizard" } as OnboardingPage;

    // act
    const tags = meta({ data } as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual([
      { title: "Let's get you set up | Evoa" },
      { name: "robots", content: "noindex" },
    ]);
  });

  it("titles the answer to her coach's request and keeps it out of search results", () => {
    // arrange
    const data = { mode: "answer" } as OnboardingPage;

    // act
    const tags = meta({ data } as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual([
      { title: "A few more details | Evoa" },
      { name: "robots", content: "noindex" },
    ]);
  });

  it("falls back to the onboarding title when the page could not load", () => {
    // arrange
    const data = undefined;

    // act
    const tags = meta({ data } as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual([
      { title: "Let's get you set up | Evoa" },
      { name: "robots", content: "noindex" },
    ]);
  });
});
