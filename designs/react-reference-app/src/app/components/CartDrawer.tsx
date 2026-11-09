import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Loader2, Mail, ShoppingBag, Trash2 } from 'lucide-react';
import { PAID_DIGITAL_DELIVERY_CONSENT } from '~/bounded-contexts/legal/public';

import { isPaid, useStore, type CartItem, type PaidProduct } from '../context/StoreContext';
import { useAppState } from '../context/AppContext';
import { storeOrderLines } from '../domain/storeOrder';
import { CheckboxField } from './CheckboxField';
import { DisabledActionHint } from './DisabledActionHint';
import { DismissibleNotice } from './DismissibleNotice';
import { FreeTag } from './FreeTag';
import { Price } from './Price';
import { InlineProblem } from './InlineProblem';
import { StoreOrderSummary } from './StoreOrderSummary';
import { Button } from './ThemeButton';
import { Alert } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Link, linkVariants } from './ui/link';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import { LABEL_CLASS } from './typography';
import {
  isValidAcquisitionEmail,
  StoreAcquisitionError,
  STORE_ACQUISITION_ERROR_MESSAGES,
  submitStoreAcquisition,
} from '../services/storeAcquisitionService';
import { placeStoreOrder, SUBADDRESS_REFUSED_MESSAGE } from '../services/storeOrderService';

const CONTACT_EMAIL = 'contact@evoa.fit';
const EMAIL_PROBLEM = 'Enter a valid email address.';
const TERMS_PROBLEM = 'Accept the Terms & Conditions to continue.';
const PAID_SUBMIT_HINT = 'Enter your email and tick both required boxes to continue.';
const CHECKOUT_UNAVAILABLE_PROBLEM =
  'Checkout is temporarily unavailable. Your cart and details are saved, so please try again shortly.';
const PAYMENT_NOT_COMPLETED_NOTICE = 'Payment not completed. Your cart is saved.';

type CheckoutStep = 'cart' | 'details' | 'success';

export function CartDrawer() {
  const {
    cart,
    removeFromCart,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    currency,
    formatPrice,
    cartTotal,
    cartNotice,
    dismissCartNotice,
  } = useStore();
  const { appState } = useAppState();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>('cart');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deliveryConsent, setDeliveryConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [emailProblem, setEmailProblem] = useState<string | null>(null);
  const [responseProblem, setResponseProblem] = useState<string | null>(null);

  const emailErrorId = useId();
  const responseErrorId = useId();
  const openerRef = useRef<HTMLElement | null>(null);

  const isPaidCheckout = cart.some((item) => isPaid(item.product));
  const canSubmit = !isSubmitting && email.trim().length > 0 && termsAccepted;
  const canContinueToPayment = email.trim().length > 0 && termsAccepted && deliveryConsent;
  const termsProblem = submitAttempted && !termsAccepted ? TERMS_PROBLEM : undefined;

  const closeDrawer = () => {
    setIsCartOpen(false);
    setStep('cart');
    setSubmitAttempted(false);
    setEmailProblem(null);
    setResponseProblem(null);
    dismissCartNotice();
  };

  const changeEmail = (next: string) => {
    setEmail(next);
    if (emailProblem && isValidAcquisitionEmail(next)) {
      setEmailProblem(null);
    }
  };

  const showDetails = () => {
    setResponseProblem(null);
    dismissCartNotice();
    setStep('details');
  };

  const deliver = async (submittedEmail: string) => {
    setResponseProblem(null);
    setIsSubmitting(true);
    try {
      await submitStoreAcquisition({
        email: submittedEmail,
        productIds: cart.map((item) => item.product.id),
        marketingConsent,
        outcome: appState.storeCheckoutOutcome,
      });
      setStep('success');
      setTermsAccepted(false);
      setMarketingConsent(false);
      setSubmitAttempted(false);
      clearCart();
    } catch (error) {
      if (!(error instanceof StoreAcquisitionError)) {
        setResponseProblem(STORE_ACQUISITION_ERROR_MESSAGES.SERVER_ERROR);
        return;
      }
      setResponseProblem(error.message);
      if (error.code === 'UNAVAILABLE_PRODUCT' && cart.length > 0) {
        removeFromCart(cart[cart.length - 1].product.id);
        setStep('cart');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueToPayment = async (submittedEmail: string) => {
    setResponseProblem(null);
    setIsSubmitting(true);
    const placed = await placeStoreOrder({
      email: submittedEmail,
      items: cart.map((item) => item.product),
      currency,
      termsAccepted: true,
      deliveryConsent: true,
      marketing: marketingConsent,
      outcome: appState.storePaidCheckoutOutcome,
    });
    setIsSubmitting(false);

    if (placed.status === 'opened') {
      closeDrawer();
      navigate(placed.checkoutUrl);
      return;
    }
    if (placed.status === 'subaddress_refused') {
      setEmailProblem(SUBADDRESS_REFUSED_MESSAGE);
      return;
    }
    if (placed.status === 'unavailable_products') {
      setResponseProblem(unavailableProductsProblem(cart, placed.availableProductIds));
      setStep('cart');
      return;
    }
    setResponseProblem(CHECKOUT_UNAVAILABLE_PROBLEM);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!isValidAcquisitionEmail(email)) {
      setEmailProblem(EMAIL_PROBLEM);
      return;
    }
    if (!termsAccepted || cart.length === 0) {
      return;
    }
    setEmailProblem(null);
    if (!isPaidCheckout) {
      deliver(email.trim());
      return;
    }
    if (deliveryConsent) {
      continueToPayment(email.trim());
    }
  };

  const paidSubmit = (
    <Button aria-busy={isSubmitting || undefined} disabled={isSubmitting} size="lg-tight" type="submit" width="full">
      <PaidSubmitLabel isSubmitting={isSubmitting} />
    </Button>
  );

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent
        className="p-0 sm:max-w-md"
        data-parity-root="CartDrawer"
        onOpenAutoFocus={() => {
          openerRef.current = document.activeElement as HTMLElement | null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const opener = openerRef.current;
          const focusTarget = opener?.isConnected ? opener : document.querySelector('main');
          focusTarget?.focus();
        }}
      >
        <div className="border-b border-border-subtle bg-surface-page px-6 py-6" data-parity="cart-header">
          <SheetTitle className="flex items-center gap-2 !text-display-sm leading-8">
            <ShoppingBag aria-hidden="true" className="text-brand" />
            Your cart
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review your cart and tell us which email to use.
          </SheetDescription>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6" data-parity="cart-body">
          {step === 'cart' && (
            <CartReview
              items={cart}
              formatPrice={formatPrice}
              total={cartTotal}
              onContinue={showDetails}
              onRemove={removeFromCart}
              responseError={responseProblem}
              notice={
                cartNotice === 'payment-not-completed' && (
                  <DismissibleNotice
                    className="mb-2"
                    data-parity="payment-not-completed-notice"
                    onDismiss={dismissCartNotice}
                  >
                    {PAYMENT_NOT_COMPLETED_NOTICE}
                  </DismissibleNotice>
                )
              }
            />
          )}
          {step === 'details' && (
            <form className="flex flex-1 flex-col" noValidate onSubmit={submit}>
              <div>
                <h2 className="font-serif text-display-sm leading-8 text-text-primary">Almost there</h2>
                <p className="mt-2 text-sm text-text-secondary" data-parity="details-intro">
                  {isPaidCheckout
                    ? 'Check your order, enter your email, then continue to payment.'
                    : "Enter your email and we'll send one private download link for everything in your cart."}
                </p>
                {isPaidCheckout && (
                  <div className="mt-6" data-parity="order-summary-block">
                    <h3 className={LABEL_CLASS}>Your order</h3>
                    <StoreOrderSummary
                      className="mt-2"
                      currency={currency}
                      lines={storeOrderLines(
                        cart.map((item) => item.product),
                        currency,
                      )}
                    />
                  </div>
                )}
                <div className="mt-7" data-parity="email-field">
                  <Label className="mb-2" htmlFor="store-acquisition-email" required>
                    Email address
                  </Label>
                  <Input
                    aria-describedby={emailProblem ? emailErrorId : undefined}
                    aria-invalid={emailProblem ? true : undefined}
                    autoComplete="email"
                    disabled={isSubmitting}
                    id="store-acquisition-email"
                    onChange={(event) => changeEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>
                {emailProblem && (
                  <InlineProblem className="mt-2" id={emailErrorId} role="alert">
                    {emailProblem}
                  </InlineProblem>
                )}
                <div className="mt-6 flex flex-col gap-4">
                  <CheckboxField
                    checkboxParity="terms-checkbox"
                    checked={termsAccepted}
                    data-parity="terms-consent"
                    disabled={isSubmitting}
                    error={termsProblem}
                    errorRole="alert"
                    label={
                      <>
                        I agree to the{' '}
                        <Link to="/terms" variant="in-text">
                          Terms &amp; Conditions
                        </Link>
                        .
                      </>
                    }
                    layout="statement"
                    onCheckedChange={setTermsAccepted}
                    required
                  />
                  {isPaidCheckout && (
                    <CheckboxField
                      checkboxParity="delivery-consent-checkbox"
                      checked={deliveryConsent}
                      data-parity="delivery-consent"
                      disabled={isSubmitting}
                      label={PAID_DIGITAL_DELIVERY_CONSENT.statement}
                      layout="statement"
                      onCheckedChange={setDeliveryConsent}
                      required
                    />
                  )}
                  <CheckboxField
                    checkboxParity="marketing-checkbox"
                    checked={marketingConsent}
                    data-parity="marketing-consent"
                    disabled={isSubmitting}
                    label="Keep me posted about new plans, guides, and offers."
                    layout="statement"
                    onCheckedChange={setMarketingConsent}
                  />
                  <p className="text-sm leading-relaxed text-text-secondary" data-parity="privacy-note">
                    {isPaidCheckout
                      ? 'We use your email to process your order and keep evidence of your purchase and choices.'
                      : 'We use your email to deliver these resources and keep evidence of this request.'}{' '}
                    Read our{' '}
                    <Link to="/privacy" variant="in-text">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
                {responseProblem && (
                  <div className="mt-5">
                    <Alert id={responseErrorId}>
                      <p>{responseProblem}</p>
                    </Alert>
                  </div>
                )}
              </div>
              <div className="mt-auto flex gap-4 border-t border-border-subtle pt-6" data-parity="details-actions">
                <Button disabled={isSubmitting} onClick={() => setStep('cart')} size="lg" variant="outline">
                  Back
                </Button>
                {isPaidCheckout && canContinueToPayment && paidSubmit}
                {isPaidCheckout && !canContinueToPayment && (
                  <DisabledActionHint reason={PAID_SUBMIT_HINT}>{paidSubmit}</DisabledActionHint>
                )}
                {!isPaidCheckout && (
                  <Button disabled={!canSubmit} size="lg-tight" type="submit" width="full">
                    <SubmitLabel isSubmitting={isSubmitting} />
                  </Button>
                )}
              </div>
            </form>
          )}
          {step === 'success' && <AcquisitionSuccess />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function unavailableProductsProblem(cart: CartItem[], availableProductIds: string[]): string {
  const availableTitles = cart
    .filter((item) => availableProductIds.includes(item.product.id))
    .map((item) => item.product.title);

  if (availableTitles.length === 0) {
    return 'The items in your cart are no longer available. Remove them to continue.';
  }

  return `Some items in your cart are no longer available. Still available: ${availableTitles.join(', ')}. Remove the rest to continue.`;
}

function SubmitLabel(props: { isSubmitting: boolean }) {
  if (props.isSubmitting) {
    return (
      <>
        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:hidden" size={18} />
        Sending…
      </>
    );
  }

  return 'Send my resources';
}

function PaidSubmitLabel(props: { isSubmitting: boolean }) {
  if (props.isSubmitting) {
    return (
      <>
        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:hidden" size={18} />
        Opening checkout…
      </>
    );
  }

  return 'Continue to payment';
}

function CartReview(props: {
  items: CartItem[];
  formatPrice: (product: PaidProduct) => string;
  total: string | null;
  onContinue: () => void;
  onRemove: (productId: string) => void;
  responseError: string | null;
  notice: ReactNode;
}) {
  if (props.items.length === 0) {
    return (
      <div className="m-auto text-center">
        <ShoppingBag aria-hidden="true" className="mx-auto mb-4 text-icon-muted" size={44} />
        <p className="font-serif text-display-sm text-text-primary">Your cart is empty</p>
        <p className="mt-2 text-sm text-text-secondary">Add a plan or a free resource from the store to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {props.notice}
      {props.responseError && (
        <Alert>
          <p>{props.responseError}</p>
        </Alert>
      )}
      <ul className="divide-y divide-border-subtle">
        {props.items.map((item) => (
          <li className="flex gap-4 py-4" data-parity="cart-item" key={item.product.id}>
            <img
              alt={`Cover of ${item.product.title}.`}
              className="h-24 w-20 rounded-field object-cover shadow-card"
              src={item.product.imageUrl}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <p
                className="font-serif text-base font-medium leading-tight text-text-primary"
                data-parity="cart-item-title"
              >
                {item.product.title}
              </p>
              {isPaid(item.product) ? (
                <Price className="mt-1" data-parity="cart-line-price" size="sm">
                  {props.formatPrice(item.product)}
                </Price>
              ) : (
                <FreeTag className="mt-1 self-start" data-parity="cart-item-type" size="sm" />
              )}
              <button
                aria-label={`Remove ${item.product.title} from cart`}
                className="ml-auto mt-auto inline-flex items-center justify-center p-1 text-text-secondary transition-colors hover:text-destructive"
                onClick={() => props.onRemove(item.product.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-auto border-t border-border-subtle pt-6" data-parity="cart-summary">
        {props.total && (
          <dl className="mb-6 flex items-baseline justify-between gap-4">
            <dt className={LABEL_CLASS}>Total</dt>
            <dd className="text-lg font-semibold text-text-primary" data-parity="cart-total">
              {props.total}
            </dd>
          </dl>
        )}
        <Button onClick={props.onContinue} size="lg" variant="inverted" width="full">
          Continue
        </Button>
      </div>
    </div>
  );
}

function AcquisitionSuccess() {
  return (
    <div className="m-auto text-center">
      <span
        className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
        data-parity="sent-icon"
      >
        <CheckCircle2 aria-hidden="true" size={32} />
      </span>
      <h2 className="font-serif text-display-md text-text-primary">Check your inbox</h2>
      <p className="mx-auto mt-3 max-w-sm text-text-secondary">
        Your resources are on their way. The private download link will stay active for seven days.
      </p>
      <p className="mt-5 text-sm text-text-secondary">
        Nothing there? Contact{' '}
        <a className={linkVariants({ variant: 'in-text' })} href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
      <Mail aria-hidden="true" className="mx-auto mt-8 text-brand" size={28} />
    </div>
  );
}
