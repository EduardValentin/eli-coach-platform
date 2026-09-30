import { describe, expect, it, vi } from "vitest";

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

  it("keeps the onboarding page out of search results", () => {
    // arrange
    const describePage = meta;

    // act
    const tags = describePage({} as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual([
      { title: "Let's get you set up | Evoa" },
      { name: "robots", content: "noindex" },
    ]);
  });
});
