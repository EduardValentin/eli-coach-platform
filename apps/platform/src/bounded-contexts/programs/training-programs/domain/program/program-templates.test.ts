import { describe, expect, it } from "vitest";

import {
  fillTemplate,
  templateText,
  type TemplateKey,
} from "./program-templates";

const KEYS: TemplateKey[] = [
  "missedDay",
  "block.foundation",
  "block.hypertrophy",
  "block.strength",
  "block.deload",
  "split.full-body",
  "split.upper-lower",
];

describe("templateText", () => {
  it("returns the English text", () => {
    // act
    const text = templateText("block.hypertrophy", "en");

    // assert
    expect(text).toMatch(/^\*\*Building muscle/);
  });

  it("falls back to English for Romanian", () => {
    // act
    const text = templateText("missedDay", "ro");

    // assert
    expect(text).toBe(templateText("missedDay", "en"));
  });

  it.each(KEYS)("has a non-empty English text for %s", (key) => {
    // act
    const text = templateText(key, "en");

    // assert
    expect(text.length).toBeGreaterThan(0);
  });

  it("keeps the bold first line of a block text", () => {
    // act
    const text = templateText("block.foundation", "en");

    // assert
    expect(text).toMatch(/^\*\*Building your base/);
  });
});

describe("fillTemplate", () => {
  it("replaces the frequency placeholder with a number", () => {
    // act
    const text = fillTemplate("Full Body, [2–3]x per week", { days: 3 });

    // assert
    expect(text).toBe("Full Body, 3x per week");
  });

  it("keeps a placeholder with no value", () => {
    // act
    const text = fillTemplate("Full Body, [2–3]x per week", {});

    // assert
    expect(text).toBe("Full Body, [2–3]x per week");
  });
});
