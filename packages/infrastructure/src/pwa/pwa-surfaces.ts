export type ProductSurface = "public-site" | "client-portal" | "coach-portal";

export const appDisplayNames: Record<ProductSurface, string> = {
  "public-site": "Eli Coach Platform",
  "client-portal": "Eli Client Portal",
  "coach-portal": "Eli Coach Portal",
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
