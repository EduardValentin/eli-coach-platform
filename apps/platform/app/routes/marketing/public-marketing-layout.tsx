import type { PropsWithChildren } from "react";

import type { Waitlist } from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";

import {
  PublicNavigation,
  type PublicNavigationLink,
  type PublicNavigationVariant,
  type PublicNavigationScrollBehavior,
} from "./public-navigation";

const MAIN_CONTENT_ID = "main-content";

const publicNavigationLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/pricing", label: "Pricing" },
] as const satisfies readonly PublicNavigationLink[];

type PublicMarketingLayoutProps = PropsWithChildren<{
  scrollBehavior: PublicNavigationScrollBehavior;
  waitlist: Waitlist;
}>;

export function PublicMarketingLayout(props: PublicMarketingLayoutProps) {
  const { children, scrollBehavior, waitlist } = props;

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
        className={cn(
          "min-w-0",
          {
            "mx-auto w-full max-w-stage px-4 pb-12 pt-28 sm:px-6 lg:px-12":
              scrollBehavior === "solid",
          },
        )}
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}

function resolvePublicNavigationVariant(waitlist: Waitlist): PublicNavigationVariant {
  return waitlist.enabled ? "waitlist" : "normal";
}
