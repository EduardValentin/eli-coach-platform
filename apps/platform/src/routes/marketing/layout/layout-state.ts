import type { Waitlist } from "@eli-coach-platform/contracts";

import type {
  BotDetectionConfig,
  BotDetectionRuntimeState,
} from "~/modules/bot-detection/bot-detection-contract";

import type { WaitlistAvailabilityPresentationState } from "../waitlist/waitlist-availability-status";

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
