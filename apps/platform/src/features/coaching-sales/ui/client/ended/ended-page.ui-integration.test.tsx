// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type { ClientEnded } from "~/features/coaching-sales/contracts/client-subscription";
import { CLIENT_ENDED_PATH } from "~/features/coaching-sales/contracts/paths";

import EndedRoute from "./ended-page";

const REFUND_LINE =
  "Eli will refund you in the next few days; it reaches your card within 5–10 business days.";

afterEach(() => {
  cleanup();
});

function renderEnded(page: ClientEnded) {
  const router = createMemoryRouter(
    [{ Component: EndedRoute, loader: () => page, path: CLIENT_ENDED_PATH }],
    { initialEntries: [CLIENT_ENDED_PATH] },
  );

  render(<RouterProvider router={router} />);
}

describe("the ended page", () => {
  it("tells her the coaching has ended in two sentences with nothing to do", async () => {
    // arrange, act
    renderEnded({ refundDue: false });

    // assert
    const main = await screen.findByRole("main", {
      name: "Your coaching has ended",
    });
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Your coaching has ended",
      }),
    ).toBeInTheDocument();
    expect(
      within(main).getByText("It was good to train together."),
    ).toBeInTheDocument();
    expect(within(main).queryByText(REFUND_LINE)).not.toBeInTheDocument();
    expect(within(main).queryByRole("link")).not.toBeInTheDocument();
    expect(within(main).queryByRole("button")).not.toBeInTheDocument();
  });

  it("adds that her refund is on its way while it is still due", async () => {
    // arrange, act
    renderEnded({ refundDue: true });

    // assert
    const main = await screen.findByRole("main", {
      name: "Your coaching has ended",
    });
    expect(within(main).getByText(REFUND_LINE)).toBeInTheDocument();
  });
});
