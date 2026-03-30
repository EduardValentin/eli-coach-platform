export type AppSurface = "www" | "client" | "coach" | "api" | "worker" | "design-reference";

export type UserRole = "public" | "client" | "coach";

export const publicSurfaceLinks = [
  { href: "/", label: "Landing" },
  { href: "/blog", label: "Blog" },
  { href: "/store", label: "Store" },
] as const;

export const appDisplayNames: Record<AppSurface, string> = {
  www: "Eli Coach Platform",
  client: "Eli Client Portal",
  coach: "Eli Coach Portal",
  api: "Eli Platform API",
  worker: "Eli Platform Worker",
  "design-reference": "Design Reference",
};
