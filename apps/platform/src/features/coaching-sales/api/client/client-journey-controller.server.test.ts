import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  ClientJourney,
  type MarkWelcomeSeenUseCase,
  type ReadClientJourneyUseCase,
} from "@eli-coach-platform/domain/client-journey";
import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ClientJourneyController } from "./client-journey-controller.server";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

describe("ClientJourneyController welcome", () => {
  it.each<[VisitorGender, "five-part" | "four-part"]>([
    ["female", "five-part"],
    ["prefer_not_to_say", "five-part"],
    ["male", "four-part"],
  ])(
    "greets a %s client by her first name with the %s form wording",
    async (gender, wording) => {
      // arrange
      const { controller, readClientJourney } = createController({
        journey: journeyOf({ gender }),
      });

      // act
      const page = await controller.loadWelcome(clientArgs());

      // assert
      expect(page).toEqual({ firstName: "Ana", wording });
      expect(readClientJourney).toHaveBeenCalledWith("user_ana");
    },
  );

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({ journey: null });

    // act
    const thrown = await captureThrown(() =>
      controller.loadWelcome(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach without reading any journey", async () => {
    // arrange
    const { controller, readClientJourney } = createController({
      journey: journeyOf({ gender: "female" }),
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadWelcome(
        clientArgs({
          account: { ...CLIENT, role: "COACH" },
          kind: "authenticated",
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readClientJourney).not.toHaveBeenCalled();
  });

  it("sends an anonymous visitor to sign in without reading any journey", async () => {
    // arrange
    const { controller, readClientJourney } = createController({
      journey: journeyOf({ gender: "female" }),
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadWelcome(clientArgs({ kind: "anonymous" })),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toMatch(
      /^https:\/\/accounts\.evoa\.fit\/sign-in\?redirect_url=/,
    );
    expect(readClientJourney).not.toHaveBeenCalled();
  });
});

describe("ClientJourneyController mark welcome seen", () => {
  it("records her welcome as seen and moves her on to onboarding", async () => {
    // arrange
    const { controller, markWelcomeSeen } = createController({
      markResult: { status: "welcome-seen" },
    });

    // act
    const response = await controller.markWelcomeSeen(clientArgs());

    // assert
    expect(markWelcomeSeen).toHaveBeenCalledWith("user_ana");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/client/onboarding");
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({
      markResult: { status: "not-on-journey" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.markWelcomeSeen(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach without recording anything", async () => {
    // arrange
    const { controller, markWelcomeSeen } = createController({
      markResult: { status: "welcome-seen" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.markWelcomeSeen(
        clientArgs({
          account: { ...CLIENT, role: "COACH" },
          kind: "authenticated",
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(markWelcomeSeen).not.toHaveBeenCalled();
  });
});

function journeyOf(options: { gender: VisitorGender }): ClientJourney {
  return ClientJourney.from({
    clientId: "client_ana",
    firstName: "Ana",
    gender: options.gender,
    welcomeSeenAt: null,
  });
}

function createController(options: {
  journey?: ClientJourney | null;
  markResult?: Awaited<ReturnType<MarkWelcomeSeenUseCase["execute"]>>;
}) {
  const readClientJourney = vi.fn().mockResolvedValue(options.journey ?? null);
  const markWelcomeSeen = vi.fn().mockResolvedValue(options.markResult);
  const controller = new ClientJourneyController({
    markWelcomeSeen: {
      execute: markWelcomeSeen,
    } as unknown as MarkWelcomeSeenUseCase,
    readClientJourney: {
      execute: readClientJourney,
    } as unknown as ReadClientJourneyUseCase,
  });

  return { controller, markWelcomeSeen, readClientJourney };
}

function clientArgs(
  session: ResolvedSession = { account: CLIENT, kind: "authenticated" },
) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, session),
    ],
    request: new Request("https://evoa.fit/client/welcome", {
      method: "POST",
    }),
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
