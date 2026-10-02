// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import { CLIENT_ONBOARDING_PATH } from "~/features/coaching-sales/contracts/paths";
import type {
  AnswerDetailsRequest,
  OnboardingAnswerPage,
} from "~/features/client-onboarding/contracts/onboarding";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";
import { clientAction } from "~/features/client-onboarding/api/client/detail-answers";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import OnboardingRoute from "./onboarding-page";

const COACH_NOTE =
  "Could you confirm your current weight and the day that suits you for check-ins?";
const SEND_PROBLEM =
  "Your answers could not be sent just now. Try again in a moment.";
const WEIGHT_PROBLEM = "Enter your weight in kilograms.";

type PageOptions = {
  unitPreference?: OnboardingAnswerPage["unitPreference"];
};

function answerPage(options: PageOptions = {}): OnboardingAnswerPage {
  return {
    mode: "answer",
    request: {
      note: COACH_NOTE,
      fields: [
        { formId: "goal-availability", fieldId: "weight" },
        { formId: "nutrition-lifestyle", fieldId: "checkInDay" },
      ],
    },
    answers: {
      "goal-availability": { weight: 66.1 },
      "nutrition-lifestyle": { checkInDay: "Monday" },
    },
    unitPreference: options.unitPreference ?? {
      weightUnit: "kg",
      heightUnit: "cm",
    },
  };
}

const server = setupServer();

let answerRequests: AnswerDetailsRequest[] = [];

function answerDetailAnswers(response: () => Promise<Response> | Response) {
  server.use(
    http.post(
      `*${CLIENT_ONBOARDING_API_PATHS.detailAnswers}`,
      async ({ request }) => {
        answerRequests.push((await request.json()) as AnswerDetailsRequest);

        return response();
      },
    ),
  );
}

function renderAnswerRequest(page: OnboardingAnswerPage) {
  const router = createMemoryRouter(
    [
      {
        Component: OnboardingRoute,
        loader: () => page,
        path: CLIENT_ONBOARDING_PATH,
      },
      {
        action: frameworkModeAction(clientAction),
        path: CLIENT_ONBOARDING_API_PATHS.detailAnswers,
      },
      { Component: () => <p>portal home</p>, path: CLIENT_PORTAL_PATH },
    ],
    { initialEntries: [CLIENT_ONBOARDING_PATH] },
  );

  render(<RouterProvider router={router} />);

  return router;
}

async function openAnswerRequest(page: OnboardingAnswerPage) {
  const router = renderAnswerRequest(page);
  await screen.findByRole("heading", { level: 2 });

  return router;
}

async function chooseCheckInDay(
  user: ReturnType<typeof userEvent.setup>,
  day: string,
) {
  screen
    .getByRole("combobox", { name: /The day that suits you for check-ins/ })
    .focus();
  await user.keyboard("{Enter}");
  await user.click(await screen.findByRole("option", { name: day }));
}

async function retypeWeight(
  user: ReturnType<typeof userEvent.setup>,
  weight: string,
) {
  const input = screen.getByRole("spinbutton", { name: /Your weight/ });
  await user.clear(input);
  await user.type(input, weight);
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  answerRequests = [];
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("answering the coach's request", { timeout: 15_000 }, () => {
  it("shows what her coach asked under its own page heading", async () => {
    // arrange
    const page = answerPage();

    // act
    await openAnswerRequest(page);

    // assert
    expect(
      screen.getByRole("main", { name: "A few more details" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: "A few more details" }),
    ).toBeVisible();
    expect(screen.getByText("Your onboarding")).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "What your coach asked" }),
    ).toBeVisible();
    expect(screen.getByText(COACH_NOTE)).toBeVisible();
  });

  it("asks only the questions her coach picked", async () => {
    // arrange
    const page = answerPage();

    // act
    await openAnswerRequest(page);

    // assert
    expect(
      screen.getByRole("spinbutton", { name: /Your weight/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", {
        name: /The day that suits you for check-ins/,
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("spinbutton", { name: /Your height/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Email" }),
    ).not.toBeInTheDocument();
  });

  it("fills in her current answers in kilograms", async () => {
    // arrange
    const page = answerPage();

    // act
    await openAnswerRequest(page);

    // assert
    expect(
      screen.getByRole("spinbutton", { name: /Your weight\s*\(kg\)/ }),
    ).toHaveValue(66.1);
    expect(
      screen.getByRole("combobox", {
        name: /The day that suits you for check-ins/,
      }),
    ).toHaveTextContent("Monday");
  });

  it("fills in her current weight in pounds when she uses pounds", async () => {
    // arrange
    const page = answerPage({
      unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
    });

    // act
    await openAnswerRequest(page);

    // assert
    expect(
      screen.getByRole("spinbutton", { name: /Your weight\s*\(lb\)/ }),
    ).toHaveValue(145.7);
  });

  it("lets her leave for her portal without answering", async () => {
    // arrange
    const user = userEvent.setup();
    const router = await openAnswerRequest(answerPage());

    // act
    await user.click(screen.getByRole("link", { name: "Not now" }));

    // assert
    expect(await screen.findByText("portal home")).toBeVisible();
    expect(router.state.location.pathname).toBe(CLIENT_PORTAL_PATH);
    expect(answerRequests).toHaveLength(0);
  });

  it("sends her answers per form in kilograms and takes her to her portal", async () => {
    // arrange
    const user = userEvent.setup();
    answerDetailAnswers(() =>
      HttpResponse.json({ redirectTo: CLIENT_PORTAL_PATH }),
    );
    const router = await openAnswerRequest(answerPage());
    await retypeWeight(user, "64.5");
    await chooseCheckInDay(user, "Friday");

    // act
    await user.click(screen.getByRole("button", { name: "Send my answers" }));

    // assert
    expect(await screen.findByText("portal home")).toBeVisible();
    expect(router.state.location.pathname).toBe(CLIENT_PORTAL_PATH);
    expect(answerRequests).toEqual([
      {
        answers: {
          "goal-availability": { weight: 64.5 },
          "nutrition-lifestyle": { checkInDay: "Friday" },
        },
      },
    ]);
  });

  it("converts her answer in pounds back to kilograms when she sends it", async () => {
    // arrange
    const user = userEvent.setup();
    answerDetailAnswers(() =>
      HttpResponse.json({ redirectTo: CLIENT_PORTAL_PATH }),
    );
    await openAnswerRequest(
      answerPage({ unitPreference: { weightUnit: "lb", heightUnit: "ft-in" } }),
    );
    await retypeWeight(user, "150");

    // act
    await user.click(screen.getByRole("button", { name: "Send my answers" }));

    // assert
    expect(await screen.findByText("portal home")).toBeVisible();
    expect(answerRequests).toEqual([
      {
        answers: {
          "goal-availability": { weight: 68.04 },
          "nutrition-lifestyle": { checkInDay: "Monday" },
        },
      },
    ]);
  });

  it("shows that her answers are on their way while they are sent", async () => {
    // arrange
    const user = userEvent.setup();
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    answerDetailAnswers(async () => {
      await held;

      return HttpResponse.json({ redirectTo: CLIENT_PORTAL_PATH });
    });
    await openAnswerRequest(answerPage());

    // act
    await user.click(screen.getByRole("button", { name: "Send my answers" }));

    // assert
    expect(
      await screen.findByRole("button", { name: "Sending…" }),
    ).toBeDisabled();
    release();
    expect(await screen.findByText("portal home")).toBeVisible();
  });

  it.each([
    {
      failure: "the server answers with an error",
      answer: () =>
        HttpResponse.json({ message: "Unavailable" }, { status: 500 }),
    },
    {
      failure: "her session has ended",
      answer: () => new HttpResponse("Unauthorized", { status: 401 }),
    },
    {
      failure: "the request never reaches the server",
      answer: () => HttpResponse.error(),
    },
  ])("keeps her answers on the page when $failure", async ({ answer }) => {
    // arrange
    const user = userEvent.setup();
    answerDetailAnswers(answer);
    await openAnswerRequest(answerPage());
    await retypeWeight(user, "64.5");
    await chooseCheckInDay(user, "Friday");

    // act
    await user.click(screen.getByRole("button", { name: "Send my answers" }));

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(SEND_PROBLEM);
    expect(screen.getByRole("spinbutton", { name: /Your weight/ })).toHaveValue(
      64.5,
    );
    expect(
      screen.getByRole("combobox", {
        name: /The day that suits you for check-ins/,
      }),
    ).toHaveTextContent("Friday");
    expect(
      screen.getByRole("button", { name: "Send my answers" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("heading", { level: 1, name: "A few more details" }),
    ).toBeVisible();
  });

  it("shows the server's message on the answer it refused", async () => {
    // arrange
    const user = userEvent.setup();
    answerDetailAnswers(() =>
      HttpResponse.json(
        {
          problems: [
            {
              formId: "goal-availability",
              fieldId: "weight",
              message: WEIGHT_PROBLEM,
            },
          ],
        },
        { status: 422 },
      ),
    );
    await openAnswerRequest(answerPage());

    // act
    await user.click(screen.getByRole("button", { name: "Send my answers" }));

    // assert
    const weight = screen.getByRole("spinbutton", { name: /Your weight/ });
    await waitFor(() =>
      expect(weight).toHaveAccessibleDescription(WEIGHT_PROBLEM),
    );
    expect(weight).toBeInvalid();
    expect(screen.queryByText(SEND_PROBLEM)).not.toBeInTheDocument();
  });
});
