import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";

import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PublicLayoutLoaderData = {
  waitlist: Waitlist;
};

export async function loader(): Promise<PublicLayoutLoaderData> {
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
