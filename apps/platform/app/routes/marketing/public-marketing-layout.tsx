import type { PropsWithChildren } from "react";

import type { WaitingListLaunchMode } from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";

import {
  PublicNavigation,
  type PublicNavigationLink,
  type PublicNavigationScrollBehavior,
} from "./public-navigation";

const MAIN_CONTENT_ID = "main-content";

const publicNavigationLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/pricing", label: "Pricing" },
] as const satisfies readonly PublicNavigationLink[];

type PublicMarketingLayoutProps = PropsWithChildren<{
  launchMode: WaitingListLaunchMode;
  scrollBehavior: PublicNavigationScrollBehavior;
}>;

export function PublicMarketingLayout(props: PublicMarketingLayoutProps) {
  const { children, launchMode, scrollBehavior } = props;

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <PublicNavigation
        links={publicNavigationLinks}
        scrollBehavior={scrollBehavior}
        variant={launchMode}
      />
      <main
        className={cn(
          "min-w-0",
          scrollBehavior === "solid"
            ? "mx-auto w-full max-w-stage px-4 pb-12 pt-28 sm:px-6 lg:px-12"
            : "",
        )}
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
