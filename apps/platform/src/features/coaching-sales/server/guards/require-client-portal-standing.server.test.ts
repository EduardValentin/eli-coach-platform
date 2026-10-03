import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { ClientJourney } from "@eli-coach-platform/domain/client-journey";
import type { ReviewStamps } from "@eli-coach-platform/domain/client-onboarding";
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

import { clientJourneyContext } from "./client-journey-context.server";
import { coachingSalesContext } from "./coaching-sales-context.server";
import {
  readClientPortalStanding,
  requireClientPortalStanding,
  requireOpenClientPortal,
} from "./require-client-portal-standing.server";

const BASE_PATH = "/app";
const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

describe("requireClientPortalStanding", () => {
  it.each(["/app/client", "/app/client/plan"])(
    "holds a client who has not seen her welcome on the welcome screen when she opens %s",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({ welcomeSeenAt: null }),
        pathname,
      });

      // act
      const thrown = await captureThrown(() =>
        requireClientPortalStanding(args),
      );

      // assert
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe(
        "/app/client/welcome",
      );
    },
  );

  it.each(["/app/client/welcome", "/app/client/onboarding"])(
    "lets a client who has not seen her welcome open %s",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({ welcomeSeenAt: null }),
        pathname,
      });

      // act
      const thrown = await captureThrown(() =>
        requireClientPortalStanding(args),
      );

      // assert
      expect(thrown).toBeUndefined();
    },
  );

  it.each(["/app/client", "/app/client/welcome", "/app/client/plan"])(
    "holds a client who has seen her welcome on onboarding when she opens %s",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({ welcomeSeenAt: new Date("2026-10-21T09:00Z") }),
        pathname,
      });

      // act
      const thrown = await captureThrown(() =>
        requireClientPortalStanding(args),
      );

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
    const thrown = await captureThrown(() => requireClientPortalStanding(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it.each(["/app/client/welcome", "/app/client/onboarding"])(
    "sends a client who has sent her onboarding from %s to the client portal",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({
          welcomeSeenAt: new Date("2026-10-21T09:00Z"),
          onboardingSubmittedAt: new Date("2026-10-22T09:00Z"),
        }),
        pathname,
      });

      // act
      const thrown = await captureThrown(() =>
        requireClientPortalStanding(args),
      );

      // assert
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe("/app/client");
    },
  );

  it.each(["/app/client", "/app/client/plan"])(
    "lets a client who has sent her onboarding open %s",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({
          welcomeSeenAt: new Date("2026-10-21T09:00Z"),
          onboardingSubmittedAt: new Date("2026-10-22T09:00Z"),
        }),
        pathname,
      });

      // act
      const thrown = await captureThrown(() =>
        requireClientPortalStanding(args),
      );

      // assert
      expect(thrown).toBeUndefined();
    },
  );

  it.each(
    Object.keys(REVIEW_JOURNEYS).flatMap((label) =>
      ["/app/client", "/app/client/plan"].map(
        (pathname) => [label as ReviewJourney, pathname] as const,
      ),
    ),
  )("lets a client whose onboarding is %s open %s", async (label, pathname) => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf(REVIEW_JOURNEYS[label]),
      pathname,
    });

    // act
    const thrown = await captureThrown(() => requireClientPortalStanding(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it.each([
    ["in review", "/app/client/welcome"],
    ["in review", "/app/client/onboarding"],
    ["asked for more details", "/app/client/welcome"],
    ["approved", "/app/client/welcome"],
    ["approved", "/app/client/onboarding"],
  ] as const)(
    "sends a client whose onboarding is %s from %s to the client portal",
    async (label, pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf(REVIEW_JOURNEYS[label]),
        pathname,
      });

      // act
      const thrown = await captureThrown(() =>
        requireClientPortalStanding(args),
      );

      // assert
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe("/app/client");
    },
  );

  it("lets a client asked for more details open onboarding to answer them", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf(REVIEW_JOURNEYS["asked for more details"]),
      pathname: "/app/client/onboarding",
    });

    // act
    const thrown = await captureThrown(() => requireClientPortalStanding(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it("gates the paths of an app served at the root", async () => {
    // arrange
    const args = journeyArgs({
      appBasePath: "/",
      journey: journeyOf({ welcomeSeenAt: new Date("2026-10-21T09:00Z") }),
      pathname: "/client/welcome",
    });

    // act
    const thrown = await captureThrown(() => requireClientPortalStanding(args));

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/client/onboarding",
    );
  });

  it.each(["/app/client", "/app/client/settings", "/app/client/welcome"])(
    "sends a client whose coaching has ended from %s to the ended page",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf(REVIEW_JOURNEYS.approved),
        access: "ended",
        pathname,
      });

      // act
      const thrown = await captureThrown(() =>
        requireClientPortalStanding(args),
      );

      // assert
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe(
        "/app/client/ended",
      );
    },
  );

  it("lets a client whose coaching has ended open the ended page", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf(REVIEW_JOURNEYS.approved),
      access: "ended",
      pathname: "/app/client/ended",
    });

    // act
    const thrown = await captureThrown(() => requireClientPortalStanding(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it("sends a client whose coaching goes on away from the ended page", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf(REVIEW_JOURNEYS.approved),
      pathname: "/app/client/ended",
    });

    // act
    const thrown = await captureThrown(() => requireClientPortalStanding(args));

    // assert
    expect((thrown as Response).headers.get("Location")).toBe("/app/client");
  });

  it("leaves a client account with no client record ungated", async () => {
    // arrange
    const args = journeyArgs({ journey: null, pathname: "/app/client" });

    // act
    const thrown = await captureThrown(() => requireClientPortalStanding(args));

    // assert
    expect(thrown).toBeUndefined();
  });

  it.each(["/app/client", "/app/client/welcome"])(
    "hands the loaders under %s a snapshot of her journey",
    async (pathname) => {
      // arrange
      const args = journeyArgs({
        journey: journeyOf({ welcomeSeenAt: null }),
        pathname,
      });

      // act
      await captureThrown(() => requireClientPortalStanding(args));

      // assert
      expect(args.context.get(clientJourneyContext)).toEqual({
        clientId: "client_ana",
        firstName: "Ana",
        gender: "female",
        lastName: "Popescu",
        welcomeSeenAt: null,
        onboardingSubmittedAt: null,
        reviewOpenedAt: null,
        detailsRequestedAt: null,
        detailsAnsweredAt: null,
        answersApprovedAt: null,
      });
    },
  );

  it("hands the loaders no journey for a client account with no client record", async () => {
    // arrange
    const args = journeyArgs({ journey: null, pathname: "/app/client" });

    // act
    await requireClientPortalStanding(args);

    // assert
    expect(args.context.get(clientJourneyContext)).toBeNull();
  });

  it("asks for the journey of the signed-in client's own subject", async () => {
    // arrange
    const args = journeyArgs({ journey: null, pathname: "/app/client" });

    // act
    await requireClientPortalStanding(args);

    // assert
    expect(readJourneyOf(args)).toHaveBeenCalledWith("user_ana");
  });
});

describe("readClientPortalStanding", () => {
  it("names the step a signed-in client is at and whether her portal is open", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf({ welcomeSeenAt: null }),
      pathname: "/app/",
    });

    // act
    const standing = await readClientPortalStanding(args);

    // assert
    expect(standing).toEqual({ step: "welcome", access: "open" });
  });

  it("hands over no journey snapshot, which only the gate does", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf({ welcomeSeenAt: null }),
      pathname: "/app/",
    });

    // act
    await readClientPortalStanding(args);

    // assert
    expect(() => args.context.get(clientJourneyContext)).toThrow();
  });

  it("names no step for a client account with no client record", async () => {
    // arrange
    const args = journeyArgs({ journey: null, pathname: "/app/" });

    // act
    const standing = await readClientPortalStanding(args);

    // assert
    expect(standing).toBeNull();
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
      const standing = await readClientPortalStanding(args);

      // assert
      expect(standing).toBeNull();
      expect(readJourneyOf(args)).not.toHaveBeenCalled();
    },
  );
});

describe("requireOpenClientPortal", () => {
  it("refuses a write from a client whose coaching has ended", async () => {
    // arrange
    const args = journeyArgs({
      access: "ended",
      journey: journeyOf(SUBMITTED),
      pathname: "/app/api/client-profile/measurements",
    });

    // act
    const thrown = await captureThrown(() => requireOpenClientPortal(args));

    // assert
    expect((thrown as Response).status).toBe(409);
    expect(await (thrown as Response).json()).toEqual({ error: "ended" });
  });

  it("lets a write through from a client whose portal is open", async () => {
    // arrange
    const args = journeyArgs({
      journey: journeyOf(SUBMITTED),
      pathname: "/app/api/client-profile/measurements",
    });

    // act
    const thrown = await captureThrown(() => requireOpenClientPortal(args));

    // assert
    expect(thrown).toBeUndefined();
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
  ])("leaves %s to the route's own account check", async (_label, session) => {
    // arrange
    const args = journeyArgs({
      access: "ended",
      journey: journeyOf(SUBMITTED),
      pathname: "/app/api/client-profile/measurements",
      session,
    });

    // act
    const thrown = await captureThrown(() => requireOpenClientPortal(args));

    // assert
    expect(thrown).toBeUndefined();
  });
});

function journeyOf(
  options: {
    welcomeSeenAt: Date | null;
    onboardingSubmittedAt?: Date;
  } & Partial<ReviewStamps>,
): ClientJourney {
  return ClientJourney.from({
    clientId: "client_ana",
    firstName: "Ana",
    gender: "female",
    lastName: "Popescu",
    welcomeSeenAt: options.welcomeSeenAt,
    onboardingSubmittedAt: options.onboardingSubmittedAt ?? null,
    reviewOpenedAt: options.reviewOpenedAt ?? null,
    detailsRequestedAt: options.detailsRequestedAt ?? null,
    detailsAnsweredAt: options.detailsAnsweredAt ?? null,
    answersApprovedAt: options.answersApprovedAt ?? null,
  });
}

const SUBMITTED = {
  welcomeSeenAt: new Date("2026-10-21T09:00Z"),
  onboardingSubmittedAt: new Date("2026-10-22T09:00Z"),
};

const REVIEW_JOURNEYS = {
  "in review": { ...SUBMITTED, reviewOpenedAt: new Date("2026-10-23T09:00Z") },
  "asked for more details": {
    ...SUBMITTED,
    reviewOpenedAt: new Date("2026-10-23T09:00Z"),
    detailsRequestedAt: new Date("2026-10-23T10:00Z"),
  },
  approved: {
    ...SUBMITTED,
    reviewOpenedAt: new Date("2026-10-23T09:00Z"),
    answersApprovedAt: new Date("2026-10-24T09:00Z"),
  },
} as const;

type ReviewJourney = keyof typeof REVIEW_JOURNEYS;

function journeyArgs(options: {
  access?: "open" | "ended";
  appBasePath?: string;
  journey: ClientJourney | null;
  pathname: string;
  session?: ResolvedSession;
}) {
  const coachingSales = {
    readClientPortalStanding: {
      execute: vi
        .fn()
        .mockResolvedValue(
          options.journey
            ? { journey: options.journey, access: options.access ?? "open" }
            : null,
        ),
    },
  } as unknown as CoachingSalesFeature;
  const accounts = {
    portal: { appBasePath: options.appBasePath ?? BASE_PATH },
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
  return args.context.get(coachingSalesContext).readClientPortalStanding
    .execute;
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
