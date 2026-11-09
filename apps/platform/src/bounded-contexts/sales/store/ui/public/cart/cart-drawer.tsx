import { ELI_COACH_CONTACT_EMAIL } from "~/shared/brand";
import { LABEL_CLASS } from "~/shared/design-system/lib";
import {
  PAID_DIGITAL_DELIVERY_CONSENT,
  STORE_MARKETING_CONSENT,
} from "~/bounded-contexts/legal/public";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/shared/design-system/overlays";
import {
  Alert,
  Button,
  CheckboxField,
  DisabledActionHint,
  DismissibleNotice,
  InlineProblem,
  Input,
  Label,
  Link,
  linkVariants,
} from "~/shared/design-system/primitives";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useId, type ReactNode } from "react";
import {
  Controller,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";

import {
  BotDetectionWidget,
  type BotDetectionConfig,
  type BotDetectionWidgetProps,
} from "~/shared/submission-checks/bot-detection";
import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";
import {
  formatStorePrice,
  storePriceAmount,
  type StoreCurrency,
} from "~/bounded-contexts/sales/store/public/store-currency";

import { selectStoreCartProducts, useReconcileStoreCartCatalog } from "./cart";
import { useStoreCart } from "./cart-provider";
import type { StoreCheckoutDetails } from "./cart-storage";
import { useStoreAcquisition } from "../acquisition/acquisition-form";
import { FreeTag } from "../pricing/free-tag";
import { Price } from "../pricing/price";
import { StoreOrderSummary } from "../pricing/store-order-summary";
import {
  STORE_ACQUISITIONS_API_URL,
  STORE_CHECKOUTS_API_URL,
  useStoreCatalogFetcher,
} from "../api-client";

const PAID_SUBMIT_HINT =
  "Enter your email and tick both required boxes to continue.";
const PAYMENT_NOT_COMPLETED_NOTICE =
  "Payment not completed. Your cart is saved.";

export function StoreCartButton() {
  const itemCount = useStoreCart((cart) => cart.productSlugs.length);
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);
  const setPersistentCartControl = useStoreCart(
    (cart) => cart.setPersistentCartControl,
  );

  if (itemCount === 0) {
    return null;
  }

  return (
    <button
      aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
      // The bare icon is only 20px, so the padding widens the pointer target to
      // 44px and the matching negative margin keeps the bar's spacing unchanged.
      className="-m-3 inline-flex p-3 text-current transition-colors hover:text-brand-primary"
      onClick={(event) => openCartFrom(event.currentTarget)}
      ref={setPersistentCartControl}
      type="button"
    >
      <span className="relative block">
        <ShoppingBag aria-hidden="true" size={20} />
        <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-primary text-micro font-semibold text-brand-primary-foreground">
          {itemCount}
        </span>
      </span>
    </button>
  );
}

export function StoreCartDrawer(props: { botDetection: BotDetectionConfig }) {
  const closeCart = useStoreCart((cart) => cart.closeCart);
  const currency = useStoreCart((cart) => cart.currency);
  const dismissNotice = useStoreCart((cart) => cart.dismissNotice);
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);
  const isOpen = useStoreCart((cart) => cart.isOpen);
  const notice = useStoreCart((cart) => cart.notice);
  const productSlugs = useStoreCart((cart) => cart.productSlugs);
  const reconcileProducts = useStoreCart((cart) => cart.reconcileProducts);
  const takeFocusRestoreTarget = useStoreCart(
    (cart) => cart.takeFocusRestoreTarget,
  );
  const catalogQuery = useStoreCatalogFetcher({ enabled: isOpen });
  const catalog = catalogQuery.data ?? [];
  const selectedProducts = selectStoreCartProducts(productSlugs, catalog);
  const acquisition = useStoreAcquisition({
    botDetection: props.botDetection,
    products: selectedProducts,
  });
  const emailErrorId = useId();
  const responseErrorId = useId();

  useReconcileStoreCartCatalog(
    catalogQuery.data,
    isCartHydrated,
    reconcileProducts,
  );

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      return;
    }

    closeCart();
    acquisition.resetAfterDrawerClose();
  }

  function showDetails() {
    dismissNotice();
    acquisition.showDetails();
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetContent
        className="p-0 sm:max-w-md"
        data-parity-root="CartDrawer"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          // Emptying the cart unmounts the cart control, so by the time the
          // drawer closes every opener can be gone. Fall back to the page's
          // main landmark rather than dropping focus on the document body.
          const focusTarget =
            takeFocusRestoreTarget() ?? document.querySelector("main");

          focusTarget?.focus();
        }}
      >
        <div
          className="border-b border-border-subtle bg-surface-page px-6 py-6"
          data-parity="cart-header"
        >
          <SheetTitle className="flex items-center gap-2 !text-display-sm leading-8">
            <ShoppingBag aria-hidden="true" className="text-brand-primary" />
            Your cart
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review your cart and tell us which email to use.
          </SheetDescription>
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6"
          data-parity="cart-body"
        >
          {acquisition.step === "cart" ? (
            <CartReview
              catalogFailed={catalogQuery.isError}
              catalogPending={catalogQuery.isPending}
              currency={currency}
              notice={
                notice === "payment-not-completed" ? (
                  <DismissibleNotice
                    className="mb-2"
                    data-parity="payment-not-completed-notice"
                    onDismiss={dismissNotice}
                  >
                    {PAYMENT_NOT_COMPLETED_NOTICE}
                  </DismissibleNotice>
                ) : null
              }
              onContinue={showDetails}
              products={selectedProducts}
              responseError={acquisition.responseError}
            />
          ) : null}
          {acquisition.step === "details" ? (
            <AcquisitionDetails
              botDetectionWidgetProps={acquisition.botDetectionWidgetProps}
              canContinueToPayment={acquisition.canContinueToPayment}
              canSubmit={acquisition.canSubmit}
              emailErrorId={emailErrorId}
              form={acquisition.form}
              isSubmitting={acquisition.isSubmitting}
              onBack={acquisition.showCart}
              onSubmit={acquisition.submit}
              order={
                acquisition.isPaidCheckout
                  ? { currency, products: selectedProducts }
                  : null
              }
              responseError={acquisition.responseError}
              responseErrorId={responseErrorId}
            />
          ) : null}
          {acquisition.step === "success" ? <AcquisitionSuccess /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CartReview(props: {
  catalogFailed: boolean;
  catalogPending: boolean;
  currency: StoreCurrency;
  notice: ReactNode;
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
        <p className="mt-2 text-sm text-text-secondary">
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
          className="mx-auto mb-4 text-icon-muted"
          size={44}
        />
        <p className="font-heading text-display-sm text-text-primary">
          Your cart is empty
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Add a plan or a free resource from the store to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {props.notice}
      {props.responseError ? (
        <StoreAcquisitionError message={props.responseError} />
      ) : null}
      <ul className="divide-y divide-border-subtle">
        {props.products.map((product) => (
          <CartProduct
            currency={props.currency}
            key={product.slug}
            product={product}
          />
        ))}
      </ul>
      <div
        className="mt-auto border-t border-border-subtle pt-6"
        data-parity="cart-summary"
      >
        <CartTotal currency={props.currency} products={props.products} />
        <Button
          onClick={props.onContinue}
          size="lg"
          variant="inverted"
          width="full"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function CartTotal(props: {
  currency: StoreCurrency;
  products: readonly StoreProduct[];
}) {
  const prices = props.products.flatMap((product) =>
    product.price ? [product.price] : [],
  );

  if (prices.length === 0) {
    return null;
  }

  const total = {
    eurCents: prices.reduce((sum, price) => sum + price.eurCents, 0),
    usdCents: prices.reduce((sum, price) => sum + price.usdCents, 0),
  };

  return (
    <dl className="mb-6 flex items-baseline justify-between gap-4">
      <dt className={LABEL_CLASS}>Total</dt>
      <dd
        className="text-lg font-semibold text-text-primary"
        data-parity="cart-total"
      >
        {formatStorePrice(total, props.currency)}
      </dd>
    </dl>
  );
}

function CartProduct(props: {
  currency: StoreCurrency;
  product: StoreProduct;
}) {
  const { product } = props;
  const removeProduct = useStoreCart((cart) => cart.removeProduct);

  return (
    <li className="flex gap-4 py-4" data-parity="cart-item">
      <img
        alt={product.cover.alt}
        className="h-24 w-20 rounded-field object-cover shadow-card"
        src={product.cover.url}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p
          className="font-heading text-base font-medium leading-tight text-text-primary"
          data-parity="cart-item-title"
        >
          {product.title}
        </p>
        {product.price ? (
          <Price className="mt-1" data-parity="cart-line-price" size="sm">
            {formatStorePrice(product.price, props.currency)}
          </Price>
        ) : (
          <FreeTag
            className="mt-1 self-start"
            data-parity="cart-item-type"
            size="sm"
          />
        )}
        <button
          aria-label={`Remove ${product.title} from cart`}
          className="ml-auto mt-auto inline-flex items-center justify-center p-1 text-text-secondary transition-colors hover:text-feedback-danger"
          onClick={() => removeProduct(product.slug)}
          type="button"
        >
          <Trash2 aria-hidden="true" size={18} />
        </button>
      </div>
    </li>
  );
}

type PaidOrder = {
  currency: StoreCurrency;
  products: readonly StoreProduct[];
};

function AcquisitionDetails(props: {
  botDetectionWidgetProps: BotDetectionWidgetProps;
  canContinueToPayment: boolean;
  canSubmit: boolean;
  emailErrorId: string;
  form: UseFormReturn<StoreCheckoutDetails>;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: SubmitHandler<StoreCheckoutDetails>;
  order: PaidOrder | null;
  responseError: string | null;
  responseErrorId: string;
}) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = props.form;

  return (
    <form
      action={
        props.order ? STORE_CHECKOUTS_API_URL : STORE_ACQUISITIONS_API_URL
      }
      className="flex flex-1 flex-col"
      method="post"
      noValidate
      onSubmit={handleSubmit(props.onSubmit)}
    >
      <div>
        <h2 className="font-heading text-display-sm leading-8 text-text-primary">
          Almost there
        </h2>
        <p
          className="mt-2 text-sm text-text-secondary"
          data-parity="details-intro"
        >
          {props.order
            ? "Check your order, enter your email, then continue to payment."
            : "Enter your email and we'll send one private download link for everything in your cart."}
        </p>
        {props.order ? <PaidOrderSummary order={props.order} /> : null}
        <div className="mt-7" data-parity="email-field">
          <Label className="mb-2" htmlFor="store-acquisition-email" required>
            Email address
          </Label>
          <Input
            aria-describedby={errors.email ? props.emailErrorId : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            disabled={props.isSubmitting}
            id="store-acquisition-email"
            placeholder="you@example.com"
            required
            type="email"
            {...register("email")}
          />
        </div>
        {errors.email ? (
          <InlineProblem className="mt-2" id={props.emailErrorId} role="alert">
            {errors.email.message}
          </InlineProblem>
        ) : null}
        <div className="mt-6 flex flex-col gap-4">
          <Controller
            control={control}
            name="termsAccepted"
            render={({ field, fieldState }) => (
              <CheckboxField
                checkboxRef={field.ref}
                checked={field.value}
                checkboxParity="terms-checkbox"
                data-parity="terms-consent"
                disabled={props.isSubmitting}
                error={fieldState.error?.message}
                errorRole="alert"
                label={
                  <>
                    I agree to the{" "}
                    <Link reloadDocument to="/terms" variant="in-text">
                      Terms &amp; Conditions
                    </Link>
                    .
                  </>
                }
                layout="statement"
                onBlur={field.onBlur}
                onCheckedChange={field.onChange}
                required
              />
            )}
          />
          {props.order ? (
            <Controller
              control={control}
              name="deliveryConsent"
              render={({ field }) => (
                <CheckboxField
                  checkboxRef={field.ref}
                  checked={field.value}
                  checkboxParity="delivery-consent-checkbox"
                  data-parity="delivery-consent"
                  disabled={props.isSubmitting}
                  label={PAID_DIGITAL_DELIVERY_CONSENT.statement}
                  layout="statement"
                  onBlur={field.onBlur}
                  onCheckedChange={field.onChange}
                  required
                />
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="marketingConsent"
            render={({ field }) => (
              <CheckboxField
                checkboxRef={field.ref}
                checked={field.value}
                checkboxParity="marketing-checkbox"
                data-parity="marketing-consent"
                disabled={props.isSubmitting}
                label={STORE_MARKETING_CONSENT}
                layout="statement"
                onBlur={field.onBlur}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <p
            className="text-sm leading-relaxed text-text-secondary"
            data-parity="privacy-note"
          >
            {props.order
              ? "We use your email to process your order and keep evidence of your purchase and choices."
              : "We use your email to deliver these resources and keep evidence of this request."}{" "}
            Read our{" "}
            <Link reloadDocument to="/privacy" variant="in-text">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="absolute size-0 overflow-hidden">
          <BotDetectionWidget {...props.botDetectionWidgetProps} />
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
      <div
        className="mt-auto flex gap-4 border-t border-border-subtle pt-6"
        data-parity="details-actions"
      >
        <Button
          disabled={props.isSubmitting}
          onClick={props.onBack}
          size="lg"
          variant="outline"
        >
          Back
        </Button>
        {props.order ? (
          <ContinueToPayment
            canContinue={props.canContinueToPayment}
            isSubmitting={props.isSubmitting}
          />
        ) : (
          <Button
            disabled={!props.canSubmit}
            size="lg-tight"
            type="submit"
            width="full"
          >
            <SubmitLabel isSubmitting={props.isSubmitting} />
          </Button>
        )}
      </div>
    </form>
  );
}

function PaidOrderSummary(props: { order: PaidOrder }) {
  const { currency, products } = props.order;

  return (
    <div className="mt-6" data-parity="order-summary-block">
      <h3 className={LABEL_CLASS}>Your order</h3>
      <StoreOrderSummary
        className="mt-2"
        currency={currency}
        lines={products.map((product) => ({
          amountMinorUnits: product.price
            ? storePriceAmount(product.price, currency)
            : null,
          title: product.title,
        }))}
      />
    </div>
  );
}

function ContinueToPayment(props: {
  canContinue: boolean;
  isSubmitting: boolean;
}) {
  const submit = (
    <Button
      aria-busy={props.isSubmitting || undefined}
      disabled={props.isSubmitting}
      size="lg-tight"
      type="submit"
      width="full"
    >
      {props.isSubmitting ? (
        <>
          <Loader2
            aria-hidden="true"
            className="animate-spin motion-reduce:hidden"
            size={18}
          />
          Opening checkout…
        </>
      ) : (
        "Continue to payment"
      )}
    </Button>
  );

  if (props.canContinue) {
    return submit;
  }

  return (
    <DisabledActionHint reason={PAID_SUBMIT_HINT}>{submit}</DisabledActionHint>
  );
}

function SubmitLabel(props: { isSubmitting: boolean }) {
  if (props.isSubmitting) {
    return (
      <>
        <Loader2
          aria-hidden="true"
          className="animate-spin motion-reduce:hidden"
          size={18}
        />
        Sending…
      </>
    );
  }

  return "Send my resources";
}

function StoreAcquisitionError(props: { id?: string; message: string }) {
  return (
    <Alert id={props.id}>
      <p>{props.message}</p>
    </Alert>
  );
}

function AcquisitionSuccess() {
  return (
    <div className="m-auto text-center">
      <span
        className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-feedback-success-soft text-feedback-success"
        data-parity="sent-icon"
      >
        <CheckCircle2 aria-hidden="true" size={32} />
      </span>
      <h2 className="font-heading text-display-md text-text-primary">
        Check your inbox
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-text-secondary">
        Your resources are on their way. The private download link will stay
        active for seven days.
      </p>
      <p className="mt-5 text-sm text-text-secondary">
        Nothing there? Contact{" "}
        <a
          className={linkVariants({ variant: "in-text" })}
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
