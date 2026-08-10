import type { Waitlist } from "~/features/waitlist/contracts/waitlist";

import type {
  BotDetectionConfig,
  BotDetectionRuntimeState,
} from "@eli-coach-platform/infrastructure/bot-detection";

import type { WaitlistAvailabilityPresentationState } from "~/features/waitlist/ui/public/waitlist-availability-status";

export function resolveBotDetectionRuntimeState(query: {
  data: BotDetectionConfig | undefined;
  isError: boolean;
}): BotDetectionRuntimeState {
  if (query.data) {
    return {
      config: query.data,
      status: "ready",
    };
  }

  return {
    config: null,
    status: query.isError ? "unavailable" : "loading",
  };
}

export function resolveWaitlistAvailabilityPresentationState(options: {
  hasFetchedRuntimeData: boolean;
  waitlist: Waitlist;
}): WaitlistAvailabilityPresentationState {
  if (options.waitlist.availability !== null) {
    return "ready";
  }

  return options.hasFetchedRuntimeData ? "unavailable" : "loading";
}
