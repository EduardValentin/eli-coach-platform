// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DismissibleNotice } from "./dismissible-notice";

afterEach(() => {
  cleanup();
});

describe("DismissibleNotice", () => {
  it("announces its message as a status and closes from its Dismiss button", async () => {
    // arrange
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <DismissibleNotice onDismiss={onDismiss}>
        Payment not completed. Your cart is saved.
      </DismissibleNotice>,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    // assert
    expect(screen.getByRole("status")).toHaveTextContent(
      "Payment not completed. Your cart is saved.",
    );
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
