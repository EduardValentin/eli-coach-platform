import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "./cn";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const stylesPath = resolve(currentDirectory, "../styles.css");

function readThemeBlock(): string {
  const css = readFileSync(stylesPath, "utf8");
  const themeBlock = css.match(/@theme inline \{([\s\S]*?)\n\}/)?.[1];
  if (!themeBlock) {
    throw new Error("Could not find an `@theme inline { ... }` block in styles.css");
  }

  return themeBlock;
}

function readFontSizeTokenNames(): string[] {
  const themeBlock = readThemeBlock();
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

function readCustomRadiusTokenNames(): string[] {
  const themeBlock = readThemeBlock();
  const tailwindOwnNames = new Set(["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "none", "full"]);

  return [...themeBlock.matchAll(/--radius-([a-zA-Z0-9-]+):/g)]
    .map((match) => match[1])
    .filter((name) => !tailwindOwnNames.has(name));
}

describe("cn radius token registration", () => {
  const tokenNames = readCustomRadiusTokenNames();

  it("finds custom radius tokens to check", () => {
    // arrange
    const customRadiusTokenNames = readCustomRadiusTokenNames();

    // act
    const count = customRadiusTokenNames.length;

    // assert
    expect(count).toBeGreaterThan(0);
  });

  it.each(tokenNames)(
    "lets rounded-%s replace an earlier radius rather than join it",
    (tokenName) => {
      // arrange
      const overrideClass = `rounded-${tokenName}`;

      // act
      const merged = cn("rounded-md", overrideClass);

      // assert
      expect(merged).toBe(overrideClass);
    },
  );
});

describe("cn font-size token registration", () => {
  const tokenNames = readFontSizeTokenNames();

  it("finds font-size tokens to check", () => {
    // arrange
    const fontSizeTokenNames = readFontSizeTokenNames();

    // act
    const count = fontSizeTokenNames.length;

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
