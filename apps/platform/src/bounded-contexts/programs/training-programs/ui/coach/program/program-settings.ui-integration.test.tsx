// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  ClientLevel,
  ProgramLanguage,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { ProgramSettings } from "./program-settings";

type Rendered = { onChange: ReturnType<typeof vi.fn> };

function renderSettings(
  level: ClientLevel = "beginner",
  language: ProgramLanguage = "en",
): Rendered {
  const onChange = vi.fn();
  render(
    <ProgramSettings language={language} level={level} onChange={onChange} />,
  );

  return { onChange };
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("the program settings", () => {
  it("shows the program's level and language in one group", () => {
    // arrange, act
    renderSettings("intermediate", "ro");

    // assert
    const group = screen.getByRole("group", { name: "Program settings" });
    expect(
      within(group).getByRole("combobox", { name: "Level" }),
    ).toHaveTextContent("Intermediate");
    expect(
      within(group).getByRole("combobox", { name: "Language" }),
    ).toHaveTextContent("Romanian");
  });

  it.each([
    { label: "Intermediate", patch: { level: "intermediate" } },
    { label: "Advanced", patch: { level: "advanced" } },
  ])("changes the level to $label", async ({ label, patch }) => {
    // arrange
    const user = userEvent.setup();
    const { onChange } = renderSettings("beginner");

    // act
    await user.click(screen.getByRole("combobox", { name: "Level" }));
    await user.click(await screen.findByRole("option", { name: label }));

    // assert
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(patch);
  });

  it("changes the language, which stays editable while the draft is the first version", async () => {
    // arrange
    const user = userEvent.setup();
    const { onChange } = renderSettings("beginner", "en");
    const language = screen.getByRole("combobox", { name: "Language" });

    // act
    await user.click(language);
    await user.click(await screen.findByRole("option", { name: "Romanian" }));

    // assert
    expect(language).toBeEnabled();
    expect(onChange).toHaveBeenCalledWith({ language: "ro" });
  });

  it("offers the levels and the languages of a program", async () => {
    // arrange
    const user = userEvent.setup();
    renderSettings();

    // act
    await user.click(screen.getByRole("combobox", { name: "Level" }));

    // assert
    expect(
      (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      ),
    ).toEqual(["Beginner", "Intermediate", "Advanced"]);
  });
});
