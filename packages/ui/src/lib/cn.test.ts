import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "./cn";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const stylesPath = resolve(currentDirectory, "../styles.css");

function readThemeTokenNames(namespace: string): string[] {
  const css = readFileSync(stylesPath, "utf8");
  const themeBlock = css.match(/@theme inline \{([\s\S]*?)\n\}/)?.[1];
  if (!themeBlock) {
    throw new Error(
      "Could not find an `@theme inline { ... }` block in styles.css",
    );
  }

  const companionSuffix = /--(line-height|font-weight|letter-spacing)$/;
  const seen = new Set<string>();
  for (const match of themeBlock.matchAll(
    new RegExp(`--${namespace}-([a-zA-Z0-9-]+):`, "g"),
  )) {
    const name = match[1];
    if (!companionSuffix.test(name)) {
      seen.add(name);
    }
  }

  return [...seen];
}

const roleNamespaces = [
  { namespace: "text", utility: "text", framework: "text-sm" },
  { namespace: "radius", utility: "rounded", framework: "rounded-full" },
  { namespace: "shadow", utility: "shadow", framework: "shadow-none" },
  { namespace: "tracking", utility: "tracking", framework: "tracking-wide" },
  { namespace: "leading", utility: "leading", framework: "leading-tight" },
  { namespace: "container", utility: "max-w", framework: "max-w-full" },
];

describe("cn theme role registration", () => {
  it.each(roleNamespaces)(
    "finds $namespace role tokens to check",
    ({ namespace }) => {
      // arrange
      const tokenNames = readThemeTokenNames(namespace);

      // act
      const count = tokenNames.length;

      // assert
      expect(count).toBeGreaterThan(0);
    },
  );

  describe.each(roleNamespaces)(
    "the $namespace roles",
    ({ namespace, utility, framework }) => {
      it.each(readThemeTokenNames(namespace))(
        `lets a later framework ${utility} utility replace the %s role`,
        (tokenName) => {
          // arrange
          const roleClass = `${utility}-${tokenName}`;

          // act
          const merged = cn(roleClass, framework);

          // assert
          expect(merged).toBe(framework);
        },
      );
    },
  );

  it.each(readThemeTokenNames("text"))(
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

  it("keeps a radius role and a shadow role on the same element", () => {
    // arrange
    const classes = ["rounded-card", "shadow-card"];

    // act
    const merged = cn(...classes);

    // assert
    expect(merged).toBe("rounded-card shadow-card");
  });
});
