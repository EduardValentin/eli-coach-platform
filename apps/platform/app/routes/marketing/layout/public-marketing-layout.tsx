import type { PropsWithChildren, ReactNode } from "react";

import type { Waitlist } from "@eli-coach-platform/contracts";
import { cn } from "@eli-coach-platform/ui";

import {
  PublicNavigation,
  type PublicNavigationLink,
  type PublicNavigationVariant,
  type PublicNavigationScrollBehavior,
} from "./public-navigation";
import { PublicFooter } from "./public-footer";

const MAIN_CONTENT_ID = "main-content";

const publicNavigationLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/pricing", label: "Pricing" },
] as const satisfies readonly PublicNavigationLink[];

type PublicMarketingLayoutProps = PropsWithChildren<{
  homepageFooterCta?: ReactNode;
  scrollBehavior: PublicNavigationScrollBehavior;
  waitlist: Waitlist;
}>;

export function PublicMarketingLayout(props: PublicMarketingLayoutProps) {
  const { children, homepageFooterCta, scrollBehavior, waitlist } = props;

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <PublicNavigation
        links={publicNavigationLinks}
        scrollBehavior={scrollBehavior}
        variant={resolvePublicNavigationVariant(waitlist)}
      />
      <main
        aria-label="Public site content"
        className={cn(
          "min-w-0",
          {
            "mx-auto w-full max-w-stage px-6 pb-12 pt-28 lg:px-12":
              scrollBehavior === "solid",
          },
        )}
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
      >
        {children}
      </main>
      <PublicFooter>{homepageFooterCta}</PublicFooter>
    </div>
  );
}

function resolvePublicNavigationVariant(waitlist: Waitlist): PublicNavigationVariant {
  return waitlist.enabled ? "waitlist" : "normal";
}
