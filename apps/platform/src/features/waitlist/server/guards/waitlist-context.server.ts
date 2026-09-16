import { createContext, type RouterContext } from "react-router";

import type { WaitlistFeature } from "../waitlist-composition.server";

export const waitlistContext: RouterContext<WaitlistFeature> = createContext<WaitlistFeature>();
