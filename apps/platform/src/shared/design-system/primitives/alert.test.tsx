// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Alert, AlertAction } from "./alert";

afterEach(() => {
  cleanup();
});

describe("Alert", () => {
  it("reports the failure with no action of its own", () => {
    // arrange
    const message = "Your changes weren't saved.";

    // act
    render(<Alert>{message}</Alert>);

    // assert
    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent(message);
    expect(alert).not.toHaveClass("flex");
    expect(within(alert).queryByRole("button")).not.toBeInTheDocument();
  });

  it("carries its recovery action inside the card, after the message", async () => {
    // arrange
    const user = userEvent.setup();
    const retry = vi.fn();

    render(
      <Alert action={<AlertAction onClick={retry}>Try again</AlertAction>}>
        <p>We couldn&apos;t load the open times just now.</p>
      </Alert>,
    );

    const alert = screen.getByRole("alert");
    const action = within(alert).getByRole("button", { name: "Try again" });

    // act
    await user.click(action);

    // assert
    expect(retry).toHaveBeenCalledOnce();
    expect(action).toHaveAttribute("type", "button");
    expect(alert).toHaveClass("flex", "flex-wrap");
    expect(
      within(alert)
        .getByText("We couldn't load the open times just now.")
        .compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
