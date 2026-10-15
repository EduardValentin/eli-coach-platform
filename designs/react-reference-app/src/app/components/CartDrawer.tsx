import { useId, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Mail, ShoppingBag, Trash2 } from 'lucide-react';

import { useStore, type CartItem } from '../context/StoreContext';
import { useAppState } from '../context/AppContext';
import { CheckboxField } from './CheckboxField';
import { InlineProblem } from './InlineProblem';
import { Button } from './ThemeButton';
import { Alert } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Link, linkVariants } from './ui/link';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import {
  isValidAcquisitionEmail,
  StoreAcquisitionError,
  STORE_ACQUISITION_ERROR_MESSAGES,
  submitStoreAcquisition,
} from '../services/storeAcquisitionService';

const CONTACT_EMAIL = 'contact@evoa.fit';
const EMAIL_PROBLEM = 'Enter a valid email address.';
const TERMS_PROBLEM = 'Accept the Terms & Conditions to continue.';

type CheckoutStep = 'cart' | 'details' | 'success';

export function CartDrawer() {
  const { cart, removeFromCart, clearCart, isCartOpen, setIsCartOpen, formatPrice } = useStore();
  const { appState } = useAppState();

  const [step, setStep] = useState<CheckoutStep>('cart');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [emailProblem, setEmailProblem] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<StoreAcquisitionError | null>(null);
  const [orderVariant, setOrderVariant] = useState<'free' | 'paid'>('free');

  const emailErrorId = useId();
  const responseErrorId = useId();
  const openerRef = useRef<HTMLElement | null>(null);

  const hasPaidProduct = cart.some((item) => item.product.priceUSD > 0);
  const canSubmit = !isSubmitting && email.trim().length > 0 && termsAccepted;
  const termsProblem = submitAttempted && !termsAccepted ? TERMS_PROBLEM : undefined;

  const closeDrawer = () => {
    setIsCartOpen(false);
    setStep('cart');
    setSubmitAttempted(false);
    setEmailProblem(null);
    setServiceError(null);
  };

  const changeEmail = (next: string) => {
    setEmail(next);
    if (emailProblem && isValidAcquisitionEmail(next)) {
      setEmailProblem(null);
    }
  };

  const showDetails = () => {
    setServiceError(null);
    setStep('details');
  };

  const deliver = async (submittedEmail: string) => {
    setServiceError(null);
    setIsSubmitting(true);
    const variant = hasPaidProduct ? 'paid' : 'free';
    try {
      await submitStoreAcquisition({
        email: submittedEmail,
        productIds: cart.map((item) => item.product.id),
        marketingConsent,
        outcome: appState.storeCheckoutOutcome,
      });
      setOrderVariant(variant);
      setStep('success');
      setTermsAccepted(false);
      setMarketingConsent(false);
      setSubmitAttempted(false);
      clearCart();
    } catch (error) {
      if (!(error instanceof StoreAcquisitionError)) {
        setServiceError(
          new StoreAcquisitionError('SERVER_ERROR', STORE_ACQUISITION_ERROR_MESSAGES.SERVER_ERROR),
        );
        return;
      }
      setServiceError(error);
      if (error.code === 'UNAVAILABLE_PRODUCT' && cart.length > 0) {
        removeFromCart(cart[cart.length - 1].product.id);
        setStep('cart');
      }
    } finally {
      setIsSubmitting(false);
    }
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
    deliver(email.trim());
  };

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
            Review your free resources and tell us where to send them.
          </SheetDescription>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6" data-parity="cart-body">
          {step === 'cart' && (
            <CartReview
              items={cart}
              formatPrice={formatPrice}
              onContinue={showDetails}
              onRemove={removeFromCart}
              responseError={serviceError?.message ?? null}
            />
          )}
          {step === 'details' && (
            <form className="flex flex-1 flex-col" noValidate onSubmit={submit}>
              <div>
                <h2 className="font-serif text-display-sm leading-8 text-text-primary">Almost there</h2>
                <p className="mt-2 text-sm text-text-secondary" data-parity="details-intro">
                  Enter your email and we&apos;ll send one private download link for everything in your cart.
                </p>
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
                  <CheckboxField
                    checked={marketingConsent}
                    data-parity="marketing-consent"
                    disabled={isSubmitting}
                    label="Keep me posted about new plans, guides, and offers."
                    layout="statement"
                    onCheckedChange={setMarketingConsent}
                  />
                  <p className="text-sm leading-relaxed text-text-secondary" data-parity="privacy-note">
                    We use your email to deliver these resources and keep evidence of this request. Read our{' '}
                    <Link to="/privacy" variant="in-text">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
                {serviceError && (
                  <div className="mt-5">
                    <Alert id={responseErrorId}>
                      <p>{serviceError.message}</p>
                    </Alert>
                  </div>
                )}
              </div>
              <div className="mt-auto flex gap-4 border-t border-border-subtle pt-6" data-parity="details-actions">
                <Button disabled={isSubmitting} onClick={() => setStep('cart')} size="lg" variant="outline">
                  Back
                </Button>
                <Button disabled={!canSubmit} size="lg-tight" type="submit" width="full">
                  <SubmitLabel hasPaidProduct={hasPaidProduct} isSubmitting={isSubmitting} />
                </Button>
              </div>
            </form>
          )}
          {step === 'success' && <AcquisitionSuccess variant={orderVariant} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubmitLabel(props: { hasPaidProduct: boolean; isSubmitting: boolean }) {
  if (props.isSubmitting) {
    return (
      <>
        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:hidden" size={18} />
        Sending…
      </>
    );
  }

  return props.hasPaidProduct ? 'Complete order' : 'Send my resources';
}

function CartReview(props: {
  items: CartItem[];
  formatPrice: (priceUSD: number) => string;
  onContinue: () => void;
  onRemove: (productId: string) => void;
  responseError: string | null;
}) {
  if (props.items.length === 0) {
    return (
      <div className="m-auto text-center">
        <ShoppingBag aria-hidden="true" className="mx-auto mb-4 text-icon-muted" size={44} />
        <p className="font-serif text-display-sm text-text-primary">Your cart is empty</p>
        <p className="mt-2 text-sm text-text-secondary">Add a free resource from the store to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
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
              <p className="mt-1 text-label uppercase text-brand-secondary" data-parity="cart-item-type">
                {item.product.priceUSD === 0 ? 'Free resource' : props.formatPrice(item.product.priceUSD)}
              </p>
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
        <Button onClick={props.onContinue} size="lg" variant="inverted" width="full">
          Continue
        </Button>
      </div>
    </div>
  );
}

function AcquisitionSuccess({ variant }: { variant: 'free' | 'paid' }) {
  return (
    <div className="m-auto text-center">
      <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 aria-hidden="true" size={32} />
      </span>
      <h2 className="font-serif text-display-md text-text-primary">
        {variant === 'free' ? 'Check your inbox' : 'Order complete'}
      </h2>
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
