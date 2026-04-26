import type { PropsWithChildren } from "react";

import { publicNavigationLinks, type PublicLaunchMode } from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";

import { PublicNavigation, type PublicNavigationScrollBehavior } from "./public-navigation";

const MAIN_CONTENT_ID = "main-content";

type PublicMarketingLayoutProps = PropsWithChildren<{
  launchMode: PublicLaunchMode;
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
            ? "mx-auto w-full max-w-stage px-5 pb-8 pt-28 sm:px-6 lg:px-8"
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
