import {
  ELI_COACH_CONTACT_EMAIL,
  STORE_MARKETING_CONSENT,
} from "@eli-coach-platform/content";
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
import { type ReactNode, useId } from "react";
import {
  Controller,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import { Link } from "react-router";

import {
  BotDetectionWidget,
  type BotDetectionRuntimeState,
  type BotDetectionWidgetProps,
} from "@eli-coach-platform/infrastructure/bot-detection";
import {
  type StoreAcquisitionForm,
  type StoreProduct,
} from "~/features/store/contracts/store";

import {
  selectStoreCartProducts,
  useReconcileStoreCartCatalog,
} from "./store-cart";
import { useStoreCart } from "./store-cart-provider";
import { useStoreAcquisition } from "./store-acquisition";
import {
  STORE_ACQUISITIONS_API_URL,
  useStoreCatalogFetcher,
} from "./store-api";

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
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);
  const isOpen = useStoreCart((cart) => cart.isOpen);
  const productSlugs = useStoreCart((cart) => cart.productSlugs);
  const reconcileProducts = useStoreCart(
    (cart) => cart.reconcileProducts,
  );
  const restoreFocusToOpener = useStoreCart(
    (cart) => cart.restoreFocusToOpener,
  );
  const catalogQuery = useStoreCatalogFetcher({ enabled: isOpen });
  const acquisition = useStoreAcquisition({
    botDetection: props.botDetection,
    clearCart,
    productSlugs,
    reconcileProducts,
  });
  const emailErrorId = useId();
  const responseErrorId = useId();
  const termsId = useId();
  const marketingId = useId();
  const catalog = catalogQuery.data ?? [];
  const selectedProducts = selectStoreCartProducts(productSlugs, catalog);

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

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetContent
        className="p-0 sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocusToOpener();
        }}
      >
        <div className="border-b border-border-subtle bg-surface-page px-6 py-6">
          <SheetTitle className="flex items-center gap-2 !text-display-sm leading-8">
            <ShoppingBag aria-hidden="true" className="text-brand-primary" />
            Your cart
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review your free resources and tell us where to send them.
          </SheetDescription>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          {acquisition.step === "cart" ? (
            <CartReview
              catalogFailed={catalogQuery.isError}
              catalogPending={catalogQuery.isPending}
              onContinue={acquisition.showDetails}
              products={selectedProducts}
              responseError={acquisition.responseError}
            />
          ) : null}
          {acquisition.step === "details" ? (
            <AcquisitionDetails
              botDetectionIsReady={acquisition.botDetectionIsReady}
              botDetectionWidgetProps={
                acquisition.botDetectionWidgetProps
              }
              emailErrorId={emailErrorId}
              form={acquisition.form}
              isSubmitting={acquisition.isSubmitting}
              marketingId={marketingId}
              onBack={acquisition.showCart}
              onSubmit={acquisition.submit}
              responseError={acquisition.responseError}
              responseErrorId={responseErrorId}
              termsId={termsId}
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
          className="min-h-14 w-full !rounded-control border-0 bg-surface-inverted py-4 !text-text-inverted shadow-none hover:bg-brand-primary"
          onClick={props.onContinue}
          size="md"
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
        className="h-24 w-20 rounded-lg object-cover shadow-public-nav"
        src={product.cover.url}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-heading text-body-base font-medium leading-tight text-text-primary">
          {product.title}
        </p>
        <p className="mt-1 text-label uppercase text-brand-secondary">
          Free resource
        </p>
        <button
          aria-label={`Remove ${product.title} from cart`}
          className="ml-auto mt-auto inline-flex items-center justify-center p-1 text-text-secondary transition-colors hover:text-feedback-danger focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
          onClick={() => removeProduct(product.slug)}
          type="button"
        >
          <Trash2 aria-hidden="true" size={18} />
        </button>
      </div>
    </li>
  );
}

function AcquisitionDetails(props: {
  botDetectionIsReady: boolean;
  botDetectionWidgetProps: BotDetectionWidgetProps | null;
  emailErrorId: string;
  form: UseFormReturn<StoreAcquisitionForm>;
  isSubmitting: boolean;
  marketingId: string;
  onBack: () => void;
  onSubmit: SubmitHandler<StoreAcquisitionForm>;
  responseError: string | null;
  responseErrorId: string;
  termsId: string;
}) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    watch,
  } = props.form;
  const email = watch("email");
  const termsAccepted = watch("termsAccepted");

  return (
    <form
      action={STORE_ACQUISITIONS_API_URL}
      className="flex flex-1 flex-col"
      method="post"
      noValidate
      onSubmit={handleSubmit(props.onSubmit)}
    >
      <div>
        <h2 className="font-heading text-display-sm leading-8 text-text-primary">
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
              errors.email ? props.emailErrorId : undefined
            }
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            disabled={props.isSubmitting}
            id="store-acquisition-email"
            className="rounded-lg px-4 py-3 shadow-none"
            placeholder="you@example.com"
            required
            type="email"
            {...register("email")}
          />
        </label>
        {errors.email ? (
          <p
            className="mt-2 text-body-sm text-feedback-danger"
            id={props.emailErrorId}
            role="alert"
          >
            {errors.email.message}
          </p>
        ) : null}
        <Controller
          control={control}
          name="termsAccepted"
          render={({ field, fieldState }) => (
            <ConsentRow
              accessibleLabel="I agree to the Terms & Conditions."
              checked={field.value}
              disabled={props.isSubmitting}
              errorId={`${props.termsId}-error`}
              errorMessage={fieldState.error?.message}
              id={props.termsId}
              inputRef={field.ref}
              label="I agree to the"
              onBlur={field.onBlur}
              onCheckedChange={field.onChange}
              trailingContent={
                <>
                  <Link
                    className="-my-3 ml-0 inline-flex min-h-11 items-center px-1 text-brand-primary hover:underline"
                    reloadDocument
                    to="/terms"
                  >
                    Terms &amp; Conditions
                  </Link>
                  .
                </>
              }
            />
          )}
        />
        <Controller
          control={control}
          name="marketingConsent"
          render={({ field }) => (
            <ConsentRow
              accessibleLabel={STORE_MARKETING_CONSENT}
              checked={field.value}
              disabled={props.isSubmitting}
              id={props.marketingId}
              inputRef={field.ref}
              label={STORE_MARKETING_CONSENT}
              onBlur={field.onBlur}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <p className="mt-4 text-body-sm leading-relaxed text-text-secondary">
          We use your email to deliver these resources and keep evidence of
          this request. Read our{" "}
          <Link
            className="-my-3 -mx-1 inline-flex min-h-11 items-center px-1 text-brand-primary hover:underline"
            reloadDocument
            to="/privacy"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="absolute size-0 overflow-hidden">
          {props.botDetectionWidgetProps ? (
            <BotDetectionWidget {...props.botDetectionWidgetProps} />
          ) : null}
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
      <div className="mt-auto flex gap-4 border-t border-border-subtle pt-6">
        <Button
          className="min-h-14 !rounded-control border-control-border-soft bg-transparent px-6 py-4 shadow-none"
          disabled={props.isSubmitting}
          onClick={props.onBack}
          size="md"
          type="button"
          variant="ghost"
        >
          Back
        </Button>
        <Button
          className="min-h-14 flex-1 !rounded-control border-0 px-0 py-4 !text-text-inverted shadow-none disabled:!bg-brand-primary disabled:!text-text-inverted disabled:opacity-50"
          disabled={
            !props.botDetectionIsReady ||
            props.isSubmitting ||
            email.trim().length === 0 ||
            !termsAccepted
          }
          size="md"
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
  errorId?: string;
  errorMessage?: string;
  id: string;
  inputRef: (instance: HTMLButtonElement | null) => void;
  label: ReactNode;
  onBlur: () => void;
  onCheckedChange: (checked: boolean) => void;
  trailingContent?: ReactNode;
}) {
  return (
    <>
      <div className="mt-6 flex items-start gap-3">
        <label
          className="flex min-h-11 shrink-0 cursor-pointer items-start pt-0.5"
          htmlFor={props.id}
        >
          <Checkbox
            aria-describedby={
              props.errorMessage ? props.errorId : undefined
            }
            aria-invalid={props.errorMessage ? true : undefined}
            aria-label={props.accessibleLabel}
            checked={props.checked}
            className="size-4 rounded-xs shadow-none"
            disabled={props.disabled}
            id={props.id}
            onBlur={props.onBlur}
            onCheckedChange={(checked) =>
              props.onCheckedChange(checked === true)
            }
            ref={props.inputRef}
          />
        </label>
        <span className="flex min-h-11 items-center text-body-sm leading-relaxed text-text-primary">
          <label htmlFor={props.id}>{props.label}</label>
          {props.trailingContent}
        </span>
      </div>
      {props.errorMessage ? (
        <p
          className="ml-7 mt-2 text-body-sm text-feedback-danger"
          id={props.errorId}
          role="alert"
        >
          {props.errorMessage}
        </p>
      ) : null}
    </>
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
