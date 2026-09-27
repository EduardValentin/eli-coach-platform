import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { ClientJourney } from "@eli-coach-platform/domain/client-journey";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { coachingSalesContext } from "./coaching-sales-context.server";
import {
  readClientJourneyStep,
  requireClientJourneyStep,
} from "./require-client-journey-step.server";

const BASE_PATH = "/app";
const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

describe("requireClientJourneyStep", () => {
  it.each(["/app/client", "/app/client/plan", "/app/client/onboarding"])(
    "holds a client who has not seen her welcome on the welcome screen when she opens %s",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({ welcomeSeenAt: null }),
        pathname,
      });

      // act
      const thrown = await captureThrown(() => requireClientJourneyStep(args));

      // assert
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe(
        "/app/client/welcome",
      );
    },
  );

  it("lets a client who has not seen her welcome open the welcome screen", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf({ welcomeSeenAt: null }),
      pathname: "/app/client/welcome",
    });

    // act
    const thrown = await captureThrown(() => requireClientJourneyStep(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it.each(["/app/client", "/app/client/welcome", "/app/client/plan"])(
    "holds a client who has seen her welcome on onboarding when she opens %s",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({ welcomeSeenAt: new Date("2026-10-21T09:00Z") }),
        pathname,
      });

      // act
      const thrown = await captureThrown(() => requireClientJourneyStep(args));

      // assert
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe(
        "/app/client/onboarding",
      );
    },
  );

  it("lets a client who has seen her welcome open onboarding", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf({ welcomeSeenAt: new Date("2026-10-21T09:00Z") }),
      pathname: "/app/client/onboarding",
    });

    // act
    const thrown = await captureThrown(() => requireClientJourneyStep(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it("leaves a client account with no client record ungated", async () => {
    // arrange
    const args = journeyArgs({ journey: null, pathname: "/app/client" });

    // act
    const thrown = await captureThrown(() => requireClientJourneyStep(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it("asks for the journey of the signed-in client's own subject", async () => {
    // arrange
    const args = journeyArgs({ journey: null, pathname: "/app/client" });

    // act
    await requireClientJourneyStep(args);

    // assert
    expect(readJourneyOf(args)).toHaveBeenCalledWith("user_ana");
  });
});

describe("readClientJourneyStep", () => {
  it("names the step a signed-in client is at", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf({ welcomeSeenAt: null }),
      pathname: "/app/",
    });

    // act
    const step = await readClientJourneyStep(args);

    // assert
    expect(step).toBe("welcome");
  });

  it("names no step for a client account with no client record", async () => {
    // arrange
    const args = journeyArgs({ journey: null, pathname: "/app/" });

    // act
    const step = await readClientJourneyStep(args);

    // assert
    expect(step).toBeNull();
  });

  it.each<[string, ResolvedSession]>([
    ["an anonymous visitor", { kind: "anonymous" }],
    [
      "the coach",
      {
        account: {
          authSubjectId: "user_coach",
          id: "acct_coach",
          role: "COACH",
        },
        kind: "authenticated",
      },
    ],
  ])(
    "names no step for %s without looking for a journey",
    async (_label, session) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({ welcomeSeenAt: null }),
        pathname: "/app/",
        session,
      });

      // act
      const step = await readClientJourneyStep(args);

      // assert
      expect(step).toBeNull();
      expect(readJourneyOf(args)).not.toHaveBeenCalled();
    },
  );
});

function journeyOf(options: { welcomeSeenAt: Date | null }): ClientJourney {
  return ClientJourney.from({
    clientId: "client_ana",
    firstName: "Ana",
    gender: "female",
    welcomeSeenAt: options.welcomeSeenAt,
  });
}

function journeyArgs(options: {
  journey: ClientJourney | null;
  pathname: string;
  session?: ResolvedSession;
}) {
  const coachingSales = {
    readClientJourney: {
      execute: vi.fn().mockResolvedValue(options.journey),
    },
  } as unknown as CoachingSalesFeature;
  const accounts = {
    portal: { appBasePath: BASE_PATH },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(coachingSalesContext, coachingSales),
      contextEntry(
        sessionContext,
        options.session ?? { account: CLIENT, kind: "authenticated" },
      ),
    ],
    request: new Request(`https://evoa.fit${options.pathname}`),
  });
}

function readJourneyOf(args: ReturnType<typeof journeyArgs>) {
  return args.context.get(coachingSalesContext).readClientJourney.execute;
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
