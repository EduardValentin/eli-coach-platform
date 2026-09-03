// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createTestQueryClient,
  createTestQueryClientWrapper,
} from "~test-utils/query-client";

import { ONBOARD_CLIENT_API_URL } from "./api-client";
import { OnboardClientPage } from "./onboard-client-page";

// Age is a real input from outside the process, so the suite names the day
// rather than inheriting whatever date it happens to run on.
const TODAY = new Date("2026-09-01T12:00:00Z");

const server = setupServer();

function renderWizard() {
  const Wrapper = createTestQueryClientWrapper(createTestQueryClient());
  const router = createMemoryRouter(
    [{ path: "/coach/clients/onboard", element: <OnboardClientPage /> }],
    { initialEntries: ["/coach/clients/onboard"] },
  );

  render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );

  return userEvent.setup();
}

const continueButton = () => screen.getByRole("button", { name: "Continue" });

async function completeBasics(user: UserEvent) {
  await user.type(screen.getByLabelText("First name"), "Jane");
  await user.type(screen.getByLabelText("Last name"), "Doe");
  await user.type(screen.getByLabelText("Email address"), "jane@example.com");
  await user.type(screen.getByLabelText("Date of birth"), "1996-03-15");
  await user.click(continueButton());
}

async function completeThroughNutrition(user: UserEvent) {
  await completeBasics(user);
  await user.type(screen.getByLabelText("Height (cm)"), "165");
  await user.type(screen.getByLabelText("Weight (kg)"), "65");
  await user.selectOptions(
    screen.getByLabelText("Activity level"),
    "MODERATELY_ACTIVE",
  );
  await user.click(continueButton());
  await user.click(continueButton()); // dietary restrictions are optional
  await user.selectOptions(screen.getByLabelText("Goal type"), "FAT_LOSS");
  await user.click(continueButton());
}

async function completeThroughReview(user: UserEvent) {
  await completeThroughNutrition(user);
  await user.clear(screen.getByLabelText("Daily calorie budget (kcal)"));
  await user.type(screen.getByLabelText("Daily calorie budget (kcal)"), "1786");
  await user.type(screen.getByLabelText("Target weight (kg)"), "60");
  await user.click(continueButton());
}

describe("the coach onboarding wizard", () => {
  beforeAll(() => {
    // The rate slider measures its track, which jsdom has no observer for.
    class ResizeObserverStub {
      disconnect() {}
      observe() {}
      unobserve() {}
    }

    globalThis.ResizeObserver = ResizeObserverStub;
    server.listen({ onUnhandledRequest: "error" });
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
  });
  afterEach(() => {
    vi.useRealTimers();
    server.resetHandlers();
    cleanup();
  });
  afterAll(() => server.close());

  it("refuses to advance past incomplete basics and names each missing field", async () => {
    // arrange
    const user = renderWizard();

    // act
    await user.click(continueButton());

    // assert
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
    expect(screen.getByText("First name is required.")).toBeInTheDocument();
    expect(screen.getByText("Last name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("Date of birth is required.")).toBeInTheDocument();
  });

  it("writes the budget on the review step the way it writes it everywhere else", async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughReview(user);

    // assert — the tiles a step earlier already read "1,786 kcal"
    const summary = screen.getByRole("list", { name: "Onboarding summary" });
    expect(within(summary).getByText("1,786 kcal")).toBeInTheDocument();
  });

  it("does not dress the irreversible send as the step the coach keeps pressing", async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughNutrition(user);
    const advance = continueButton().className;
    await user.clear(screen.getByLabelText("Daily calorie budget (kcal)"));
    await user.type(screen.getByLabelText("Daily calorie budget (kcal)"), "1786");
    await user.type(screen.getByLabelText("Target weight (kg)"), "60");
    await user.click(continueButton());

    // assert — Button's variant classes are part of its contract, so this is
    // the one place a class comparison says what a coach actually sees.
    const send = screen.getByRole("button", { name: "Send invitation" });
    expect(send.className).not.toBe(advance);
  });

  it("refuses a name longer than the server will accept", async () => {
    // arrange: the server's contract caps these at 100 characters, so a longer
    // one has to be caught on the step that asks for it rather than five steps
    // later when the invitation is sent.
    const user = renderWizard();

    // act
    await user.type(screen.getByLabelText("First name"), "J".repeat(101));
    await user.type(screen.getByLabelText("Last name"), "Doe");
    await user.type(screen.getByLabelText("Email address"), "jane@example.com");
    await user.type(screen.getByLabelText("Date of birth"), "1996-03-15");
    await user.click(continueButton());

    // assert
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveAccessibleDescription(
      "First name must be 100 characters or fewer.",
    );
  });

  it("ties each error to its field for a screen reader", async () => {
    // arrange
    const user = renderWizard();

    // act
    await user.click(continueButton());

    // assert — the message is the field's description, not loose text nearby
    const field = screen.getByLabelText("First name");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("First name is required.");
  });

  it("shows the calculated baselines before targets are set", async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeBasics(user);
    await user.type(screen.getByLabelText("Height (cm)"), "165");
    await user.type(screen.getByLabelText("Weight (kg)"), "65");
    await user.selectOptions(
      screen.getByLabelText("Activity level"),
      "MODERATELY_ACTIVE",
    );
    await user.click(continueButton());
    await user.click(continueButton());
    await user.selectOptions(screen.getByLabelText("Goal type"), "FAT_LOSS");
    await user.click(continueButton());

    // assert — female constant at age 30: (10*65)+(6.25*165)-(5*30)-161
    const baselines = screen.getByLabelText("Calculated baselines");
    expect(within(baselines).getByText("1,370 kcal")).toBeInTheDocument();
    expect(within(baselines).getByText("2,124 kcal")).toBeInTheDocument();
  });

  it("opens the nutrition step on a recommended pace, not at zero", async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughNutrition(user);

    // assert — 0.5% of 65 kg rounded down to a 0.05 notch, so 2124 - 330 kcal
    expect(screen.getByText("0.30")).toBeInTheDocument();
    expect(screen.getByLabelText("Daily calorie budget (kcal)")).toHaveValue(
      1794,
    );
    expect(screen.getByLabelText("Protein %")).toHaveValue(35);
  });

  it("re-seeds the split when the goal changes but the direction does not", async () => {
    // arrange — fat loss and maintenance both point down, so a direction-keyed
    // seed would leave the fat-loss split standing under a maintenance goal
    const user = renderWizard();

    // act
    await completeThroughNutrition(user);
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.selectOptions(screen.getByLabelText("Goal type"), "MAINTENANCE");
    await user.click(continueButton());

    // assert — maintenance recommends 30/40/30, fat loss 35/35/30
    expect(screen.getByLabelText("Protein %")).toHaveValue(30);
    expect(screen.getByLabelText("Carbs %")).toHaveValue(40);
  });

  it("recomputes the budget when the coach moves the pace", async () => {
    // arrange
    const user = renderWizard();

    // act — one notch faster than the seeded 0.30 kg a week
    await completeThroughNutrition(user);
    // Focused rather than clicked: a pointer drag needs capture APIs jsdom has
    // no implementation for, and the keyboard is the path being asserted anyway.
    screen.getByRole("slider", { name: "Rate of loss" }).focus();
    await user.keyboard("{ArrowRight}");

    // assert — 0.35 kg a week is a 385 kcal deficit against the 2124 kcal TDEE
    expect(screen.getByText("0.35")).toBeInTheDocument();
    expect(screen.getByLabelText("Daily calorie budget (kcal)")).toHaveValue(
      1739,
    );
  });

  it("opens on the recommended pace again for the next client", async () => {
    // arrange — the second client's goal points the same way as the first's,
    // which is what a direction-keyed seed would mistake for already seeded
    server.use(
      http.post(ONBOARD_CLIENT_API_URL, () =>
        HttpResponse.json({
          clientId: "client-1",
          invitationExpiresAt: "2026-10-01T00:00:00.000Z",
          replacedPendingInvitation: false,
          success: true,
        }),
      ),
    );
    const user = renderWizard();

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Invitation sent" }),
      ).toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: "Onboard another client" }),
    );
    await completeThroughNutrition(user);

    // assert — the recommendation, not the maintenance figure the step opens on
    expect(screen.getByLabelText("Daily calorie budget (kcal)")).toHaveValue(
      1794,
    );
    // and the split seeded again too, which is a separate ref
    expect(screen.getByLabelText("Protein %")).toHaveValue(35);
  });

  it("refuses a target weight the goal cannot reach", async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeBasics(user);
    await user.type(screen.getByLabelText("Height (cm)"), "165");
    await user.type(screen.getByLabelText("Weight (kg)"), "65");
    await user.click(continueButton());
    await user.click(continueButton());
    await user.selectOptions(screen.getByLabelText("Goal type"), "FAT_LOSS");
    await user.click(continueButton());
    await user.type(screen.getByLabelText("Target weight (kg)"), "70");
    await user.click(continueButton());

    // assert
    expect(
      screen.getByText(
        "This goal cannot raise the weight above the current 65 kg.",
      ),
    ).toBeInTheDocument();
  });

  it("confirms the invitation once the server accepts it", async () => {
    // arrange
    server.use(
      http.post(ONBOARD_CLIENT_API_URL, () =>
        HttpResponse.json({
          clientId: "client-1",
          invitationExpiresAt: "2026-10-01T00:00:00.000Z",
          replacedPendingInvitation: false,
          success: true,
        }),
      ),
    );
    const user = renderWizard();

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    // assert
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Invitation sent" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("says the earlier link stopped working when an invitation was replaced", async () => {
    // arrange
    server.use(
      http.post(ONBOARD_CLIENT_API_URL, () =>
        HttpResponse.json({
          clientId: "client-1",
          invitationExpiresAt: "2026-10-01T00:00:00.000Z",
          replacedPendingInvitation: true,
          success: true,
        }),
      ),
    );
    const user = renderWizard();

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    // assert
    await waitFor(() =>
      expect(
        screen.getByText("The earlier invitation link no longer works."),
      ).toBeInTheDocument(),
    );
  });

  it("keeps the coach on the review step when the server rejects the email", async () => {
    // arrange
    server.use(
      http.post(ONBOARD_CLIENT_API_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: "already_a_client",
              message:
                "That email already belongs to one of your clients, so nothing was saved.",
            },
            success: false,
          },
          { status: 400 },
        ),
      ),
    );
    const user = renderWizard();

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    // assert
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "That email already belongs to one of your clients, so nothing was saved.",
      ),
    );
    expect(screen.getByText("Step 6 of 6")).toBeInTheDocument();
  });

  it("reports a delivery failure as recoverable", async () => {
    // arrange
    server.use(
      http.post(ONBOARD_CLIENT_API_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: "invitation_email_failed",
              message:
                "The profile and invitation were saved, but the email could not be sent.",
            },
            success: false,
          },
          { status: 502 },
        ),
      ),
    );
    const user = renderWizard();

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    // assert — the coach can send again rather than re-entering the wizard
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "The profile and invitation were saved, but the email could not be sent.",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Send invitation" }),
    ).toBeEnabled();
  });

  it("says something went wrong when the request never reaches the server", async () => {
    // arrange
    server.use(http.post(ONBOARD_CLIENT_API_URL, () => HttpResponse.error()));
    const user = renderWizard();

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    // assert — a re-enabled button with nothing on screen would invite a retry
    // the coach cannot reason about
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong. Try sending the invitation again.",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Send invitation" }),
    ).toBeEnabled();
  });
});
