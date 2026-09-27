import { describe, expect, it, vi } from "vitest";

import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { action, loader, meta } from "./welcome-page";

describe("welcome page route", () => {
  it("loads her welcome from the client journey", async () => {
    // arrange
    const { args, clientJourney } = routeArguments();

    // act
    const page = await loader(args);

    // assert
    expect(page).toEqual({ firstName: "Ana", wording: "five-part" });
    expect(clientJourney.loadWelcome).toHaveBeenCalledWith(args);
  });

  it("hands her start to the client journey", async () => {
    // arrange
    const { args, clientJourney, onboardingRedirect } = routeArguments();

    // act
    const response = await action(args);

    // assert
    expect(response).toBe(onboardingRedirect);
    expect(clientJourney.markWelcomeSeen).toHaveBeenCalledWith(args);
  });

  it("keeps the welcome screen out of search results", () => {
    // arrange
    const describePage = meta;

    // act
    const tags = describePage({} as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual([
      { title: "Welcome | Evoa" },
      { name: "robots", content: "noindex" },
    ]);
  });
});

function routeArguments() {
  const onboardingRedirect = new Response(null, { status: 302 });
  const clientJourney = {
    loadWelcome: vi
      .fn()
      .mockResolvedValue({ firstName: "Ana", wording: "five-part" }),
    markWelcomeSeen: vi.fn().mockResolvedValue(onboardingRedirect),
  };
  const args = createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, {
        clientJourney,
      } as unknown as CoachingSalesFeature),
    ],
    request: new Request("https://evoa.fit/client/welcome"),
  });

  return { args, clientJourney, onboardingRedirect };
}
