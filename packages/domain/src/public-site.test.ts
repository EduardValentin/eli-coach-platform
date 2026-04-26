import {
  publicNavigationLinks,
  resolvePublicLaunchMode,
  resolvePublicLaunchModeFromFeatureFlags,
  resolvePublicLaunchModePreviewOverride,
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

describe("resolvePublicLaunchModePreviewOverride", () => {
  it("mirrors the design reference waitlist query parameter when enabled", () => {
    expect(
      resolvePublicLaunchModePreviewOverride({
        isEnabled: true,
        searchParams: new URLSearchParams("waitlist=0"),
      }),
    ).toBe("normal");
    expect(
      resolvePublicLaunchModePreviewOverride({
        isEnabled: true,
        searchParams: new URLSearchParams("waitlist=1"),
      }),
    ).toBe("waitlist");
  });

  it("ignores preview overrides when disabled or absent", () => {
    expect(
      resolvePublicLaunchModePreviewOverride({
        isEnabled: false,
        searchParams: new URLSearchParams("waitlist=0"),
      }),
    ).toBeNull();
    expect(
      resolvePublicLaunchModePreviewOverride({
        isEnabled: true,
        searchParams: new URLSearchParams(),
      }),
    ).toBeNull();
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
