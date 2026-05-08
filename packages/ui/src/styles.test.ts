import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("public bundle entry motion", () => {
  it("uses separate fade and spring-like y animations to match the prototype feel", () => {
    expect(styles).toContain(
      "ui-public-bundle-fade-enter 300ms var(--motion-public-bundle-opacity-ease) both",
    );
    expect(styles).toContain(
      "ui-public-bundle-y-enter 520ms var(--motion-public-bundle-snap-ease) both",
    );
    expect(styles).toContain("animation-delay: 80ms, 80ms;");
    expect(styles).toContain("animation-delay: 160ms, 160ms;");
    expect(styles).toContain("transform: translateY(calc(var(--motion-public-bundle-entry-offset) * -0.05));");
  });
});
