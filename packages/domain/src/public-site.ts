import type { FeatureFlagSet } from "./feature-flags";

export type PublicLaunchMode = "waitlist" | "normal";

export const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export const publicNavigationLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/pricing", label: "Pricing" },
] as const;

type ResolvePublicLaunchModeOptions = {
  featureFlags?: FeatureFlagSet | null;
};

type ResolvePublicLaunchModeFromFeatureFlagsOptions = {
  readFeatureFlags: () => Promise<FeatureFlagSet>;
};

type ResolvePublicLaunchModePreviewOverrideOptions = {
  isEnabled: boolean;
  searchParams: URLSearchParams;
};

export function resolvePublicLaunchMode(
  options: ResolvePublicLaunchModeOptions,
): PublicLaunchMode {
  return options.featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] === false ? "normal" : "waitlist";
}

export async function resolvePublicLaunchModeFromFeatureFlags(
  options: ResolvePublicLaunchModeFromFeatureFlagsOptions,
): Promise<PublicLaunchMode> {
  try {
    return resolvePublicLaunchMode({
      featureFlags: await options.readFeatureFlags(),
    });
  } catch {
    return "waitlist";
  }
}

export function resolvePublicLaunchModePreviewOverride(
  options: ResolvePublicLaunchModePreviewOverrideOptions,
): PublicLaunchMode | null {
  if (!options.isEnabled || !options.searchParams.has("waitlist")) {
    return null;
  }

  return options.searchParams.get("waitlist") === "0" ? "normal" : "waitlist";
}
