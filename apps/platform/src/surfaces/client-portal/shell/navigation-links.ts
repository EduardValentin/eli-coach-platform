import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";

export const clientSurfaceLinks = [
  { href: CLIENT_PORTAL_PATH, label: "Dashboard" },
  { href: "/", label: "Public Site" },
] as const;
