import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { Waitlist } from "@eli-coach-platform/contracts";

import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type MarketingLayoutLoaderData = {
  waitlist: Waitlist;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  return {
    waitlist: createStaticWaitlistShell(getRuntimeEnvironment()),
  };
}

function createStaticWaitlistShell(
  runtimeEnvironment: RuntimeEnvironment,
): Waitlist {
  return {
    enabled: runtimeEnvironment.WAITLIST_MODE,
    offer: {
      plan: runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: runtimeEnvironment.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
    availability: null,
  };
}
