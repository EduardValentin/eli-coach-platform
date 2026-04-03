export type ProductSurface = "marketing" | "client" | "coach" | "design-reference";

export type UserRole = "public" | "client" | "coach";

export {
  FeatureFlagService,
  waitlistModeFeatureFlag,
  type FeatureFlagName,
  type FeatureFlagReader,
  type FeatureFlagRepository,
  type PersistedFeatureFlag,
} from "./feature-flags";

export const marketingSurfaceLinks = [
  { href: "/", label: "Landing" },
  { href: "/blog", label: "Blog" },
  { href: "/store", label: "Store" },
] as const;

export const clientSurfaceLinks = [
  { href: "/client", label: "Dashboard" },
  { href: "/", label: "Public Site" },
] as const;

export const coachSurfaceLinks = [
  { href: "/coach", label: "Workspace" },
  { href: "/", label: "Public Site" },
] as const;

export const appDisplayNames: Record<ProductSurface, string> = {
  marketing: "Eli Coach Platform",
  client: "Eli Client Portal",
  coach: "Eli Coach Portal",
  "design-reference": "Design Reference",
};

export const pwaSurfaceDefinitions = {
  client: {
    name: "Eli Client Portal",
    shortName: "Eli Client",
    description: "Client-facing coaching portal for workouts, progress, check-ins, and messaging.",
    themeColor: "#17212f",
  },
  coach: {
    name: "Eli Coach Portal",
    shortName: "Eli Coach",
    description: "Coach-facing workspace for client management, planning, scheduling, and communication.",
    themeColor: "#17212f",
  },
} as const;
