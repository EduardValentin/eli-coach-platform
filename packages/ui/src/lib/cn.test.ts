import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "./cn";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const stylesPath = resolve(currentDirectory, "../styles.css");

// Independently re-derives the custom `text-*` font-size token names from
// styles.css, the same way cn.ts's classGroups list must be derived. This
// does not read cn.ts's own list: it walks the CSS source of truth so a
// token added to @theme without being registered in cn.ts fails below, by
// name, instead of silently losing its size class at render time.
function readFontSizeTokenNames(): string[] {
  const css = readFileSync(stylesPath, "utf8");
  const themeBlock = css.match(/@theme inline \{([\s\S]*?)\n\}/)?.[1];
  if (!themeBlock) {
    throw new Error("Could not find an `@theme inline { ... }` block in styles.css");
  }

  const companionSuffix = /--(line-height|font-weight|letter-spacing)$/;
  const seen = new Set<string>();
  for (const match of themeBlock.matchAll(/--text-([a-zA-Z0-9-]+):/g)) {
    const name = match[1];
    if (!companionSuffix.test(name)) {
      seen.add(name);
    }
  }

  return [...seen];
}

describe("cn font-size token registration", () => {
  const tokenNames = readFontSizeTokenNames();

  it("finds font-size tokens to check", () => {
    // arrange
    // (readFontSizeTokenNames ran during collection)

    // act
    const count = tokenNames.length;

    // assert
    expect(count).toBeGreaterThan(0);
  });

  it.each(tokenNames)(
    "keeps the text-%s size class when merged with a color class",
    (tokenName) => {
      // arrange
      const sizeClass = `text-${tokenName}`;

      // act
      const merged = cn(sizeClass, "text-text-primary");

      // assert
      expect(merged.split(" ")).toContain(sizeClass);
    },
  );

  it("still collapses two default Tailwind size utilities to the last one", () => {
    // arrange
    const classes = ["text-sm", "text-lg"];

    // act
    const merged = cn(...classes);

    // assert
    expect(merged).toBe("text-lg");
  });

  it("still collapses two color utilities to the last one", () => {
    // arrange
    const classes = ["text-text-primary", "text-text-secondary"];

    // act
    const merged = cn(...classes);

    // assert
    expect(merged).toBe("text-text-secondary");
  });

  it("keeps the size class at the four real component call sites", () => {
    // arrange
    const callSites = [
      "pr-12 font-heading text-display-sm font-medium text-text-primary",
      "mt-2 text-body-sm text-text-secondary",
      "px-2.5 py-2 text-label text-text-secondary",
      "py-2 text-body-sm text-text-primary",
    ];
    const expectedSizeClasses = [
      "text-display-sm",
      "text-body-sm",
      "text-label",
      "text-body-sm",
    ];

    // act
    const merged = callSites.map((classes) => cn(classes));

    // assert
    merged.forEach((result, index) => {
      expect(result.split(" ")).toContain(expectedSizeClasses[index]);
    });
  });
});
