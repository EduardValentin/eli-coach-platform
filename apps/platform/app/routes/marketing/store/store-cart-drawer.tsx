import {
  ELI_COACH_CONTACT_EMAIL,
  STORE_MARKETING_CONSENT,
} from "@eli-coach-platform/content";
import {
  storeAcquisitionFormSchema,
  type StoreAcquisitionForm,
  type StoreAcquisitionResponse,
  type StoreProduct,
} from "@eli-coach-platform/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { type ReactNode, useEffect, useId, useMemo, useState } from "react";
import {
  Controller,
  type SubmitHandler,
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form";
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
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const acquisitionForm = useForm<StoreAcquisitionForm>({
    defaultValues: {
      email: "",
      marketingConsent: false,
      termsAccepted: false,
    },
    resolver: zodResolver(storeAcquisitionFormSchema),
  });
  const { clearErrors, getValues, reset } = acquisitionForm;
  const mutation = useStoreAcquisitionMutation();
  const { mutate } = mutation;
  const {
    botDetectionError,
    botDetectionIsReady,
    botDetectionWidget,
    isAwaitingChallenge,
    resetChallenge,
    submitFormData,
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
      reset({
        email: getValues("email"),
        marketingConsent: false,
        termsAccepted: false,
      });
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
  }, [
    clearCart,
    getValues,
    mutation.data,
    reconcileProducts,
    reset,
    resetChallenge,
  ]);

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      return;
    }

    closeCart();
    setStep("cart");
    clearErrors();
    mutation.reset();
  }

  const handleSubmit: SubmitHandler<StoreAcquisitionForm> = (values) => {
    mutation.reset();
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("idempotencyKey", idempotencyKey);
    formData.set("marketingConsent", String(values.marketingConsent));
    formData.set("productSlugs", JSON.stringify(productSlugs));
    formData.set("termsAccepted", String(values.termsAccepted));
    submitFormData(formData);
  };

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
              emailErrorId={emailErrorId}
              form={acquisitionForm}
              idempotencyKey={idempotencyKey}
              isSubmitting={isSubmitting}
              marketingId={marketingId}
              onBack={() => setStep("cart")}
              onSubmit={handleSubmit}
              productSlugs={productSlugs}
              responseError={responseError}
              responseErrorId={responseErrorId}
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
  emailErrorId: string;
  form: UseFormReturn<StoreAcquisitionForm>;
  idempotencyKey: string;
  isSubmitting: boolean;
  marketingId: string;
  onBack: () => void;
  onSubmit: SubmitHandler<StoreAcquisitionForm>;
  productSlugs: readonly string[];
  responseError: string | null;
  responseErrorId: string;
  termsId: string;
}) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = props.form;
  const marketingConsent = useWatch({
    control,
    name: "marketingConsent",
  });
  const termsAccepted = useWatch({ control, name: "termsAccepted" });

  return (
    <form
      action={STORE_ACQUISITIONS_API_URL}
      className="flex flex-1 flex-col"
      method="post"
      noValidate
      onSubmit={handleSubmit(props.onSubmit)}
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
              errors.email ? props.emailErrorId : undefined
            }
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            disabled={props.isSubmitting}
            id="store-acquisition-email"
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
              label="I agree to the "
              onBlur={field.onBlur}
              onCheckedChange={field.onChange}
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
          )}
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
        <input
          name="idempotencyKey"
          type="hidden"
          value={props.idempotencyKey}
        />
        <input
          name="marketingConsent"
          type="hidden"
          value={String(marketingConsent)}
        />
        <input
          name="productSlugs"
          type="hidden"
          value={JSON.stringify(props.productSlugs)}
        />
        <input
          name="termsAccepted"
          type="hidden"
          value={String(termsAccepted)}
        />
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
            !termsAccepted ||
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
      <div className="mt-6 flex items-start gap-1">
        <label
          className="flex size-control-md shrink-0 cursor-pointer items-center justify-center"
          htmlFor={props.id}
        >
          <Checkbox
            aria-describedby={
              props.errorMessage ? props.errorId : undefined
            }
            aria-invalid={props.errorMessage ? true : undefined}
            aria-label={props.accessibleLabel}
            checked={props.checked}
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
          className="ml-11 mt-2 text-body-sm text-feedback-danger"
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
