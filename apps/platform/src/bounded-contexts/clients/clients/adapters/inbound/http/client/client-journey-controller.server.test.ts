import {
  ClientJourney,
  type MarkWelcomeSeenUseCase,
  type ReadClientJourneyUseCase,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { clientJourneyContext } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client-journey-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { ClientJourneyController } from "./client-journey-controller.server";

const CLIENT: SessionAccount = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

describe("ClientJourneyController welcome", () => {
  it.each<[VisitorGender, "five-part" | "four-part"]>([
    ["female", "five-part"],
    ["prefer_not_to_say", "four-part"],
    ["male", "four-part"],
  ])(
    "greets a %s client by her first name with the %s form wording",
    async (gender, wording) => {
      // arrange
      const { clientJourneyController, readClientJourney } = createController({
        journey: journeyOf({ gender }),
      });

      // act
      const page = await clientJourneyController.loadWelcome(clientArgs());

      // assert
      expect(page).toEqual({ firstName: "Ana", wording });
      expect(readClientJourney).toHaveBeenCalledWith("user_ana");
    },
  );

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { clientJourneyController } = createController({ journey: null });

    // act
    const thrown = await captureThrown(() =>
      clientJourneyController.loadWelcome(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach without reading any journey", async () => {
    // arrange
    const { clientJourneyController, readClientJourney } = createController({
      journey: journeyOf({ gender: "female" }),
    });

    // act
    const thrown = await captureThrown(() =>
      clientJourneyController.loadWelcome(
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
    const { clientJourneyController, readClientJourney } = createController({
      journey: journeyOf({ gender: "female" }),
    });

    // act
    const thrown = await captureThrown(() =>
      clientJourneyController.loadWelcome(clientArgs({ kind: "anonymous" })),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toMatch(
      /^https:\/\/accounts\.evoa\.fit\/sign-in\?redirect_url=/,
    );
    expect(readClientJourney).not.toHaveBeenCalled();
  });
});

describe("ClientJourneyController identity", () => {
  it("names the client from the journey the gate handed over", () => {
    // arrange
    const { clientJourneyController, readClientJourney } = createController({});
    const args = createRequestArgs({
      contexts: [
        contextEntry(
          clientJourneyContext,
          journeyOf({ gender: "female" }).toSnapshot(),
        ),
      ],
    });

    // act
    const identity = clientJourneyController.loadIdentity(args);

    // assert
    expect(identity).toEqual({ firstName: "Ana", lastName: "Popescu" });
    expect(readClientJourney).not.toHaveBeenCalled();
  });

  it("names no one for a client account with no client record", () => {
    // arrange
    const { clientJourneyController } = createController({});
    const args = createRequestArgs({
      contexts: [contextEntry(clientJourneyContext, null)],
    });

    // act
    const identity = clientJourneyController.loadIdentity(args);

    // assert
    expect(identity).toBeNull();
  });
});

describe("ClientJourneyController mark welcome seen", () => {
  it("records her welcome as seen and moves her on to onboarding", async () => {
    // arrange
    const { clientJourneyController, markWelcomeSeen } = createController({
      markResult: { status: "welcome-seen" },
    });

    // act
    const response =
      await clientJourneyController.markWelcomeSeen(clientArgs());

    // assert
    expect(markWelcomeSeen).toHaveBeenCalledWith("user_ana");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/client/onboarding");
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { clientJourneyController } = createController({
      markResult: { status: "not-on-journey" },
    });

    // act
    const thrown = await captureThrown(() =>
      clientJourneyController.markWelcomeSeen(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach without recording anything", async () => {
    // arrange
    const { clientJourneyController, markWelcomeSeen } = createController({
      markResult: { status: "welcome-seen" },
    });

    // act
    const thrown = await captureThrown(() =>
      clientJourneyController.markWelcomeSeen(
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
  });
}

function createController(options: {
  journey?: ClientJourney | null;
  markResult?: Awaited<ReturnType<MarkWelcomeSeenUseCase["execute"]>>;
}) {
  const readClientJourney = vi.fn().mockResolvedValue(options.journey ?? null);
  const markWelcomeSeen = vi.fn().mockResolvedValue(options.markResult);
  const clientJourneyController = new ClientJourneyController({
    markWelcomeSeenUseCase: {
      execute: markWelcomeSeen,
    } as unknown as MarkWelcomeSeenUseCase,
    readClientJourneyUseCase: {
      execute: readClientJourney,
    } as unknown as ReadClientJourneyUseCase,
  });

  return { clientJourneyController, markWelcomeSeen, readClientJourney };
}

function clientArgs(
  session: ResolvedSession = { account: CLIENT, kind: "authenticated" },
) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };

  return createRequestArgs({
    portal,
    session,
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
