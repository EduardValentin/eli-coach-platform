// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

afterEach(() => {
  cleanup();
});

function SendLinkConfirmation(props: {
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: "default" | "destructive";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Send payment link
      </button>
      <ConfirmDialog
        cancelLabel={props.cancelLabel}
        confirmLabel="Send link"
        description="Ana Popescu gets an email with a link to choose her bundle and pay."
        onConfirm={props.onConfirm}
        onOpenChange={setOpen}
        open={open}
        title="Send payment link?"
        tone={props.tone}
      />
    </>
  );
}

function CancellationConfirmation(props: {
  confirmDisabled?: boolean;
  problem?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Cancel
      </button>
      <ConfirmDialog
        cancelLabel="Keep my coaching"
        confirmDisabled={props.confirmDisabled}
        confirmLabel="Cancel subscription"
        description="You won't be charged again."
        onConfirm={() => setOpen(false)}
        onOpenChange={setOpen}
        open={open}
        title="Cancel subscription"
        tone="destructive"
      >
        {props.problem && <p role="alert">{props.problem}</p>}
      </ConfirmDialog>
    </>
  );
}

function CancellationReturningToHeading() {
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        Subscription
      </h2>
      <button onClick={() => setOpen(true)} type="button">
        Cancel
      </button>
      <ConfirmDialog
        confirmLabel="Cancel subscription"
        description="You won't be charged again."
        onConfirm={() => setOpen(false)}
        onOpenChange={setOpen}
        open={open}
        returnFocusTo={heading}
        title="Cancel subscription"
      />
    </>
  );
}

async function openConfirmation(options?: {
  cancelLabel?: string;
  tone?: "default" | "destructive";
}) {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  render(
    <SendLinkConfirmation
      cancelLabel={options?.cancelLabel}
      onConfirm={onConfirm}
      tone={options?.tone}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Send payment link" }));

  return { onConfirm, user };
}

describe("ConfirmDialog", () => {
  it("asks its question as a titled, described dialog", async () => {
    // arrange, act
    await openConfirmation();

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "Ana Popescu gets an email with a link to choose her bundle and pay.",
        name: "Send payment link?",
      }),
    ).toBeInTheDocument();
  });

  it("confirms through its confirm button", async () => {
    // arrange
    const { onConfirm, user } = await openConfirmation();

    // act
    await user.click(screen.getByRole("button", { name: "Send link" }));

    // assert
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes without confirming from Cancel", async () => {
    // arrange
    const { onConfirm, user } = await openConfirmation();

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes without confirming on Escape and hands focus back to what opened it", async () => {
    // arrange
    const { onConfirm, user } = await openConfirmation();

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Send payment link" }),
    ).toHaveFocus();
  });

  it("closes from its close button", async () => {
    // arrange
    const { user } = await openConfirmation();

    // act
    await user.click(screen.getByRole("button", { name: "Close" }));

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the cancel button as asked", async () => {
    // arrange, act
    await openConfirmation({ cancelLabel: "Keep editing" });

    // assert
    expect(
      screen.getByRole("button", { name: "Keep editing" }),
    ).toBeInTheDocument();
  });

  it("confirms in the primary look by default", async () => {
    // arrange, act
    await openConfirmation();

    // assert
    expect(screen.getByRole("button", { name: "Send link" })).toHaveClass(
      "bg-primary",
    );
  });

  it("carries a body between its description and its actions", async () => {
    // arrange
    const user = userEvent.setup();
    render(<CancellationConfirmation problem="The link could not be sent." />);

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(
      within(screen.getByRole("dialog")).getByRole("alert"),
    ).toHaveTextContent("The link could not be sent.");
  });

  it("holds its confirm button while the confirmation is under way", async () => {
    // arrange
    const user = userEvent.setup();
    render(<CancellationConfirmation confirmDisabled />);

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(
      screen.getByRole("button", { name: "Cancel subscription" }),
    ).toBeDisabled();
  });

  it("hands focus to the element it is told to once it closes", async () => {
    // arrange
    const user = userEvent.setup();
    render(<CancellationReturningToHeading />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // act
    await user.click(
      screen.getByRole("button", { name: "Cancel subscription" }),
    );

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Subscription" })).toHaveFocus();
  });

  it("confirms in the danger look when its action destroys something", async () => {
    // arrange, act
    await openConfirmation({ tone: "destructive" });

    // assert
    const confirm = screen.getByRole("button", { name: "Send link" });
    expect(confirm).toHaveClass("bg-feedback-danger");
    expect(confirm).not.toHaveClass("bg-primary");
  });
});
