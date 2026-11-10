import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, CheckCircle2, Clock, Loader2, Mail } from 'lucide-react';
import {
  ConfirmationActions,
  ConfirmationHeading,
  ConfirmationLead,
  ConfirmationPage,
} from '../components/CheckoutConfirmation';
import { StoreOrderSummary } from '../components/StoreOrderSummary';
import { Button, buttonVariants } from '../components/ThemeButton';
import { LABEL_CLASS } from '../components/typography';
import { linkVariants } from '../components/ui/link';
import { useAppState } from '../context/AppContext';
import { useStore } from '../context/StoreContext';
import {
  readStoreOrder,
  resendStoreOrderEmail,
  type StoreOrderConfirmation,
  type StoreOrderEmailResend,
} from '../services/storeOrderService';

const CONTACT_EMAIL = 'contact@evoa.fit';

type OrderLookup = StoreOrderConfirmation | { status: 'loading' };

type ConfirmedOrder = Extract<StoreOrderConfirmation, { status: 'confirmed' }>;

type ResendState = 'idle' | 'sending' | StoreOrderEmailResend;

export function StoreOrderComplete() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? '';
  const { clearCart } = useStore();
  const [order, setOrder] = useState<OrderLookup>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    setOrder({ status: 'loading' });

    readStoreOrder(sessionId).then((confirmation) => {
      if (!current) return;
      setOrder(confirmation);
      if (confirmation.status === 'confirmed') clearCart();
    });

    return () => {
      current = false;
    };
  }, [sessionId]);

  if (order.status === 'loading') {
    return (
      <ConfirmationPage landmarkLabel="Order confirmation" parityRoot="StoreOrderComplete">
        <p
          aria-busy="true"
          className="flex items-center justify-center gap-2 text-center text-base text-text-secondary"
          role="status"
        >
          <Loader2 aria-hidden="true" className="animate-spin motion-reduce:hidden" size={18} />
          Checking your payment…
        </p>
      </ConfirmationPage>
    );
  }

  if (order.status === 'not_completed') {
    return (
      <ConfirmationPage landmarkLabel="Order confirmation" parityRoot="StoreOrderComplete">
        <ConfirmationHeading outcome="not-completed">Payment not completed</ConfirmationHeading>
        <ConfirmationLead data-parity="order-lead">
          We couldn&apos;t confirm a payment for this checkout. Head back to the store to try again.
        </ConfirmationLead>
        <BackToStore />
      </ConfirmationPage>
    );
  }

  return <ConfirmedOrderView order={order} sessionId={sessionId} />;
}

function ConfirmedOrderView({ order, sessionId }: { order: ConfirmedOrder; sessionId: string }) {
  const { appState } = useAppState();
  const [resend, setResend] = useState<ResendState>('idle');

  const sendAgain = async () => {
    if (resend === 'sending') {
      return;
    }

    setResend('sending');
    setResend(await resendStoreOrderEmail(sessionId, appState.storeOrderResendOutcome));
  };

  return (
    <ConfirmationPage landmarkLabel="Order confirmation" parityRoot="StoreOrderComplete">
      <ConfirmationHeading outcome="confirmed">Order confirmed</ConfirmationHeading>

      <ConfirmationLead data-parity="order-lead">
        Your order email is on its way to{' '}
        <span className="font-medium text-text-primary" data-parity="order-email">
          {order.email}
        </span>
        . Your download link is in that email and works for seven days.
      </ConfirmationLead>

      <h2 className={`mt-8 ${LABEL_CLASS}`}>Your order</h2>
      <StoreOrderSummary className="mt-2" currency={order.currency} lines={order.lines} />
      <p className="mt-3 text-sm text-text-secondary" data-parity="receipt-note">
        Stripe sends your payment receipt in a separate email.
      </p>

      <div className="mt-8 border-t border-border-subtle pt-6 text-center" data-parity="resend-block">
        <p className="text-sm text-text-secondary">Nothing in your inbox? Check your spam folder or send it again.</p>
        <Button
          aria-busy={resend === 'sending' || undefined}
          aria-disabled={resend === 'sending' || undefined}
          className="mt-4"
          onClick={sendAgain}
          variant="outline"
        >
          {resend === 'sending' ? (
            <Loader2 aria-hidden="true" className="animate-spin motion-reduce:hidden" size={18} />
          ) : (
            <Mail aria-hidden="true" size={18} />
          )}
          Send my order email again
        </Button>
        <div className="mt-3 empty:hidden" data-parity="resend-feedback" role="status">
          <ResendFeedback email={order.email} resend={resend} />
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          Still need help? Contact{' '}
          <a className={linkVariants({ variant: 'in-text' })} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>

      <BackToStore />
    </ConfirmationPage>
  );
}

function ResendFeedback({ email, resend }: { email: string; resend: ResendState }) {
  if (resend === 'sent') {
    return (
      <FeedbackLine icon={<CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={16} />}>
        Sent again to {email}. Use the newest email: links in earlier ones no longer work.
      </FeedbackLine>
    );
  }
  if (resend === 'processing') {
    return (
      <FeedbackLine icon={<Clock aria-hidden="true" className="mt-0.5 shrink-0 text-brand-secondary" size={16} />}>
        Your order is still being processed. Your email will arrive shortly.
      </FeedbackLine>
    );
  }
  if (resend === 'rate_limited') {
    return (
      <FeedbackLine icon={<AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={16} />}>
        You can&apos;t send it again just yet. Please try again later.
      </FeedbackLine>
    );
  }

  return null;
}

function FeedbackLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="mx-auto flex max-w-sm items-start justify-center gap-2 text-left text-sm text-text-primary">
      {icon}
      <span>{children}</span>
    </p>
  );
}

function BackToStore() {
  return (
    <ConfirmationActions>
      <Link className={buttonVariants({ variant: 'outline' })} to="/store">
        Back to the store
      </Link>
    </ConfirmationActions>
  );
}
