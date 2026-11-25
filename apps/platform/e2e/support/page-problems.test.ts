import { EventEmitter } from "node:events";

import type { Page } from "@playwright/test";
import { describe, expect, it } from "vitest";

import { collectPageProblems } from "./page-problems";

const PAGE_URL = "http://localhost:3100/coach/clients";
const APP_SCRIPT_URL = "http://localhost:3100/app/root.tsx";
const PRELOADED_FONT_WARNING =
  "The resource http://localhost:3100/@fs/Users/coach/eli-coach-platform/node_modules/.pnpm/@fontsource-variable+dm-sans@5.3.0/node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.";
const CLERK_DEVELOPMENT_KEYS_WARNING =
  "Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits and should not be used when deploying your application to production.";

type ConsoleLine = { type: string; text: string; url?: string };

class FakePage extends EventEmitter {
  url(): string {
    return PAGE_URL;
  }

  logs({ type, text, url = APP_SCRIPT_URL }: ConsoleLine): void {
    this.emit("console", {
      type: () => type,
      text: () => text,
      location: () => ({ url, lineNumber: 1, columnNumber: 1 }),
    });
  }
}

function collectFrom(page: FakePage): readonly string[] {
  return collectPageProblems(page as unknown as Page);
}

describe("collectPageProblems", () => {
  it.each([
    ["an error", "error", "Cannot read properties of undefined"],
    ["a warning", "warning", "Each child in a list should have a unique key"],
    [
      "a preload warning for a file that is not a font",
      "warning",
      "The resource http://localhost:3100/app/root.tsx was preloaded using link preload but not used within a few seconds from the window's load event.",
    ],
  ])("reports %s the application logs", (_name, type, text) => {
    // arrange
    const page = new FakePage();
    const problems = collectFrom(page);

    // act
    page.logs({ type, text });

    // assert
    expect(problems).toEqual([
      `${type} at ${PAGE_URL} from ${APP_SCRIPT_URL}: ${text.slice(0, 160)}`,
    ]);
  });

  it.each([
    ["Clerk's development keys notice", CLERK_DEVELOPMENT_KEYS_WARNING],
    ["a preloaded font the page did not use yet", PRELOADED_FONT_WARNING],
  ])("ignores %s", (_name, text) => {
    // arrange
    const page = new FakePage();
    const problems = collectFrom(page);

    // act
    page.logs({ type: "warning", text });

    // assert
    expect(problems).toEqual([]);
  });

  it("ignores what the application only logs for information", () => {
    // arrange
    const page = new FakePage();
    const problems = collectFrom(page);

    // act
    page.logs({ type: "info", text: "Download the React DevTools" });

    // assert
    expect(problems).toEqual([]);
  });
});
