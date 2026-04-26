import {
  publicNavigationLinks,
  resolvePublicLaunchMode,
  resolvePublicLaunchModeFromFeatureFlags,
  WAITLIST_MODE_FEATURE_FLAG,
} from "./public-site";
import { describe, expect, it, vi } from "vitest";

describe("resolvePublicLaunchMode", () => {
  it("returns normal mode only when WAITLIST_MODE is explicitly false", () => {
    expect(
      resolvePublicLaunchMode({
        featureFlags: {
          [WAITLIST_MODE_FEATURE_FLAG]: false,
        },
      }),
    ).toBe("normal");
  });

  it("defaults to waitlist mode when WAITLIST_MODE is true, missing, or unavailable", () => {
    expect(
      resolvePublicLaunchMode({
        featureFlags: {
          [WAITLIST_MODE_FEATURE_FLAG]: true,
        },
      }),
    ).toBe("waitlist");
    expect(resolvePublicLaunchMode({ featureFlags: {} })).toBe("waitlist");
    expect(resolvePublicLaunchMode({ featureFlags: null })).toBe("waitlist");
  });
});

describe("resolvePublicLaunchModeFromFeatureFlags", () => {
  it("defaults to waitlist mode when feature flags cannot be read", async () => {
    await expect(
      resolvePublicLaunchModeFromFeatureFlags({
        readFeatureFlags: vi.fn().mockRejectedValue(new Error("database unavailable")),
      }),
    ).resolves.toBe("waitlist");
  });
});

describe("publicNavigationLinks", () => {
  it("exports the public navigation destinations", () => {
    expect(publicNavigationLinks).toEqual([
      { href: "/", label: "Home" },
      { href: "/store", label: "Store" },
      { href: "/pricing", label: "Pricing" },
    ]);
  });
});
