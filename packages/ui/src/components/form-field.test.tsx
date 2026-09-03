// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FormField } from "./form-field";

afterEach(() => {
  cleanup();
});

function renderField(props: { error?: string; hint?: string }) {
  return render(
    <FormField id="protein" label="Protein %" {...props}>
      {(control) => <input {...control} />}
    </FormField>,
  );
}

describe("FormField", () => {
  it("names the control with its label", () => {
    // arrange, act
    renderField({});

    // assert
    expect(screen.getByRole("textbox", { name: "Protein %" })).toBeVisible();
  });

  it("keeps the hint readable while an error stands", () => {
    // arrange: the state a coach lands in after correcting a rejected field —
    // the error has not been recomputed yet, but the hint already describes
    // the value now in the box.
    // act
    renderField({
      error: "Protein must be between 0 and 100%.",
      hint: "157 g · 628 kcal",
    });

    // assert
    expect(screen.getByText("157 g · 628 kcal")).toBeVisible();
    expect(
      screen.getByText("Protein must be between 0 and 100%."),
    ).toBeVisible();
  });

  it("describes the control only by messages it actually renders", () => {
    // arrange, act
    renderField({
      error: "Protein must be between 0 and 100%.",
      hint: "157 g · 628 kcal",
    });

    // assert
    const control = screen.getByRole("textbox", { name: "Protein %" });
    const describedBy = control.getAttribute("aria-describedby") ?? "";

    expect(describedBy.split(" ").filter(Boolean)).not.toHaveLength(0);
    for (const id of describedBy.split(" ").filter(Boolean)) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("marks the control invalid only when it has an error", () => {
    // arrange, act
    renderField({ hint: "157 g · 628 kcal" });

    // assert
    expect(screen.getByRole("textbox", { name: "Protein %" })).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });
});
