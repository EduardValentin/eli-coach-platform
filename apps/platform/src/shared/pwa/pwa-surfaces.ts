// The client portal is the only installable surface: the coach portal is not
// a PWA in MVP, and the public site never was.
export const pwaSurfaceDefinitions = {
  client: {
    name: "Evoa",
    shortName: "Evoa",
    description: "Your coaching home: your program, check-ins and progress.",
    themeColor: "#ffffff",
    backgroundColor: "#fafafa",
  },
} as const;
