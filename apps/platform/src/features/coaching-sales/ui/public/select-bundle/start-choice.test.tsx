// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CheckoutChoice } from "~/features/coaching-sales/contracts/coaching-sales";

import { StartChoice } from "./start-choice";

afterEach(() => {
  cleanup();
});

type RenderOptions = {
  error?: string | null;
  onChange?: (choice: CheckoutChoice["startChoice"]) => void;
  value?: CheckoutChoice["startChoice"] | null;
};

function renderStartChoice(options: RenderOptions) {
  const firstOptionRef = createRef<HTMLButtonElement>();
  const router = createMemoryRouter([
    {
      element: (
        <StartChoice
          error={options.error ?? null}
          firstOptionRef={firstOptionRef}
          onChange={options.onChange ?? vi.fn()}
          value={options.value ?? null}
          waitingStartsOn="2026-10-10"
        />
      ),
      path: "/",
    },
  ]);
  render(<RouterProvider router={router} />);

  return { firstOptionRef };
}

describe("StartChoice", () => {
  it("asks when the program starts with no option chosen and the waiting start date", () => {
    // arrange
    const options = {};

    // act
    renderStartChoice(options);

    // assert
    const group = screen.getByRole("radiogroup", {
      name: "When would you like your program to start?",
    });
    expect(group).not.toHaveAttribute("aria-invalid");
    for (const option of screen.getAllByRole("radio")) {
      expect(option).not.toBeChecked();
    }
    expect(screen.getByText("10 October")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See how this works in the terms" }),
    ).toHaveAttribute(
      "href",
      "/terms#immediate-digital-delivery-and-withdrawal",
    );
  });

  it("reports the start a person picks", async () => {
    // arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderStartChoice({ onChange });

    // act
    await user.click(
      screen.getByRole("radio", {
        name: /Start after the 14-day withdrawal period ends\./,
      }),
    );

    // assert
    expect(onChange).toHaveBeenCalledWith("waiting");
  });

  it("marks the group invalid and announces the error", () => {
    // arrange
    const error = "Choose when you'd like your program to start.";

    // act
    renderStartChoice({ error });

    // assert
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(error);
    expect(group).toHaveAccessibleDescription(error);
  });

  it("hands the first option to the caller so focus can move to it", () => {
    // arrange
    const options = {};

    // act
    const { firstOptionRef } = renderStartChoice(options);

    // assert
    expect(firstOptionRef.current).toBe(
      screen.getByRole("radio", {
        name: /Start as soon as my payment is confirmed\./,
      }),
    );
  });
});
