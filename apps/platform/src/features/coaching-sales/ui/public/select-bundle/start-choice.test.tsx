// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CheckoutChoice } from "~/features/coaching-sales/contracts/coaching-sales";

import { StartChoice } from "./start-choice";

const MIDDAY_IN_UTC = "2026-10-10T10:00:00.000Z";
const LATE_EVENING_IN_UTC = "2026-10-10T21:25:00.000Z";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type RenderOptions = {
  error?: string | null;
  onChange?: (choice: CheckoutChoice["startChoice"]) => void;
  value?: CheckoutChoice["startChoice"] | null;
  waitingStartsOn?: string;
};

function startChoiceElement(
  options: RenderOptions,
  firstOptionRef = createRef<HTMLButtonElement>(),
) {
  return (
    <StartChoice
      error={options.error ?? null}
      firstOptionRef={firstOptionRef}
      onChange={options.onChange ?? vi.fn()}
      value={options.value ?? null}
      waitingStartsOn={options.waitingStartsOn ?? MIDDAY_IN_UTC}
    />
  );
}

function renderStartChoice(options: RenderOptions) {
  const firstOptionRef = createRef<HTMLButtonElement>();
  const router = createMemoryRouter([
    { element: startChoiceElement(options, firstOptionRef), path: "/" },
  ]);
  render(<RouterProvider router={router} />);

  return { firstOptionRef };
}

function readerIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
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

  it("dates the waiting start on the reader's own calendar", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    renderStartChoice({ waitingStartsOn: LATE_EVENING_IN_UTC });

    // assert
    expect(screen.getByText("11 October")).toBeInTheDocument();
  });

  it("paints the waiting start in UTC before the browser runs so hydration matches", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    const painted = renderToString(
      <MemoryRouter>
        {startChoiceElement({ waitingStartsOn: LATE_EVENING_IN_UTC })}
      </MemoryRouter>,
    );

    // assert
    expect(painted).toContain("10 October");
    expect(painted).not.toContain("11 October");
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
