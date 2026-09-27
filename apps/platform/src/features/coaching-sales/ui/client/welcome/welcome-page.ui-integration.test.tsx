// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { WelcomePage } from "~/features/coaching-sales/contracts/client-journey";
import {
  CLIENT_ONBOARDING_PATH,
  CLIENT_WELCOME_PATH,
} from "~/features/coaching-sales/contracts/paths";

import WelcomeRoute from "./welcome-page";

const FIVE_PART_INTRO =
  "But first, I need to get to know you. Your next step is a short form in five parts — it takes about 15 minutes — covering your goals, your training experience, your health, your cycle, your nutrition and your measurements.";
const FOUR_PART_INTRO =
  "But first, I need to get to know you. Your next step is a short form in four parts — it takes about 15 minutes — covering your goals, your training experience, your health, your nutrition and your measurements.";

const server = setupServer();

let welcomeSubmissions: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  welcomeSubmissions = [];
});

afterAll(() => {
  server.close();
});

function answerWelcomeSubmission() {
  server.use(
    http.post(`*${CLIENT_WELCOME_PATH}`, async ({ request }) => {
      welcomeSubmissions.push(request.method);

      return new HttpResponse(null, {
        headers: { Location: CLIENT_ONBOARDING_PATH },
        status: 302,
      });
    }),
  );
}

function renderWelcome(page: WelcomePage) {
  const router = createMemoryRouter(
    [
      {
        action: ({ request }: { request: Request }) =>
          fetch(request, { redirect: "manual" }),
        Component: WelcomeRoute,
        loader: () => page,
        path: CLIENT_WELCOME_PATH,
      },
      {
        Component: () => <p>Onboarding</p>,
        path: CLIENT_ONBOARDING_PATH,
      },
    ],
    { initialEntries: [CLIENT_WELCOME_PATH] },
  );
  render(<RouterProvider router={router} />);

  return router;
}

describe("WelcomeRoute", () => {
  it("welcomes her by her first name with the five-part form for her", async () => {
    // arrange
    const page: WelcomePage = { firstName: "Ana", wording: "five-part" };

    // act
    renderWelcome(page);

    // assert
    const main = await screen.findByRole("main", { name: "Welcome" });
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Welcome to Evoa Fitness, Ana",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      within(main).getByText("I'm really glad you're here."),
    ).toBeInTheDocument();
    expect(
      within(main).getByText(
        "From now on, we work together — with a plan built around your goals and what your body actually needs.",
      ),
    ).toBeInTheDocument();
    expect(within(main).getByText(FIVE_PART_INTRO)).toBeInTheDocument();
    expect(
      within(main).getByText(
        "You can pause and come back anytime — your answers are saved as you go. Try not to leave it too long: I can only start building your program once I have your answers.",
      ),
    ).toBeInTheDocument();
    expect(
      within(main).getByText(
        "Once you've completed it, I'll go through everything and build your program. You'll find it right here in your account.",
      ),
    ).toBeInTheDocument();
    expect(within(main).queryByText(FOUR_PART_INTRO)).not.toBeInTheDocument();
  });

  it("describes the four-part form to a client whose form has no cycle part", async () => {
    // arrange
    const page: WelcomePage = { firstName: "Radu", wording: "four-part" };

    // act
    renderWelcome(page);

    // assert
    expect(
      await screen.findByRole("heading", {
        name: "Welcome to Evoa Fitness, Radu",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(FOUR_PART_INTRO)).toBeInTheDocument();
    expect(screen.queryByText(FIVE_PART_INTRO)).not.toBeInTheDocument();
  });

  it("reaches the start button first from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    renderWelcome({ firstName: "Ana", wording: "five-part" });
    await screen.findByRole("heading", { level: 1 });

    // act
    await user.tab();

    // assert
    expect(
      screen.getByRole("button", { name: "Let's get started" }),
    ).toHaveFocus();
  });

  it("records her start and takes her on to onboarding", async () => {
    // arrange
    answerWelcomeSubmission();
    const user = userEvent.setup();
    const router = renderWelcome({ firstName: "Ana", wording: "five-part" });
    await screen.findByRole("heading", { level: 1 });

    // act
    await user.tab();
    await user.keyboard("{Enter}");

    // assert
    expect(await screen.findByText("Onboarding")).toBeInTheDocument();
    expect(welcomeSubmissions).toEqual(["POST"]);
    expect(router.state.location.pathname).toBe(CLIENT_ONBOARDING_PATH);
  });
});
