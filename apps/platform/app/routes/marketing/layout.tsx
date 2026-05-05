import { joinBasePath, type RuntimeEnvironment } from "@eli-coach-platform/config";
import type { WaitlistSnapshot } from "@eli-coach-platform/contracts";
import { useEffect, useState } from "react";
import { Outlet, useLoaderData, useLocation } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { PublicMarketingLayout } from "./public-marketing-layout";
import { resolveWaitlistSnapshot, WAITLIST_API_PATH } from "./waitlist-client";

type MarketingLayoutLoaderData = {
  botDetection: BotDetectionConfig;
  waitlist: WaitlistSnapshot;
};

export type MarketingOutletContext = {
  botDetection: BotDetectionConfig;
  waitlist: WaitlistSnapshot;
};

export async function loader(): Promise<MarketingLayoutLoaderData> {
  const runtimeEnvironment = getRuntimeEnvironment();

  return {
    botDetection: {
      turnstileSiteKey: runtimeEnvironment.TURNSTILE_SITE_KEY,
    },
    waitlist: createStaticWaitlistShell(runtimeEnvironment),
  };
}

function createStaticWaitlistShell(runtimeEnvironment: RuntimeEnvironment): WaitlistSnapshot {
  return {
    enabled: true,
    cap: runtimeEnvironment.WAITLIST_CAP,
    spotsRemaining: null,
  };
}

export default function MarketingLayoutRoute() {
  const { botDetection, waitlist: initialWaitlist } = useLoaderData<typeof loader>();
  const [runtimeWaitlist, setRuntimeWaitlist] = useState<WaitlistSnapshot | null>(null);
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";
  const waitlist = runtimeWaitlist ?? initialWaitlist;

  useEffect(() => {
    const abortController = new AbortController();
    const waitlistApiUrl = new URL(
      joinBasePath(import.meta.env.BASE_URL, WAITLIST_API_PATH),
      window.location.href,
    );

    async function loadRuntimeWaitlist() {
      const response = await fetch(waitlistApiUrl, {
        headers: {
          Accept: "application/json",
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        return;
      }

      const snapshot = resolveWaitlistSnapshot(await response.json());

      if (snapshot) {
        setRuntimeWaitlist(snapshot);
      }
    }

    void loadRuntimeWaitlist().catch(() => {});

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <PublicMarketingLayout scrollBehavior={scrollBehavior} waitlist={waitlist}>
      <Outlet context={{ botDetection, waitlist } satisfies MarketingOutletContext} />
    </PublicMarketingLayout>
  );
}
