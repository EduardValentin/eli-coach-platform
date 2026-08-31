// The client portal is the only installable surface: the coach portal is not
// a PWA in MVP, and the public site never was.
export const pwaSurfaceDefinitions = {
  client: {
    name: "Evoa Client Portal",
    shortName: "Evoa Client",
    description: "Client-facing coaching portal for workouts, progress, check-ins, and messaging.",
    themeColor: "#17212f",
  },
} as const;
