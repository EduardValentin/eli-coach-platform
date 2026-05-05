import {
  waitlistSnapshotSchema,
  type WaitlistSnapshot,
} from "@eli-coach-platform/contracts";
import { Outlet, useLoaderData, useLocation } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import type { WaitlistController } from "~/modules/waitlist/waitlist-controller.server";
import { getPlatformContainer } from "~/server/container.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  botDetection: BotDetectionConfig;
  waitlist: WaitlistSnapshot;
};

export type MarketingOutletContext = {
  botDetection: BotDetectionConfig;
  waitlist: WaitlistSnapshot;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  const waitlistController = getPlatformContainer().waitlistController;
  const runtimeEnvironment = getRuntimeEnvironment();

  return {
    botDetection: {
      turnstileSiteKey: runtimeEnvironment.TURNSTILE_SITE_KEY,
    },
    waitlist: await loadPublicWaitlist(waitlistController),
  };
}

async function loadPublicWaitlist(
  waitlistController: WaitlistController,
): Promise<WaitlistSnapshot> {
  try {
    const response = await waitlistController.getSnapshot();

    return waitlistSnapshotSchema.parse(await response.json());
  } catch {
    const runtimeEnvironment = getRuntimeEnvironment();

    return {
      enabled: true,
      cap: runtimeEnvironment.WAITLIST_CAP,
      spotsRemaining: null,
    };
  }
}

export default function MarketingLayoutRoute() {
  const { botDetection, waitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";

  return (
    <PublicMarketingLayout scrollBehavior={scrollBehavior} waitlist={waitlist}>
      <Outlet context={{ botDetection, waitlist } satisfies MarketingOutletContext} />
    </PublicMarketingLayout>
  );
}
