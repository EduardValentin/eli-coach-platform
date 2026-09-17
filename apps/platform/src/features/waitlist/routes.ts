import { relative } from "@react-router/dev/routes";

import { WAITLIST_API_PATH } from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const waitlistApiRoutes = [
  route(WAITLIST_API_PATH.slice(1), "./api/waitlist.ts"),
];
