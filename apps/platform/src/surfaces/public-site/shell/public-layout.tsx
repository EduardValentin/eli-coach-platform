import type { PropsWithChildren, ReactNode } from "react";

import type { PublicSessionState } from "~/features/accounts/contracts/account";
import { AuthNavActions } from "~/features/accounts/ui/public/auth-nav-actions";
import { STORE_PATH } from "~/features/store/contracts/paths";
import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { cn, MAIN_CONTENT_ID } from "@eli-coach-platform/ui/lib";
import { PRICING_PATH } from "~/surfaces/public-site/paths";

import {
  PublicNavigation,
  type PublicNavigationLink,
  type PublicNavigationVariant,
  type PublicNavigationScrollBehavior,
} from "./public-navigation";
import { PublicFooter } from "./public-footer";

const publicNavigationLinks = [
  { href: "/", label: "Home" },
  { href: STORE_PATH, label: "Store" },
  { href: PRICING_PATH, label: "Pricing" },
] as const satisfies readonly PublicNavigationLink[];

export type PublicContentFrame = "padded" | "full-bleed";

type PublicLayoutProps = PropsWithChildren<{
  contentFrame: PublicContentFrame;
  homepageFooterCta?: ReactNode;
  navigationActions?: ReactNode;
  scrollBehavior: PublicNavigationScrollBehavior;
  session: PublicSessionState;
  storePath: string;
  waitlist: WaitlistPresentation;
}>;

export function PublicLayout(props: PublicLayoutProps) {
  const {
    children,
    contentFrame,
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
  const authControlsEnabled = waitlist.showsAuthControls;

  return (
    <div
      className={cn("flex min-h-screen flex-col text-text-primary", {
        "bg-surface-page": scrollBehavior === "solid",
        "bg-surface-subtle": scrollBehavior === "hero-overlay",
      })}
    >
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
            <AuthNavActions
              placement="mobile-menu"
              session={session}
              storePath={storePath}
            />
          ) : undefined
        }
        scrollBehavior={scrollBehavior}
        variant={resolvePublicNavigationVariant(waitlist)}
      />
      <main
        aria-label="Public site content"
        className={cn("min-h-screen min-w-0 flex-1", {
          "mx-auto w-full max-w-stage px-6 pb-12 pt-28 lg:px-12":
            scrollBehavior === "solid" && contentFrame === "padded",
        })}
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
      >
        {children}
      </main>
      <PublicFooter>{homepageFooterCta}</PublicFooter>
    </div>
  );
}

function resolvePublicNavigationVariant(
  waitlist: WaitlistPresentation,
): PublicNavigationVariant {
  return waitlist.mode === "disabled" ? "normal" : "waitlist";
}
