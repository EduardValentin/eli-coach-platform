import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  ClientJourney,
  type MarkWelcomeSeenUseCase,
  type ReadClientJourneyUseCase,
  type ReadProgramStatusUseCase,
} from "@eli-coach-platform/domain/client-journey";
import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import { clientJourneyContext } from "~/features/coaching-sales/server/guards/client-journey-context.server";
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
    ["prefer_not_to_say", "four-part"],
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

describe("ClientJourneyController identity", () => {
  it("names the client from the journey the gate handed over", () => {
    // arrange
    const { controller, readClientJourney } = createController({});
    const args = createRequestArgs({
      contexts: [
        contextEntry(
          clientJourneyContext,
          journeyOf({ gender: "female" }).toSnapshot(),
        ),
      ],
    });

    // act
    const identity = controller.loadIdentity(args);

    // assert
    expect(identity).toEqual({ firstName: "Ana", lastName: "Popescu" });
    expect(readClientJourney).not.toHaveBeenCalled();
  });

  it("names no one for a client account with no client record", () => {
    // arrange
    const { controller } = createController({});
    const args = createRequestArgs({
      contexts: [contextEntry(clientJourneyContext, null)],
    });

    // act
    const identity = controller.loadIdentity(args);

    // assert
    expect(identity).toBeNull();
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

describe("ClientJourneyController program status", () => {
  it.each([
    [
      "with the day the work starts",
      new Date("2026-10-10T10:00:00.000Z"),
      "2026-10-10T10:00:00.000Z",
    ],
    ["with no start day", null, null],
  ])(
    "answers her submitted onboarding %s",
    async (_label, workStartsOn, expectedWorkStartsOn) => {
      // arrange
      const { controller, readProgramStatus } = createController({
        programStatus: {
          kind: "submitted",
          submittedAt: new Date("2026-09-28T10:00:00.000Z"),
          workStartsOn,
          startNowUntil: null,
        },
      });

      // act
      const status = await controller.loadProgramStatus(clientArgs());

      // assert
      expect(status).toEqual({
        kind: "submitted",
        submittedAt: "2026-09-28T10:00:00.000Z",
        workStartsOn: expectedWorkStartsOn,
        startNowUntil: null,
      });
      expect(readProgramStatus).toHaveBeenCalledWith("user_ana");
    },
  );

  it("carries until when she can start now", async () => {
    // arrange
    const { controller } = createController({
      programStatus: {
        kind: "submitted",
        submittedAt: new Date("2026-09-28T10:00:00.000Z"),
        workStartsOn: new Date("2026-10-10T10:00:00.000Z"),
        startNowUntil: new Date("2026-10-10T10:00:00.000Z"),
      },
    });

    // act
    const status = await controller.loadProgramStatus(clientArgs());

    // assert
    expect(status).toMatchObject({
      startNowUntil: "2026-10-10T10:00:00.000Z",
    });
  });

  it.each(["in-review", "needs-details", "approved"] as const)(
    "answers the %s step of her reviewed onboarding",
    async (kind) => {
      // arrange
      const { controller } = createController({
        programStatus: {
          kind,
          submittedAt: new Date("2026-09-28T10:00:00.000Z"),
          workStartsOn: null,
          startNowUntil: null,
        },
      });

      // act
      const status = await controller.loadProgramStatus(clientArgs());

      // assert
      expect(status).toEqual({
        kind,
        submittedAt: "2026-09-28T10:00:00.000Z",
        workStartsOn: null,
        startNowUntil: null,
      });
    },
  );

  it("answers no status before she has sent her onboarding", async () => {
    // arrange
    const { controller } = createController({ programStatus: null });

    // act
    const status = await controller.loadProgramStatus(clientArgs());

    // assert
    expect(status).toBeNull();
  });

  it("refuses the coach without reading any status", async () => {
    // arrange
    const { controller, readProgramStatus } = createController({
      programStatus: null,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadProgramStatus(
        clientArgs({
          account: { ...CLIENT, role: "COACH" },
          kind: "authenticated",
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readProgramStatus).not.toHaveBeenCalled();
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
  });
}

function createController(options: {
  journey?: ClientJourney | null;
  markResult?: Awaited<ReturnType<MarkWelcomeSeenUseCase["execute"]>>;
  programStatus?: Awaited<ReturnType<ReadProgramStatusUseCase["execute"]>>;
}) {
  const readClientJourney = vi.fn().mockResolvedValue(options.journey ?? null);
  const markWelcomeSeen = vi.fn().mockResolvedValue(options.markResult);
  const readProgramStatus = vi
    .fn()
    .mockResolvedValue(options.programStatus ?? null);
  const controller = new ClientJourneyController({
    markWelcomeSeen: {
      execute: markWelcomeSeen,
    } as unknown as MarkWelcomeSeenUseCase,
    readClientJourney: {
      execute: readClientJourney,
    } as unknown as ReadClientJourneyUseCase,
    readProgramStatus: {
      execute: readProgramStatus,
    } as unknown as ReadProgramStatusUseCase,
  });

  return { controller, markWelcomeSeen, readClientJourney, readProgramStatus };
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
