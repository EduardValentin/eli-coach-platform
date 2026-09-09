import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import {
  Outlet,
  type ShouldRevalidateFunctionArgs,
  useLoaderData,
  useLocation,
} from "react-router";

import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";

import { PublicFooterCta } from "~/surfaces/public-site/sections/footer-cta/footer-cta";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "~/features/store/ui/public/cart-drawer";
import { StoreCartProvider } from "~/features/store/ui/public/cart-provider";

import { PublicLayout } from "./public-layout";
import { loader } from "./layout.server";

export { loader };

// Shared page settings that no query parameter changes: a filter click must not
// re-fetch the shell, or the URL would wait on it. A submission is declined too,
// because availability is bucketed on the server (Business Rule 11) and must not
// appear to refresh after a signup. Anything else is an explicit revalidate().
export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  formMethod,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod) {
    return false;
  }

  const changesOnlyTheQuery =
    currentUrl.href !== nextUrl.href &&
    currentUrl.pathname === nextUrl.pathname;

  return changesOnlyTheQuery ? false : defaultShouldRevalidate;
}

export type PublicOutletContext = {
  botDetection: BotDetectionConfig;
  waitlist: Waitlist;
};

export default function PublicLayoutRoute() {
  const { botDetection, session, storePath, waitlist } =
    useLoaderData<typeof loader>();
  const location = useLocation();
  const isHomepage = location.pathname === "/";
  const scrollBehavior = isHomepage ? "hero-overlay" : "solid";
  const homepageFooterCta =
    isHomepage ? (
      <PublicFooterCta botDetection={botDetection} waitlist={waitlist} />
    ) : undefined;

  return (
    <StoreCartProvider>
      <PublicLayout
        homepageFooterCta={homepageFooterCta}
        navigationActions={<StoreCartButton />}
        scrollBehavior={scrollBehavior}
        session={session}
        storePath={storePath}
        waitlist={waitlist}
      >
        <Outlet context={{ botDetection, waitlist } satisfies PublicOutletContext} />
      </PublicLayout>
      <StoreCartDrawer botDetection={botDetection} />
    </StoreCartProvider>
  );
}
