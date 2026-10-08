// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/public/paths";
import { clientAction as startProgram } from "~/features/coaching-sales/api/client/program-start";
import type { ProgramStatus } from "~/features/coaching-sales/public/client-journey";
import {
  CLIENT_ANSWER_QUERY,
  CLIENT_ONBOARDING_PATH,
  COACHING_SALES_API_PATHS,
} from "~/features/coaching-sales/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import { ProgramStatusCard } from "./program-status-card";

const SUBMITTED_AT = "2026-10-01T09:00:00.000Z";
const WORK_STARTS_ON = "2026-10-11T22:30:00.000Z";
const WAITING_LINE =
  "Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on 12 October. Your program will be delivered as soon as it is completed.";

const PROGRAM_START_URL = COACHING_SALES_API_PATHS.programStart;
const START_NOW_UNTIL = "2026-10-12T09:00:00.000Z";
const START_SOONER_NOTE =
  "Want Eli to start sooner? You can give up your 14-day right of withdrawal and let her begin now.";
const IMMEDIATE_START_BODY =
  "I give up my 14-day right of withdrawal so Eli can start on my program now. If I cancel after that, there is no refund.";
const START_NOW_PROBLEM =
  "Your program couldn't be started just now. Nothing has changed, so please try again.";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

function readerIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function statusOf(
  kind: ProgramStatus["kind"],
  workStartsOn: string | null = null,
): ProgramStatus {
  return {
    kind,
    submittedAt: SUBMITTED_AT,
    workStartsOn,
    startNowUntil: null,
  };
}

type CardProps = Parameters<typeof ProgramStatusCard>[0];

function renderCard(props: CardProps) {
  const router = createMemoryRouter(
    [
      { element: <ProgramStatusCard {...props} />, path: CLIENT_PORTAL_PATH },
      {
        element: <h1>Answer page</h1>,
        path: CLIENT_ONBOARDING_PATH,
      },
    ],
    { initialEntries: [CLIENT_PORTAL_PATH] },
  );

  render(<RouterProvider router={router} />);

  return router;
}

describe("the program status card once her answers are sent", () => {
  it("labels the section, names her onboarding as sent and tells her Eli will start soon", () => {
    // arrange, act
    renderCard({ status: statusOf("submitted") });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent to your coach")).toBeInTheDocument();
    expect(
      screen.getByText("Eli has your answers and will start on them soon."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Let Eli start now" }),
    ).not.toBeInTheDocument();
  });

  it("tells her the date Eli starts on when she kept her right of withdrawal, in her own time zone", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    renderCard({ status: statusOf("submitted", WORK_STARTS_ON) });

    // assert
    expect(screen.getByText(WAITING_LINE)).toBeInTheDocument();
  });
});

describe("the program status card while her coach reviews her answers", () => {
  it("says her coach is reviewing and that the next step appears here", () => {
    // arrange, act
    renderCard({ status: statusOf("in-review") });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your coach is reviewing your answers"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You'll see the next step here as soon as she has looked through your answers.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps the date Eli starts on while she waits out her 14 days", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    renderCard({ status: statusOf("in-review", WORK_STARTS_ON) });

    // assert
    expect(screen.getByText(WAITING_LINE)).toBeInTheDocument();
  });
});

describe("the program status card when her coach needs more details", () => {
  it("says her coach needs more details and quotes what she asked", () => {
    // arrange, act
    renderCard({
      detailsRequest: { note: "Tell me more about your knee." },
      status: statusOf("needs-details", WORK_STARTS_ON),
    });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your coach needs a few more details"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tell me more about your knee."),
    ).toBeInTheDocument();
    expect(screen.queryByText(WAITING_LINE)).not.toBeInTheDocument();
  });

  it("leaves the status line out when no note came with the request", () => {
    // arrange, act
    renderCard({ detailsRequest: null, status: statusOf("needs-details") });

    // assert
    const card = screen.getByRole("region", { name: "Your onboarding" });
    expect(
      within(card)
        .getAllByRole("paragraph")
        .map((line) => line.textContent),
    ).toEqual(["Your coach needs a few more details"]);
    expect(
      within(card).getByRole("link", { name: "Answer now" }),
    ).toBeInTheDocument();
  });

  it("opens the answer page from Answer now", async () => {
    // arrange
    const user = userEvent.setup();
    const router = renderCard({
      detailsRequest: { note: "Tell me more about your knee." },
      status: statusOf("needs-details"),
    });
    const answerNow = screen.getByRole("link", { name: "Answer now" });

    // act
    await user.click(answerNow);

    // assert
    expect(answerNow).toHaveAttribute(
      "href",
      `${CLIENT_ONBOARDING_PATH}?${CLIENT_ANSWER_QUERY}`,
    );
    expect(
      await screen.findByRole("heading", { name: "Answer page" }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?${CLIENT_ANSWER_QUERY}`);
  });
});

describe("the program status card once her answers are approved", () => {
  it("moves on to her program and says Eli is putting it together", () => {
    // arrange, act
    renderCard({ detailsRequest: null, status: statusOf("approved") });

    // assert
    expect(
      screen.getByRole("region", { name: "Your program" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Your answers are approved")).toBeInTheDocument();
    expect(
      screen.getByText("Eli is putting your program together."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps the date Eli starts on while she waits out her 14 days", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    renderCard({ status: statusOf("approved", WORK_STARTS_ON) });

    // assert
    expect(screen.getByText(WAITING_LINE)).toBeInTheDocument();
  });
});

describe("the program status card while she waits out her 14 days", () => {
  it("offers to let Eli start now with a note on what that means", () => {
    // arrange, act
    renderCard({ status: waitingStatus() });

    // assert
    expect(screen.getByText(START_SOONER_NOTE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Let Eli start now" }),
    ).toBeEnabled();
  });

  it("asks her to give up her right of withdrawal before Eli starts", async () => {
    // arrange
    const user = userEvent.setup();
    renderCard({ status: waitingStatus() });

    // act
    await user.click(screen.getByRole("button", { name: "Let Eli start now" }));

    // assert
    const dialog = screen.getByRole("dialog", {
      description: IMMEDIATE_START_BODY,
      name: "Let Eli start now?",
    });
    expect(
      within(dialog).getByRole("button", { name: "Yes, start now" }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Keep my 14 days" }),
    ).toBeVisible();
  });

  it.each([
    [
      "Keep my 14 days",
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(
          screen.getByRole("button", { name: "Keep my 14 days" }),
        );
      },
    ],
    [
      "Escape",
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.keyboard("{Escape}");
      },
    ],
  ])(
    "keeps her 14 days from %s and hands focus back",
    async (_way, dismiss) => {
      // arrange
      const requests = recordProgramStarts();
      const user = userEvent.setup();
      renderCard({ status: waitingStatus() });
      await user.click(
        screen.getByRole("button", { name: "Let Eli start now" }),
      );

      // act
      await dismiss(user);

      // assert
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Let Eli start now" }),
      ).toHaveFocus();
      expect(requests).toEqual([]);
    },
  );

  it("lets Eli start now and drops the offer once her program has started", async () => {
    // arrange
    const requests = recordProgramStarts();
    const loaded = { status: waitingStatus() };
    const user = renderLoadedCard(loaded);
    await user.click(
      await screen.findByRole("button", { name: "Let Eli start now" }),
    );
    loaded.status = statusOf("submitted");

    // act
    await user.click(screen.getByRole("button", { name: "Yes, start now" }));

    // assert
    expect(
      await screen.findByText(
        "Eli has your answers and will start on them soon.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(START_SOONER_NOTE)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Let Eli start now" }),
    ).not.toBeInTheDocument();
    expect(requests).toEqual(["POST"]);
  });

  it("offers nothing to start once the window has closed", () => {
    // arrange, act
    renderCard({ status: statusOf("submitted", WORK_STARTS_ON) });

    // assert
    expect(screen.queryByText(START_SOONER_NOTE)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Let Eli start now" }),
    ).not.toBeInTheDocument();
  });
});

describe("a start the platform cannot make", () => {
  it.each([
    {
      failure: "the platform refuses it",
      answer: () =>
        HttpResponse.json({ error: "outside-window" }, { status: 409 }),
    },
    {
      failure: "the platform throws a refusal",
      answer: () => new HttpResponse("Conflict", { status: 409 }),
    },
    {
      failure: "the request never reaches the server",
      answer: () => HttpResponse.error(),
    },
  ])(
    "keeps the dialog open and asks her to try again when $failure",
    async ({ answer }) => {
      // arrange
      server.use(http.post(`*${PROGRAM_START_URL}`, answer));
      const user = renderLoadedCard({ status: waitingStatus() });
      await user.click(
        await screen.findByRole("button", { name: "Let Eli start now" }),
      );

      // act
      await user.click(screen.getByRole("button", { name: "Yes, start now" }));

      // assert
      const dialog = screen.getByRole("dialog", { name: "Let Eli start now?" });
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        START_NOW_PROBLEM,
      );
      expect(
        within(dialog).getByRole("button", { name: "Yes, start now" }),
      ).toBeEnabled();
    },
  );

  it("clears the problem once she closes the dialog", async () => {
    // arrange
    server.use(http.post(`*${PROGRAM_START_URL}`, () => HttpResponse.error()));
    const user = renderLoadedCard({ status: waitingStatus() });
    await user.click(
      await screen.findByRole("button", { name: "Let Eli start now" }),
    );
    await user.click(screen.getByRole("button", { name: "Yes, start now" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Keep my 14 days" }));

    // act
    await user.click(screen.getByRole("button", { name: "Let Eli start now" }));

    // assert
    expect(
      within(screen.getByRole("dialog")).queryByRole("alert"),
    ).not.toBeInTheDocument();
  });

  it("clears the problem while she tries again", async () => {
    // arrange
    let releaseRetry = () => {};
    const retried = new Promise<void>((resolve) => {
      releaseRetry = resolve;
    });
    let attempts = 0;
    server.use(
      http.post(`*${PROGRAM_START_URL}`, async () => {
        attempts += 1;

        if (attempts === 1) {
          return HttpResponse.error();
        }

        await retried;

        return HttpResponse.json({ status: "started" });
      }),
    );
    const user = renderLoadedCard({ status: waitingStatus() });
    await user.click(
      await screen.findByRole("button", { name: "Let Eli start now" }),
    );
    await user.click(screen.getByRole("button", { name: "Yes, start now" }));
    await screen.findByRole("alert");

    // act
    await user.click(screen.getByRole("button", { name: "Yes, start now" }));

    // assert
    expect(
      within(screen.getByRole("dialog")).queryByRole("alert"),
    ).not.toBeInTheDocument();
    releaseRetry();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

describe("the program status card and her payments", () => {
  it("carries no payment line or payment action, which live in her Settings", () => {
    // arrange, act
    renderCard({ status: statusOf("submitted") });

    // assert
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /payment method/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Change" }),
    ).not.toBeInTheDocument();
  });
});

function waitingStatus(): ProgramStatus {
  return {
    ...statusOf("submitted", WORK_STARTS_ON),
    startNowUntil: START_NOW_UNTIL,
  };
}

function recordProgramStarts(): string[] {
  const requests: string[] = [];

  server.use(
    http.post(`*${PROGRAM_START_URL}`, ({ request }) => {
      requests.push(request.method);

      return HttpResponse.json({ status: "started" });
    }),
  );

  return requests;
}

function renderLoadedCard(loaded: { status: ProgramStatus }) {
  const user = userEvent.setup();
  const DashboardRoute = () => {
    const { status } = useLoaderData<{ status: ProgramStatus }>();

    return <ProgramStatusCard status={status} />;
  };
  const router = createMemoryRouter(
    [
      {
        Component: DashboardRoute,
        loader: () => ({ status: loaded.status }),
        path: CLIENT_PORTAL_PATH,
      },
      {
        action: frameworkModeAction(startProgram),
        path: PROGRAM_START_URL,
      },
    ],
    { initialEntries: [CLIENT_PORTAL_PATH] },
  );

  render(<RouterProvider router={router} />);

  return user;
}
