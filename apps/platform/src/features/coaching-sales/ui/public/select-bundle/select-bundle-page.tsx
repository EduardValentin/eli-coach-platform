import { joinBasePath } from "@eli-coach-platform/config";
import { cn } from "@eli-coach-platform/ui/lib";
import { Button } from "@eli-coach-platform/ui/primitives";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  useLoaderData,
  useSearchParams,
  type HeadersArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { coachingBundleIdSchema } from "~/features/coaching-sales/contracts/bundle-cards";
import {
  startChoiceSchema,
  SUBSCRIPTION_NOTE,
  type BundlePage,
  type CheckoutChoice,
} from "~/features/coaching-sales/contracts/coaching-sales";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { BundleSelector } from "~/features/coaching-sales/ui/public/bundle-selector/bundle-selector";
import { CallFirstBanner } from "~/features/coaching-sales/ui/public/call-first-banner";

import { StartChoice } from "./start-choice";
import { CANCELLED_NOTICE, START_CHOICE_REQUIRED } from "./start-choice-copy";

const CHECKOUTS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  COACHING_SALES_API_PATHS.checkouts,
);

const TOKEN_PARAM = "token";
const PAYMENT_PARAM = "payment";

export async function loader(args: LoaderFunctionArgs) {
  return args.context.get(coachingSalesContext).checkouts.loadBundlePage(args);
}

export function headers({ loaderHeaders }: HeadersArgs) {
  return loaderHeaders;
}

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  const keepsTheLink =
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.searchParams.get(TOKEN_PARAM) ===
      nextUrl.searchParams.get(TOKEN_PARAM);

  return keepsTheLink ? false : defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [
  { title: "Choose Your Bundle | Evoa" },
  { name: "robots", content: "noindex" },
];

export const handle = { publicContentFrame: "full-bleed" } as const;

export default function SelectBundleRoute() {
  const page = useLoaderData<typeof loader>();
  const isValidLink = page.state === "valid";

  return (
    <div
      className="min-h-screen w-full bg-surface-page pb-24"
      data-parity-root="SelectBundle"
    >
      {isValidLink ? null : <CallFirstBanner heading="h2" />}
      <div
        className={cn("mx-auto max-w-7xl px-6", {
          "pt-32": isValidLink,
          "pt-16": !isValidLink,
        })}
      >
        <BundlePageHeader linkState={page.state} />
        <BundleCheckoutForm page={page} />
      </div>
    </div>
  );
}

function BundlePageHeader(props: { linkState: BundlePage["state"] }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <div className="mx-auto mb-16 max-w-3xl text-center">
      <h1
        className="mb-6 font-heading text-4xl font-medium tracking-tight text-text-primary md:text-5xl lg:text-6xl"
        ref={headingRef}
        tabIndex={-1}
      >
        Choose Your Bundle
      </h1>
      {props.linkState === "valid" ? (
        <p className="mb-8 text-lg text-copy-muted">
          Based on our call, select the commitment timeframe that works best for
          you.
        </p>
      ) : (
        <p className="mb-8 text-lg text-link-muted italic">
          These bundles are available for purchase exclusively after your call
          with Eli.
        </p>
      )}
      <CancelledPaymentNotice onDismissed={() => headingRef.current?.focus()} />
    </div>
  );
}

function CancelledPaymentNotice(props: { onDismissed: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isShown, setIsShown] = useState(
    searchParams.get(PAYMENT_PARAM) === "cancelled",
  );

  if (!isShown) {
    return null;
  }

  const dismiss = () => {
    setIsShown(false);
    props.onDismissed();
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(PAYMENT_PARAM);

        return next;
      },
      { preventScrollReset: true, replace: true },
    );
  };

  return (
    <div
      className="mx-auto flex max-w-xl items-start gap-3 rounded-control border border-border-subtle bg-surface-base px-4 py-3 text-left"
      data-parity="cancelled-notice"
      role="status"
    >
      <p className="flex-1 text-sm text-text-secondary">{CANCELLED_NOTICE}</p>
      <Button
        aria-label="Dismiss"
        className="-mt-1 -mr-2 h-8 w-8 px-0 text-text-secondary hover:bg-surface-quiet hover:text-text-primary"
        onClick={dismiss}
        variant="outline"
      >
        <X aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}

function BundleCheckoutForm(props: { page: BundlePage }) {
  const { page } = props;
  const [searchParams] = useSearchParams();
  const [bundleId, setBundleId] = useState<CheckoutChoice["bundleId"] | null>(
    () =>
      coachingBundleIdSchema.safeParse(searchParams.get("bundle")).data ??
      page.cards.find((card) => card.isPopular)?.id ??
      null,
  );
  const [startChoice, setStartChoice] = useState<
    CheckoutChoice["startChoice"] | null
  >(() => startChoiceSchema.safeParse(searchParams.get("start")).data ?? null);
  const [isStartChoiceMissing, setIsStartChoiceMissing] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const firstStartOption = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const resetAfterReturn = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsOpeningCheckout(false);
      }
    };

    window.addEventListener("pageshow", resetAfterReturn);

    return () => {
      window.removeEventListener("pageshow", resetAfterReturn);
    };
  }, []);

  const chooseStart = (chosen: CheckoutChoice["startChoice"]) => {
    setStartChoice(chosen);
    setIsStartChoiceMissing(false);
  };

  const openCheckout = (event: FormEvent<HTMLFormElement>) => {
    if (!startChoice) {
      event.preventDefault();
      setIsStartChoiceMissing(true);
      firstStartOption.current?.focus();

      return;
    }

    setIsOpeningCheckout(true);
  };

  const isValidLink = page.state === "valid";

  return (
    <div
      className={cn({
        "pointer-events-none opacity-50 grayscale-[0.5]": !isValidLink,
      })}
    >
      <form action={CHECKOUTS_API_URL} method="post" onSubmit={openCheckout}>
        <input
          name="token"
          type="hidden"
          value={searchParams.get(TOKEN_PARAM) ?? ""}
        />
        <input name="startChoice" type="hidden" value={startChoice ?? ""} />
        <BundleSelector
          beforeCheckout={
            isValidLink ? (
              <StartChoice
                error={isStartChoiceMissing ? START_CHOICE_REQUIRED : null}
                firstOptionRef={firstStartOption}
                onChange={chooseStart}
                value={startChoice}
                waitingStartsOn={page.waitingStartsOn}
              />
            ) : null
          }
          busy={isOpeningCheckout}
          cards={page.cards}
          disabled={!isValidLink}
          mode="checkout"
          note={SUBSCRIPTION_NOTE}
          onChooseBundle={setBundleId}
          pricing={isValidLink ? page.tier : "regular"}
          selectedBundleId={bundleId}
        />
      </form>
    </div>
  );
}
