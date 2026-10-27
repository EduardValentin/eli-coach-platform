import { createContext, type RouterContext } from "react-router";

import type { WaitlistController } from "~/bounded-contexts/sales/waitlist/adapters/inbound/http/waitlist-controller.server";

export type WaitlistFeature = {
  waitlist: WaitlistController;
};

export const waitlistContext: RouterContext<WaitlistFeature> =
  createContext<WaitlistFeature>();
