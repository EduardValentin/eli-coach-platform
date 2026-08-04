import {
  ELI_COACH_CONTACT_EMAIL,
  STORE_MARKETING_CONSENT,
} from "@eli-coach-platform/content";
import type {
  StoreAcquisitionResponse,
  StoreProduct,
} from "@eli-coach-platform/contracts";
import {
  Button,
  Checkbox,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@eli-coach-platform/ui";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router";

import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  type BotDetectionRuntimeState,
} from "~/modules/bot-detection/bot-detection-contract";
import { useBotDetectionSubmission } from "~/routes/marketing/waitlist/use-bot-detection-submission";

import { useStoreCart } from "./store-cart";
import {
  STORE_ACQUISITIONS_API_URL,
  useStoreAcquisitionMutation,
  useStoreCatalogQuery,
} from "./store-query";

type CartStep = "cart" | "details" | "success";

export function StoreCartButton() {
  const itemCount = useStoreCart((cart) => cart.productSlugs.length);
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);
  const setPersistentCartControl = useStoreCart(
    (cart) => cart.setPersistentCartControl,
  );

  return (
    <button
      aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
      className="relative inline-flex size-control-md items-center justify-center rounded-pill border border-current/20 text-current transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      onClick={(event) => openCartFrom(event.currentTarget)}
      ref={setPersistentCartControl}
      type="button"
    >
      <ShoppingBag aria-hidden="true" size={19} />
      {itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-pill bg-brand-primary text-label font-semibold text-brand-primary-foreground">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}

export function StoreCartDrawer(props: {
  botDetection: BotDetectionRuntimeState;
}) {
  const clearCart = useStoreCart((cart) => cart.clearCart);
  const closeCart = useStoreCart((cart) => cart.closeCart);
  const isOpen = useStoreCart((cart) => cart.isOpen);
  const productSlugs = useStoreCart((cart) => cart.productSlugs);
  const reconcileProducts = useStoreCart(
    (cart) => cart.reconcileProducts,
  );
  const restoreFocusToOpener = useStoreCart(
    (cart) => cart.restoreFocusToOpener,
  );
  const catalogQuery = useStoreCatalogQuery({ enabled: isOpen });
  const [step, setStep] = useState<CartStep>("cart");
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [clientError, setClientError] = useState<string | null>(null);
  const mutation = useStoreAcquisitionMutation();
  const { mutate } = mutation;
  const {
    botDetectionError,
    botDetectionIsReady,
    botDetectionWidget,
    isAwaitingChallenge,
    resetChallenge,
    submit,
  } = useBotDetectionSubmission({
    action: STORE_ACQUISITION_TURNSTILE_ACTION,
    botDetection: props.botDetection,
    onSubmitFormData: mutate,
  });
  const emailErrorId = useId();
  const responseErrorId = useId();
  const termsId = useId();
  const marketingId = useId();
  const isSubmitting = mutation.isPending || isAwaitingChallenge;
  const catalog = catalogQuery.data ?? [];
  const selectedProducts = useMemo(
    () =>
      productSlugs
        .map((slug) => catalog.find((product) => product.slug === slug))
        .filter((product): product is StoreProduct => Boolean(product)),
    [catalog, productSlugs],
  );
  const responseError =
    botDetectionError ?? resolveAcquisitionError(mutation.data);

  useEffect(() => {
    if (catalogQuery.data) {
      reconcileProducts(
        catalogQuery.data.map((product) => product.slug),
      );
    }
  }, [catalogQuery.data, reconcileProducts]);

  useEffect(() => {
    const response = mutation.data;

    if (!response) {
      return;
    }

    if (response.success) {
      clearCart();
      setIdempotencyKey(createIdempotencyKey());
      setMarketingConsent(false);
      setTermsAccepted(false);
      resetChallenge();
      setStep("success");
      return;
    }

    if (
      response.error.code === "unavailable_products" &&
      response.error.availableProductSlugs
    ) {
      reconcileProducts(response.error.availableProductSlugs);
      setStep("cart");
    }

    if (response.error.code !== "server_error") {
      setIdempotencyKey(createIdempotencyKey());
    }

    resetChallenge();
  }, [clearCart, mutation.data, reconcileProducts, resetChallenge]);

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      return;
    }

    closeCart();
    setStep("cart");
    setClientError(null);
    mutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!termsAccepted || !event.currentTarget.checkValidity()) {
      setClientError("Enter a valid email address.");
      return;
    }

    setClientError(null);
    mutation.reset();
    submit(event.currentTarget);
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetContent
        className="p-0"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocusToOpener();
        }}
      >
        <div className="border-b border-border-subtle bg-surface-subtle px-6 py-6">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag aria-hidden="true" className="text-brand-primary" />
            Your cart
          </SheetTitle>
          <SheetDescription>
            Review your free resources and tell us where to send them.
          </SheetDescription>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          {step === "cart" ? (
            <CartReview
              catalogFailed={catalogQuery.isError}
              catalogPending={catalogQuery.isPending}
              onContinue={() => {
                mutation.reset();
                setStep("details");
              }}
              products={selectedProducts}
              responseError={responseError}
            />
          ) : null}
          {step === "details" ? (
            <AcquisitionDetails
              botDetectionIsReady={botDetectionIsReady}
              botDetectionWidget={botDetectionWidget}
              clientError={clientError}
              email={email}
              emailErrorId={emailErrorId}
              idempotencyKey={idempotencyKey}
              isSubmitting={isSubmitting}
              marketingConsent={marketingConsent}
              marketingId={marketingId}
              onBack={() => setStep("cart")}
              onEmailChange={setEmail}
              onMarketingConsentChange={setMarketingConsent}
              onSubmit={handleSubmit}
              onTermsAcceptedChange={setTermsAccepted}
              productSlugs={productSlugs}
              responseError={responseError}
              responseErrorId={responseErrorId}
              termsAccepted={termsAccepted}
              termsId={termsId}
            />
          ) : null}
          {step === "success" ? <AcquisitionSuccess /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CartReview(props: {
  catalogFailed: boolean;
  catalogPending: boolean;
  onContinue: () => void;
  products: readonly StoreProduct[];
  responseError: string | null;
}) {
  if (props.catalogPending) {
    return (
      <div aria-busy="true" className="m-auto text-center text-text-secondary">
        Loading your cart…
      </div>
    );
  }

  if (props.catalogFailed) {
    return (
      <div className="m-auto text-center" role="alert">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto mb-4 text-feedback-danger"
        />
        <p className="font-medium text-text-primary">
          Your cart is temporarily unavailable.
        </p>
        <p className="mt-2 text-body-sm text-text-secondary">
          Close this panel and keep browsing, or try again in a moment.
        </p>
      </div>
    );
  }

  if (props.products.length === 0) {
    return (
      <div className="m-auto text-center">
        <ShoppingBag
          aria-hidden="true"
          className="mx-auto mb-4 text-text-muted"
          size={44}
        />
        <p className="font-heading text-display-sm text-text-primary">
          Your cart is empty
        </p>
        <p className="mt-2 text-body-sm text-text-secondary">
          Add a free resource from the store to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {props.responseError ? (
        <StoreAcquisitionError message={props.responseError} />
      ) : null}
      <ul className="divide-y divide-border-subtle">
        {props.products.map((product) => (
          <CartProduct key={product.slug} product={product} />
        ))}
      </ul>
      <div className="mt-auto border-t border-border-subtle pt-6">
        <Button
          className="w-full"
          onClick={props.onContinue}
          size="lg"
          type="button"
          variant="primary"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function CartProduct({ product }: { product: StoreProduct }) {
  const removeProduct = useStoreCart((cart) => cart.removeProduct);

  return (
    <li className="flex gap-4 py-4">
      <img
        alt={product.cover.alt}
        className="h-24 w-20 rounded-sm object-cover"
        src={product.cover.url}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-heading text-lg text-text-primary">
          {product.title}
        </p>
        <p className="mt-1 text-label uppercase text-brand-secondary">
          Free resource
        </p>
        <button
          aria-label={`Remove ${product.title} from cart`}
          className="-ml-2 mt-auto inline-flex min-h-11 w-fit items-center gap-1.5 px-2 text-body-sm text-text-secondary underline underline-offset-2 hover:text-feedback-danger"
          onClick={() => removeProduct(product.slug)}
          type="button"
        >
          <Trash2 aria-hidden="true" size={15} />
          Remove
        </button>
      </div>
    </li>
  );
}

function AcquisitionDetails(props: {
  botDetectionIsReady: boolean;
  botDetectionWidget: ReactNode;
  clientError: string | null;
  email: string;
  emailErrorId: string;
  idempotencyKey: string;
  isSubmitting: boolean;
  marketingConsent: boolean;
  marketingId: string;
  onBack: () => void;
  onEmailChange: (email: string) => void;
  onMarketingConsentChange: (checked: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTermsAcceptedChange: (checked: boolean) => void;
  productSlugs: readonly string[];
  responseError: string | null;
  responseErrorId: string;
  termsAccepted: boolean;
  termsId: string;
}) {
  return (
    <form
      action={STORE_ACQUISITIONS_API_URL}
      className="flex flex-1 flex-col"
      method="post"
      noValidate
      onSubmit={props.onSubmit}
    >
      <div>
        <h2 className="font-heading text-display-sm text-text-primary">
          Almost there
        </h2>
        <p className="mt-2 text-body-sm text-text-secondary">
          Enter your email and we&apos;ll send one private download link for
          everything in your cart.
        </p>
        <label className="mt-7 block" htmlFor="store-acquisition-email">
          <span className="mb-2 block text-body-sm font-medium">
            Email address
          </span>
          <Input
            aria-describedby={
              props.clientError ? props.emailErrorId : undefined
            }
            aria-invalid={props.clientError ? true : undefined}
            autoComplete="email"
            disabled={props.isSubmitting}
            id="store-acquisition-email"
            name="email"
            onChange={(event) => props.onEmailChange(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={props.email}
          />
        </label>
        {props.clientError ? (
          <p
            className="mt-2 text-body-sm text-feedback-danger"
            id={props.emailErrorId}
            role="alert"
          >
            {props.clientError}
          </p>
        ) : null}
        <ConsentRow
          accessibleLabel="I agree to the Terms & Conditions."
          checked={props.termsAccepted}
          disabled={props.isSubmitting}
          id={props.termsId}
          label="I agree to the "
          onCheckedChange={props.onTermsAcceptedChange}
          trailingContent={
            <>
              <Link
                className="-mx-1 inline-flex min-h-11 items-center px-1 underline underline-offset-2"
                reloadDocument
                to="/terms"
              >
                Terms &amp; Conditions
              </Link>
              .
            </>
          }
        />
        <p className="ml-8 mt-2 text-body-sm text-text-secondary">
          We use your email to deliver these resources and keep evidence of
          this request. Read our{" "}
          <Link
            className="-mx-1 inline-flex min-h-11 items-center px-1 underline underline-offset-2"
            reloadDocument
            to="/privacy"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <ConsentRow
          accessibleLabel={STORE_MARKETING_CONSENT}
          checked={props.marketingConsent}
          disabled={props.isSubmitting}
          id={props.marketingId}
          label={STORE_MARKETING_CONSENT}
          onCheckedChange={props.onMarketingConsentChange}
        />
        <input
          name="idempotencyKey"
          type="hidden"
          value={props.idempotencyKey}
        />
        <input
          name="marketingConsent"
          type="hidden"
          value={String(props.marketingConsent)}
        />
        <input
          name="productSlugs"
          type="hidden"
          value={JSON.stringify(props.productSlugs)}
        />
        <input name="termsAccepted" type="hidden" value="true" />
        <div className="absolute size-0 overflow-hidden">
          {props.botDetectionWidget}
        </div>
        {props.responseError ? (
          <div className="mt-5">
            <StoreAcquisitionError
              id={props.responseErrorId}
              message={props.responseError}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-auto grid gap-3 border-t border-border-subtle pt-6 sm:grid-cols-2">
        <Button
          disabled={props.isSubmitting}
          onClick={props.onBack}
          type="button"
          variant="secondary"
        >
          Back
        </Button>
        <Button
          disabled={
            !props.botDetectionIsReady ||
            !props.termsAccepted ||
            props.isSubmitting
          }
          type="submit"
          variant="primary"
        >
          {props.isSubmitting ? (
            <>
              <Loader2
                aria-hidden="true"
                className="animate-spin motion-reduce:hidden"
                size={18}
              />
              Sending…
            </>
          ) : (
            "Send my resources"
          )}
        </Button>
      </div>
    </form>
  );
}

function ConsentRow(props: {
  accessibleLabel: string;
  checked: boolean;
  disabled: boolean;
  id: string;
  label: ReactNode;
  onCheckedChange: (checked: boolean) => void;
  trailingContent?: ReactNode;
}) {
  return (
    <div className="mt-6 flex items-start gap-1">
      <label
        className="flex size-control-md shrink-0 cursor-pointer items-center justify-center"
        htmlFor={props.id}
      >
        <Checkbox
          aria-label={props.accessibleLabel}
          checked={props.checked}
          disabled={props.disabled}
          id={props.id}
          onCheckedChange={(checked) =>
            props.onCheckedChange(checked === true)
          }
        />
      </label>
      <span
        className="flex min-h-11 items-center text-body-sm leading-relaxed text-text-primary"
      >
        <label htmlFor={props.id}>{props.label}</label>
        {props.trailingContent}
      </span>
    </div>
  );
}

function StoreAcquisitionError(props: {
  id?: string;
  message: string;
}) {
  return (
    <div
      className="flex items-start gap-2 rounded-sm bg-feedback-danger-soft p-3 text-body-sm text-feedback-danger"
      id={props.id}
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
      <p>{props.message}</p>
    </div>
  );
}

function AcquisitionSuccess() {
  return (
    <div className="m-auto text-center">
      <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-pill bg-feedback-success-soft text-feedback-success">
        <CheckCircle2 aria-hidden="true" size={32} />
      </span>
      <h2 className="font-heading text-display-md text-text-primary">
        Check your inbox
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-text-secondary">
        Your resources are on their way. The private download link will stay
        active for seven days.
      </p>
      <p className="mt-5 text-body-sm text-text-secondary">
        Nothing there? Contact{" "}
        <a
          className="-mx-1 inline-flex min-h-11 items-center px-1 underline underline-offset-2"
          href={`mailto:${ELI_COACH_CONTACT_EMAIL}`}
        >
          {ELI_COACH_CONTACT_EMAIL}
        </a>
        .
      </p>
      <Mail
        aria-hidden="true"
        className="mx-auto mt-8 text-brand-primary"
        size={28}
      />
    </div>
  );
}

function resolveAcquisitionError(
  response: StoreAcquisitionResponse | undefined,
): string | null {
  if (!response || response.success) {
    return null;
  }

  const messages = {
    bot_verification_failed:
      "We couldn't verify this request. Please try again.",
    delivery_unavailable:
      "We couldn't send your resources right now. Your cart is saved, so please try again.",
    delivery_retryable:
      "We couldn't confirm whether your resources were sent. Please retry this request.",
    idempotency_conflict:
      "This request changed while it was being sent. Please try again.",
    invalid_request:
      "Please review your email and consent choices, then try again.",
    server_error:
      "We couldn't send your resources right now. Your cart is saved, so please try again.",
    unavailable_products:
      "One or more resources are no longer available. Your cart has been updated.",
  } satisfies Record<
    Exclude<StoreAcquisitionResponse, { success: true }>["error"]["code"],
    string
  >;

  return messages[response.error.code];
}

function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
