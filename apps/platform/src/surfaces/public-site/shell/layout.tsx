import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import {
  Outlet,
  type ShouldRevalidateFunctionArgs,
  useLoaderData,
  useLocation,
} from "react-router";

import {
  useBotDetectionConfigQuery,
  type BotDetectionRuntimeState,
} from "@eli-coach-platform/infrastructure/bot-detection";

import { PublicFooterCta } from "~/surfaces/public-site/sections/footer-cta/footer-cta";
import type { WaitlistAvailabilityPresentationState } from "~/features/waitlist/ui/public/availability-status";
import { useWaitlistQuery } from "~/features/waitlist/ui/public/query";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "~/features/store/ui/public/cart-drawer";
import { StoreCartProvider } from "~/features/store/ui/public/cart-provider";

import { PublicLayout } from "./public-layout";
import { loader } from "./layout.server";
import {
  resolveBotDetectionRuntimeState,
  resolveWaitlistAvailabilityPresentationState,
} from "./layout-state";

export { loader };

// This loader answers for settings shared across the public pages, which no
// query parameter can change — those belong to a page's own filtering. Without
// this, a filter choice would re-fetch the shell and the framework would hold
// the new URL until that answer arrived. An unchanged URL means something
// asked for fresh data outright, which is not ours to refuse.
export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  const changesOnlyTheQuery =
    currentUrl.href !== nextUrl.href &&
    currentUrl.pathname === nextUrl.pathname;

  return changesOnlyTheQuery ? false : defaultShouldRevalidate;
}

export type PublicOutletContext = {
  botDetection: BotDetectionRuntimeState;
  waitlist: Waitlist;
  waitlistAvailabilityPresentationState: WaitlistAvailabilityPresentationState;
};

export default function PublicLayoutRoute() {
  const { waitlist: initialWaitlist } = useLoaderData<typeof loader>();
  const location = useLocation();
  const isHomepage = location.pathname === "/";
  const scrollBehavior = isHomepage ? "hero-overlay" : "solid";
  const botDetectionQuery = useBotDetectionConfigQuery();
  const botDetection = resolveBotDetectionRuntimeState(botDetectionQuery);
  const waitlistQuery = useWaitlistQuery({
    initialWaitlist: initialWaitlist,
  });
  const waitlist = waitlistQuery.data;
  const waitlistAvailabilityPresentationState =
    resolveWaitlistAvailabilityPresentationState({
      hasFetchedRuntimeData: waitlistQuery.isFetchedAfterMount,
      waitlist,
    });
  const homepageFooterCta =
    isHomepage ? (
      <PublicFooterCta
        botDetection={botDetection}
        waitlist={waitlist}
        waitlistAvailabilityPresentationState={waitlistAvailabilityPresentationState}
      />
    ) : undefined;

  return (
    <StoreCartProvider>
      <PublicLayout
        homepageFooterCta={homepageFooterCta}
        navigationActions={<StoreCartButton />}
        scrollBehavior={scrollBehavior}
        waitlist={waitlist}
      >
        <Outlet
          context={{
            botDetection,
            waitlist,
            waitlistAvailabilityPresentationState,
          } satisfies PublicOutletContext}
        />
      </PublicLayout>
      <StoreCartDrawer botDetection={botDetection} />
    </StoreCartProvider>
  );
}
