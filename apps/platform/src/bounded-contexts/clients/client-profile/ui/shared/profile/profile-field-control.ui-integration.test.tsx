// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { CANONICAL_MEASURE_UNITS } from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileFieldControl } from "./profile-field-control";
import type { ProfileField } from "./profile-fields";

type SetupValues = Record<string, string | string[]>;

const ANSWER_PROBLEM = "Choose an answer.";

const EQUIPMENT: ProfileField = {
  id: "equipment",
  label: "Equipment",
  kind: "chips",
  requirement: "required",
  options: [
    { value: "barbell", label: "Barbell" },
    { value: "dumbbells", label: "Dumbbells" },
  ],
};

const LEVEL: ProfileField = {
  id: "level",
  label: "Level",
  kind: "select",
  requirement: "required",
  options: [
    { value: "beginner", label: "Beginner" },
    { value: "advanced", label: "Advanced" },
  ],
};

const SPLIT: ProfileField = {
  id: "split",
  label: "Split",
  kind: "radio",
  requirement: "required",
  options: [
    { value: "full-body", label: "Full Body" },
    { value: "upper-lower", label: "Upper / Lower" },
  ],
};

function answered(value: string | string[]): true | string {
  return value.length > 0 || ANSWER_PROBLEM;
}

function SetupForm({ fields }: { fields: readonly ProfileField[] }) {
  const form = useForm<SetupValues>({
    defaultValues: { equipment: [], level: "", split: "" },
  });

  return (
    <form noValidate onSubmit={form.handleSubmit(() => {})}>
      {fields.map((field) => (
        <ProfileFieldControl
          control={form.control}
          field={field}
          key={field.id}
          units={CANONICAL_MEASURE_UNITS}
          validate={answered}
        />
      ))}
      <button type="submit">Save</button>
    </form>
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProfileFieldControl on an invalid submit", () => {
  it("moves focus to the first chip of an empty chip group and announces its problem", async () => {
    // arrange
    const user = userEvent.setup();
    render(<SetupForm fields={[EQUIPMENT, LEVEL]} />);

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Barbell" })).toHaveFocus();
    expect(
      screen.getByRole("group", { name: /^Equipment/ }),
    ).toHaveAccessibleDescription(ANSWER_PROBLEM);
  });

  it("moves focus to an empty select trigger when it is the first invalid field", async () => {
    // arrange
    const user = userEvent.setup();
    render(<SetupForm fields={[LEVEL, EQUIPMENT]} />);

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(screen.getByRole("combobox", { name: /^Level/ })).toHaveFocus();
  });

  it("moves focus into an unanswered segmented choice when it is the first invalid field", async () => {
    // arrange
    const user = userEvent.setup();
    render(<SetupForm fields={[SPLIT, EQUIPMENT]} />);

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Full Body" })).toHaveFocus();
  });
});
