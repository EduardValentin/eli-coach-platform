import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { useAppState } from '../context/AppContext';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from './ui/utils';
import { Checkbox } from './ui/checkbox';
import {
  isValidAcquisitionEmail,
  StoreAcquisitionError,
  STORE_ACQUISITION_ERROR_MESSAGES,
  submitStoreAcquisition,
} from '../services/storeAcquisitionService';

const FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function AcquisitionErrorAlert({
  id,
  error,
}: {
  id: string;
  error: StoreAcquisitionError;
}) {
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-2 text-sm leading-snug text-destructive"
    >
      <AlertCircle size={16} aria-hidden="true" className="shrink-0 mt-0.5" />
      <p className="text-left">{error.message}</p>
    </div>
  );
}

export function CartDrawer() {
  const { cart, removeFromCart, clearCart, isCartOpen, setIsCartOpen, formatPrice } = useStore();
  const { appState } = useAppState();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<StoreAcquisitionError | null>(null);
  const [successVariant, setSuccessVariant] = useState<'free' | 'paid'>('paid');

  const headingId = useId();
  const emailErrorId = useId();
  const formErrorId = useId();
  const termsId = useId();
  const marketingId = useId();

  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion() === true;

  const totalUSD = useMemo(() => cart.reduce((sum, item) => sum + item.product.priceUSD, 0), [cart]);
  const isFreeOnlyCart = cart.length > 0 && totalUSD === 0;

  useEffect(() => {
    if (!isCartOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [isCartOpen]);

  // Step swaps unmount the focused control, dropping focus to <body> and
  // defeating the trap — recapture it whenever the rendered step changes.
  useEffect(() => {
    if (!isCartOpen) return;
    const drawer = drawerRef.current;
    if (drawer && !drawer.contains(document.activeElement)) {
      drawer.focus();
    }
  }, [isCartOpen, checkoutStep]);

  const handleClose = () => {
    setIsCartOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setCheckoutStep('cart');
      setEmail('');
      setTermsAccepted(false);
      setMarketingConsent(false);
      setEmailError(null);
      setServiceError(null);
    }, 300);
  };

  const handleDrawerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      handleClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (!focusables) return;
    const enabled = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
    if (enabled.length === 0) return;
    const first = enabled[0];
    const last = enabled[enabled.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || active === drawerRef.current) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const submitAcquisition = async (submittedEmail: string) => {
    setServiceError(null);
    setIsProcessing(true);
    const wasFreeOnly = isFreeOnlyCart;
    try {
      await submitStoreAcquisition({
        email: submittedEmail,
        productIds: cart.map((item) => item.product.id),
        marketingConsent,
        outcome: appState.storeCheckoutOutcome,
      });
      setSuccessVariant(wasFreeOnly ? 'free' : 'paid');
      setCheckoutStep('success');
      clearCart();
    } catch (err) {
      if (err instanceof StoreAcquisitionError) {
        setServiceError(err);
        if (err.code === 'UNAVAILABLE_PRODUCT' && cart.length > 0) {
          removeFromCart(cart[cart.length - 1].product.id);
          setCheckoutStep('cart');
        }
      } else {
        setServiceError(
          new StoreAcquisitionError('SERVER_ERROR', STORE_ACQUISITION_ERROR_MESSAGES.SERVER_ERROR),
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (appState.isAuthenticated) {
      // Authenticated users already have emails implicitly in the mock state
      submitAcquisition('');
    } else {
      setCheckoutStep('checkout');
    }
  };

  const submitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted || isProcessing || cart.length === 0) return;
    if (!isValidAcquisitionEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(null);
    submitAcquisition(email.trim());
  };

  const processingLabel = isFreeOnlyCart ? 'Sending your resources' : 'Processing your order';

  const processingContent = shouldReduceMotion ? (
    <span>{processingLabel}…</span>
  ) : (
    <Loader2 aria-hidden="true" size={20} className="animate-spin mx-auto" />
  );

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : undefined}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-[70] backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            tabIndex={-1}
            onKeyDown={handleDrawerKeyDown}
            initial={shouldReduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={shouldReduceMotion ? undefined : { x: '100%' }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', damping: 25, stiffness: 200 }
            }
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card z-[80] shadow-2xl flex flex-col focus:outline-none"
          >
            <div className="flex items-center justify-between p-6 border-b border-stroke-faint bg-surface-page">
              <h2 id={headingId} className="font-serif text-2xl text-foreground flex items-center gap-2">
                <ShoppingBag aria-hidden="true" className="text-brand" />
                Your Cart
              </h2>
              <button
                onClick={handleClose}
                aria-label="Close cart"
                className="p-2 text-copy-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-subtle"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {cart.length === 0 && checkoutStep === 'cart' ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center h-full gap-4">
                  <ShoppingBag size={64} aria-hidden="true" className="text-placeholder-soft mb-4" />
                  <p className="text-xl text-copy-muted font-medium">Your cart is empty.</p>
                  <p className="text-copy-muted">Add some plans or free resources to get started.</p>
                  {serviceError && (
                    <AcquisitionErrorAlert id={formErrorId} error={serviceError} />
                  )}
                  <button
                    onClick={handleClose}
                    className="mt-6 px-6 py-3 bg-surface-inverted text-surface-inverted-foreground rounded-sm font-medium hover:bg-brand transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  {checkoutStep === 'cart' && (
                    <div className="flex flex-col gap-6 flex-1">
                      <div className="flex-1">
                        {cart.map((item) => (
                          <div key={item.product.id} className="flex gap-4 py-4 border-b border-stroke-faint last:border-0">
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.title}
                              className="w-20 h-24 object-cover rounded-md shadow-sm"
                            />
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-serif text-foreground font-medium leading-tight mb-1">
                                  {item.product.title}
                                </h3>
                                <span
                                  className={cn(
                                    'text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm',
                                    {
                                      'text-brand-secondary bg-brand-secondary-soft':
                                        item.product.priceUSD === 0,
                                      'text-brand bg-brand-soft':
                                        item.product.priceUSD !== 0,
                                    },
                                  )}
                                >
                                  {item.product.type}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <p className="font-semibold text-foreground">
                                  {formatPrice(item.product.priceUSD)}
                                </p>
                                <button
                                  onClick={() => removeFromCart(item.product.id)}
                                  aria-label={`Remove ${item.product.title} from cart`}
                                  className="text-copy-muted hover:text-destructive transition-colors p-1"
                                >
                                  <Trash2 size={18} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-control-border-soft pt-6 mt-auto">
                        {serviceError && (
                          <div className="mb-4">
                            <AcquisitionErrorAlert id={formErrorId} error={serviceError} />
                          </div>
                        )}
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-lg text-copy-muted font-medium">Total</span>
                          <span className="text-3xl font-bold text-foreground">{formatPrice(totalUSD)}</span>
                        </div>
                        <button
                          onClick={handleCheckout}
                          disabled={isProcessing}
                          aria-label={isProcessing ? processingLabel : undefined}
                          className="w-full py-4 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? (
                            processingContent
                          ) : (
                            <>
                              Checkout <ArrowRight size={18} aria-hidden="true" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 'checkout' && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={shouldReduceMotion ? { duration: 0 } : undefined}
                      className="flex flex-col h-full"
                    >
                      <h3 className="font-serif text-2xl text-foreground mb-2">Almost there</h3>
                      <p className="text-copy-muted mb-8 text-sm">
                        Please provide your email where we should send your digital products.
                      </p>

                      <form onSubmit={submitCheckout} noValidate className="flex flex-col gap-6 flex-1">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (emailError) setEmailError(null);
                            }}
                            placeholder="you@example.com"
                            aria-invalid={emailError !== null}
                            aria-describedby={emailError ? emailErrorId : undefined}
                            className={cn(
                              'w-full px-4 py-3 rounded-md border placeholder:text-placeholder-soft focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all',
                              {
                                'border-destructive': emailError !== null,
                                'border-control-border-soft': emailError === null,
                              },
                            )}
                          />
                          {emailError && (
                            <p
                              id={emailErrorId}
                              role="alert"
                              className="mt-2 flex items-start gap-2 text-sm leading-snug text-destructive"
                            >
                              <AlertCircle size={16} aria-hidden="true" className="shrink-0 mt-0.5" />
                              {emailError}
                            </p>
                          )}
                        </div>

                        <div className="bg-surface-subtle p-4 rounded-md border border-stroke-faint">
                          <p className="text-sm font-semibold text-foreground mb-2">Order Summary</p>
                          <div className="flex justify-between items-center text-sm text-copy-muted">
                            <span>{cart.length} item{cart.length === 1 ? '' : 's'}</span>
                            <span className="font-bold text-foreground">{formatPrice(totalUSD)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 mt-4">
                          <label htmlFor={termsId} className="flex items-start gap-3 cursor-pointer group">
                            <Checkbox
                              id={termsId}
                              required
                              checked={termsAccepted}
                              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                              className="mt-0.5"
                            />
                            <span className="text-sm text-copy-muted group-hover:text-foreground transition-colors leading-relaxed">
                              I agree to the{' '}
                              <Link to="/terms" className="text-brand hover:underline">
                                Terms of Service
                              </Link>
                              .
                            </span>
                          </label>

                          <label htmlFor={marketingId} className="flex items-start gap-3 cursor-pointer group">
                            <Checkbox
                              id={marketingId}
                              checked={marketingConsent}
                              onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                              className="mt-0.5"
                            />
                            <span className="text-sm text-copy-muted group-hover:text-foreground transition-colors leading-relaxed">
                              Keep me posted about new plans, guides, and offers. (Optional)
                            </span>
                          </label>

                          <p className="text-sm text-copy-muted leading-relaxed">
                            See how we handle your data in our{' '}
                            <Link to="/privacy" className="text-brand hover:underline">
                              Privacy Policy
                            </Link>
                            .
                          </p>
                        </div>

                        {serviceError && (
                          <AcquisitionErrorAlert id={formErrorId} error={serviceError} />
                        )}

                        <div className="mt-auto pt-6 border-t border-control-border-soft flex gap-4">
                          <button
                            type="button"
                            onClick={() => setCheckoutStep('cart')}
                            className="px-6 py-4 border border-control-border-soft text-foreground font-medium rounded-sm hover:bg-surface-subtle transition-colors"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={!termsAccepted || !email || isProcessing || cart.length === 0}
                            aria-label={isProcessing ? processingLabel : undefined}
                            className="flex-1 py-4 bg-brand text-brand-foreground font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing
                              ? processingContent
                              : isFreeOnlyCart
                                ? 'Send My Resources'
                                : `Complete Order • ${formatPrice(totalUSD)}`}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {checkoutStep === 'success' && (
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={shouldReduceMotion ? { duration: 0 } : undefined}
                      className="flex flex-col items-center justify-center flex-1 text-center h-full"
                    >
                      <div className="w-20 h-20 bg-success-surface text-success rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} aria-hidden="true" />
                      </div>
                      {successVariant === 'free' ? (
                        <>
                          <h3 className="font-serif text-3xl text-foreground mb-3">Check your email</h3>
                          <p className="text-copy-muted mb-8 max-w-[280px]">
                            We've sent your resources to <strong>{email || 'your inbox'}</strong>. Your
                            download link works for the next seven days.
                          </p>
                          <button
                            onClick={handleClose}
                            className="px-8 py-3.5 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-sm hover:bg-brand transition-colors"
                          >
                            Keep Browsing
                          </button>
                        </>
                      ) : (
                        <>
                          <h3 className="font-serif text-3xl text-foreground mb-3">Order Complete!</h3>
                          <p className="text-copy-muted mb-8 max-w-[280px]">
                            Thank you for your order. We've sent an email to{' '}
                            <strong>{email || 'your account'}</strong> with the download links.
                          </p>
                          <button
                            onClick={handleClose}
                            className="px-8 py-3.5 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-sm hover:bg-brand transition-colors"
                          >
                            Continue Browsing
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
