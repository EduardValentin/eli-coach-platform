// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";

import type { CheckInScheduling } from "~/features/check-ins/public/check-ins";

import { ScheduleCheckInAction } from "./schedule-check-in-action";

const CLIENT_PAGE_PATH = "/coach/clients/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const AWAITING_REASON =
  "She can answer a check-in once she has sent her onboarding.";

const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
});

describe("the coach's Schedule check-in action", () => {
  it("is offered for a client who can answer", async () => {
    // arrange, act
    await renderAction({ scheduling: "allowed" });

    // assert
    const button = scheduleButton();
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button).not.toHaveAccessibleDescription();
  });

  it("is left out once her coaching has ended", async () => {
    // arrange, act
    await renderAction({ scheduling: "ended" });

    // assert
    expect(
      screen.queryByRole("button", { name: "Schedule check-in" }),
    ).not.toBeInTheDocument();
  });

  it("is held back before she sends her onboarding without a line explaining it", async () => {
    // arrange, act
    await renderAction({ scheduling: "awaiting_onboarding" });

    // assert
    const button = scheduleButton();
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText(AWAITING_REASON)).not.toBeInTheDocument();
  });

  it("explains why it is held back when the coach hovers it", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.hover(scheduleButton());

    // assert
    expect(await screen.findByText(AWAITING_REASON)).toBeVisible();
    expect(scheduleButton()).toHaveAccessibleDescription(AWAITING_REASON);
  });

  it("explains why it is held back when the coach tabs to it", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.tab();

    // assert
    expect(scheduleButton()).toHaveFocus();
    expect(scheduleButton()).toHaveAccessibleDescription(AWAITING_REASON);
  });

  it("explains why it is held back when the coach taps it, without opening the dialog", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.pointer({ keys: "[TouchA]", target: scheduleButton() });

    // assert
    expect(await screen.findByText(AWAITING_REASON)).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Schedule a check-in with Ana" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("does not open the dialog on %s while held back", async (_key, keys) => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });
    await user.tab();

    // act
    await user.keyboard(keys);

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Schedule a check-in with Ana" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["male", "He can answer a check-in once he has sent his onboarding."],
    [
      "prefer_not_to_say",
      "They can answer a check-in once they have sent their onboarding.",
    ],
  ] as const)(
    "words the reason for a client who is %s",
    async (gender, reason) => {
      // arrange
      const user = await renderAction({
        gender,
        scheduling: "awaiting_onboarding",
      });

      // act
      await user.hover(scheduleButton());

      // assert
      expect(await screen.findByText(reason)).toBeVisible();
    },
  );

  it("passes the axe checks with the reason open", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.hover(scheduleButton());
    await screen.findByText(AWAITING_REASON);

    // assert
    expect((await axe(document.body)).violations).toEqual([]);
  });
});

function scheduleButton(): HTMLElement {
  return screen.getByRole("button", { name: "Schedule check-in" });
}

async function renderAction({
  gender = "female",
  scheduling,
}: {
  gender?: VisitorGender;
  scheduling: CheckInScheduling;
}) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <main aria-label="Coach portal content">
            <h1>Ana Popescu</h1>
            <ScheduleCheckInAction
              client={{
                clientId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
                firstName: "Ana",
                gender,
              }}
              scheduling={scheduling}
            />
          </main>
        ),
        path: CLIENT_PAGE_PATH,
      },
    ],
    { initialEntries: [CLIENT_PAGE_PATH] },
  );

  render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1, name: "Ana Popescu" });

  return user;
}
