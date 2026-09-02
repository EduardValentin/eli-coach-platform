import type { PropsWithChildren, ReactNode } from "react";

import type { PublicSessionState } from "~/features/accounts/contracts/account";
import { AuthNavActions } from "~/features/accounts/ui/public/auth-nav-actions";
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
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

type PublicLayoutProps = PropsWithChildren<{
  homepageFooterCta?: ReactNode;
  navigationActions?: ReactNode;
  scrollBehavior: PublicNavigationScrollBehavior;
  session: PublicSessionState;
  storePath: string;
  waitlist: Waitlist;
}>;

export function PublicLayout(props: PublicLayoutProps) {
  const {
    children,
    homepageFooterCta,
    navigationActions,
    scrollBehavior,
    session,
    storePath,
    waitlist,
  } = props;
  // A visitor sees no auth controls at all during the waitlist — not even a
  // Sign In — because there is nothing yet for them to sign into; the cart
  // stays because the free Store is live in both modes.
  const authControlsEnabled = !waitlist.enabled;

  return (
    <div className="flex min-h-screen flex-col bg-surface-page text-text-primary">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <PublicNavigation
        actions={
          authControlsEnabled ? (
            <AuthNavActions session={session} storePath={storePath}>
              {navigationActions}
            </AuthNavActions>
          ) : (
            navigationActions
          )
        }
        links={publicNavigationLinks}
        mobileActions={
          authControlsEnabled ? (
            <AuthNavActions placement="mobile-menu" session={session} storePath={storePath} />
          ) : undefined
        }
        scrollBehavior={scrollBehavior}
        variant={resolvePublicNavigationVariant(waitlist)}
      />
      <main
        aria-label="Public site content"
        className={cn(
          "min-w-0 flex-1",
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
