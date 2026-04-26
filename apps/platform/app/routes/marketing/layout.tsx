import {
  resolvePublicLaunchModeFromFeatureFlags,
  resolvePublicLaunchModePreviewOverride,
  type PublicLaunchMode,
} from "@eli-coach-platform/domain";
import { Outlet, useLoaderData, useLocation, type LoaderFunctionArgs } from "react-router";

import { getPlatformContainer } from "~/server/container.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { PublicMarketingLayout } from "./public-marketing-layout";

type MarketingLayoutLoaderData = {
  launchMode: PublicLaunchMode;
};

export async function loader(args: LoaderFunctionArgs): Promise<MarketingLayoutLoaderData> {
  return {
    launchMode: await loadPublicLaunchMode(args.request),
  };
}

async function loadPublicLaunchMode(request: Request): Promise<PublicLaunchMode> {
  const previewLaunchMode = resolvePublicLaunchModePreviewOverride({
    isEnabled: getRuntimeEnvironment().NODE_ENV !== "production",
    searchParams: new URL(request.url).searchParams,
  });

  if (previewLaunchMode) {
    return previewLaunchMode;
  }

  return resolvePublicLaunchModeFromFeatureFlags({
    readFeatureFlags: () => getPlatformContainer().featureFlagService.getFeatureFlags({}),
  });
}

export default function MarketingLayoutRoute() {
  const { launchMode } = useLoaderData<typeof loader>();
  const location = useLocation();
  const scrollBehavior = location.pathname === "/" ? "hero-overlay" : "solid";

  return (
    <PublicMarketingLayout launchMode={launchMode} scrollBehavior={scrollBehavior}>
      <Outlet />
    </PublicMarketingLayout>
  );
}
