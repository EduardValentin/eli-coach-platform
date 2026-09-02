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
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastRegion, useToast, type ToastOptions } from "./toaster";

afterEach(() => {
  cleanup();
});

function Notifier(props: ToastOptions) {
  const { notify } = useToast();

  return (
    <button onClick={() => notify(props)} type="button">
      notify
    </button>
  );
}

function getRegion() {
  return screen.getByRole("region", { name: /Notifications/ });
}

describe("ToastRegion", () => {
  it("wraps its children in a labelled notifications landmark", () => {
    // arrange, act
    render(
      <ToastRegion>
        <p>Page content</p>
      </ToastRegion>,
    );

    // assert
    expect(getRegion()).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("shows a notification in the region and announces it politely", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <ToastRegion>
        <Notifier
          description="Back Squat is in the library."
          title="Exercise created"
          tone="success"
        />
      </ToastRegion>,
    );

    // act
    await user.click(screen.getByRole("button", { name: "notify" }));

    // assert
    expect(within(getRegion()).getByText("Exercise created")).toBeInTheDocument();
    expect(
      within(getRegion()).getByText("Back Squat is in the library."),
    ).toBeInTheDocument();
    const announcement = await screen.findByRole("status");
    expect(announcement).toHaveAttribute("aria-live", "polite");
    await waitFor(() => {
      expect(announcement).toHaveTextContent("Exercise created");
    });
  });

  it("lets the reader dismiss a notification", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <ToastRegion>
        <Notifier title="Exercise created" />
      </ToastRegion>,
    );
    await user.click(screen.getByRole("button", { name: "notify" }));

    // act
    await user.click(
      within(getRegion()).getByRole("button", { name: "Dismiss notification" }),
    );

    // assert
    expect(
      within(getRegion()).queryByText("Exercise created"),
    ).not.toBeInTheDocument();
  });

  it("refuses to notify outside a region", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // act, assert
    expect(() => render(<Notifier title="Exercise created" />)).toThrow(
      "useToast must be used within a ToastRegion.",
    );

    consoleError.mockRestore();
  });
});
