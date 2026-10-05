// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FileDropzone, FilePickerButton } from "./file-dropzone";

afterEach(() => {
  cleanup();
});

const ACCEPT = ".pdf,application/pdf";

const PROMPT = "Drop a file here or choose one";

const HINT = "PDF up to 25 MB";

function pdfNamed(name: string): File {
  return new File(["%PDF-1.7"], name, { type: "application/pdf" });
}

function dragOut(zone: HTMLElement, { towards }: { towards: Element }) {
  fireEvent(
    zone,
    new MouseEvent("dragleave", { bubbles: true, relatedTarget: towards }),
  );
}

function renderDropzone(
  overrides: Partial<Parameters<typeof FileDropzone>[0]> = {},
) {
  const onFileChosen = vi.fn();
  render(
    <>
      <FileDropzone
        accept={ACCEPT}
        hint={HINT}
        onFileChosen={onFileChosen}
        prompt={PROMPT}
        {...overrides}
      />
      <p id="file-error">That file is too large.</p>
    </>,
  );

  return {
    onFileChosen,
    input: screen.getByLabelText(PROMPT),
    zone: screen.getByText(PROMPT).closest("label") as HTMLLabelElement,
  };
}

describe("FileDropzone", () => {
  it("names its file input by the prompt and describes it by the hint", () => {
    // arrange
    // act
    const { input } = renderDropzone({ id: "resource-file" });

    // assert
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ACCEPT);
    expect(input).toHaveAttribute("id", "resource-file");
    expect(input).toHaveAccessibleDescription(HINT);
    expect(input).toHaveClass("sr-only");
  });

  it("adds a field problem to the hint in the input's description", () => {
    // arrange
    // act
    const { input } = renderDropzone({
      "aria-describedby": "file-error",
      "aria-invalid": true,
    });

    // assert
    expect(input).toHaveAccessibleDescription(
      `${HINT} That file is too large.`,
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("reports the picked file and clears the input so the same file can be picked again", async () => {
    // arrange
    const user = userEvent.setup();
    const { input, onFileChosen } = renderDropzone();
    const plan = pdfNamed("plan.pdf");

    // act
    await user.upload(input, plan);

    // assert
    expect(onFileChosen).toHaveBeenCalledExactlyOnceWith(plan);
    expect(input).toHaveValue("");
  });

  it("is reached from the keyboard and draws the shared focus ring on the zone", async () => {
    // arrange
    const user = userEvent.setup();
    const { input, zone } = renderDropzone();

    // act
    await user.tab();

    // assert
    expect(input).toHaveFocus();
    expect(zone).toHaveAttribute("data-chip-control");
  });

  it("shows the dragging state while a file is held over it", () => {
    // arrange
    const { zone } = renderDropzone();

    // act
    fireEvent.dragEnter(zone);

    // assert
    expect(zone).toHaveAttribute("data-dragging");
    expect(zone).toHaveClass(
      "border-primary",
      "bg-primary-soft",
      "hover:bg-primary-soft",
    );
    expect(zone).not.toHaveClass("border-control-border-soft");
  });

  it("keeps the dragging state while the file moves over its own content", () => {
    // arrange
    const { zone } = renderDropzone();
    fireEvent.dragEnter(zone);

    // act
    dragOut(zone, { towards: screen.getByText(HINT) });

    // assert
    expect(zone).toHaveAttribute("data-dragging");
  });

  it("drops the dragging state when the file leaves the zone", () => {
    // arrange
    const { zone } = renderDropzone();
    fireEvent.dragEnter(zone);

    // act
    dragOut(zone, { towards: document.body });

    // assert
    expect(zone).not.toHaveAttribute("data-dragging");
    expect(zone).toHaveClass("border-control-border-soft");
  });

  it("reports only the first of several dropped files", () => {
    // arrange
    const { onFileChosen, zone } = renderDropzone();
    const first = pdfNamed("first.pdf");
    fireEvent.dragOver(zone);

    // act
    fireEvent.drop(zone, {
      dataTransfer: { files: [first, pdfNamed("second.pdf")] },
    });

    // assert
    expect(onFileChosen).toHaveBeenCalledExactlyOnceWith(first);
    expect(zone).not.toHaveAttribute("data-dragging");
  });

  it("frames the zone in the quiet dashed field look at rest", () => {
    // arrange
    // act
    const { zone } = renderDropzone();

    // assert
    expect(zone).toHaveClass(
      "flex",
      "cursor-pointer",
      "flex-col",
      "items-center",
      "gap-2",
      "rounded-field",
      "border",
      "border-dashed",
      "border-control-border-soft",
      "bg-surface-quiet",
      "px-4",
      "py-8",
      "text-center",
      "transition-colors",
      "hover:bg-surface-muted",
    );
  });

  it("outlines the zone in the danger colour while the field has a problem", () => {
    // arrange
    // act
    const { zone } = renderDropzone({ "aria-invalid": true });

    // assert
    expect(zone).toHaveClass("border-feedback-danger");
    expect(zone).not.toHaveClass("border-control-border-soft");
  });
});

describe("FilePickerButton", () => {
  function renderPicker() {
    const onFileChosen = vi.fn();
    render(
      <FilePickerButton accept={ACCEPT} onFileChosen={onFileChosen}>
        Replace
      </FilePickerButton>,
    );

    return { onFileChosen, input: screen.getByLabelText("Replace") };
  }

  it("is a file input named by its visible text, inside an outline extra-small button", () => {
    // arrange
    // act
    const { input } = renderPicker();

    // assert
    const button = input.closest("label");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ACCEPT);
    expect(button).toHaveAttribute("data-chip-control");
    expect(button).toHaveClass(
      "cursor-pointer",
      "border-control-border-soft",
      "h-(--size-control-xs)",
      "rounded-field",
    );
  });

  it("reports the picked file and clears the input", async () => {
    // arrange
    const user = userEvent.setup();
    const { input, onFileChosen } = renderPicker();
    const plan = pdfNamed("plan.pdf");

    // act
    await user.upload(input, plan);

    // assert
    expect(onFileChosen).toHaveBeenCalledExactlyOnceWith(plan);
    expect(input).toHaveValue("");
  });
});
