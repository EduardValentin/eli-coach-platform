// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

afterEach(() => {
  cleanup();
});

function SendLinkConfirmation(props: {
  cancelLabel?: string;
  onConfirm: () => void;
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
      />
    </>
  );
}

async function openConfirmation(options?: { cancelLabel?: string }) {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  render(
    <SendLinkConfirmation
      cancelLabel={options?.cancelLabel}
      onConfirm={onConfirm}
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
});
