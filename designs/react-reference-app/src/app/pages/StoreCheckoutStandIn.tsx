import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ProviderStandInShell,
  STAND_IN_BACK_LINK_CLASS,
  STAND_IN_FIELD_CLASS,
  STAND_IN_READINGS_CLASS,
  StandInCardFields,
  StandInReading,
} from '../components/ProviderStandIn';
import { Button } from '../components/ThemeButton';
import { formatStorePrice } from '../context/StoreContext';
import { isPaidLine, storeOrderTotal } from '../domain/storeOrder';
import {
  findStoreCheckoutSession,
  payStoreCheckout,
  storeOrderCompleteUrl,
} from '../services/storeOrderService';

const EYEBROW = 'Stripe Checkout · prototype stand-in';

const HOSTED_PAGE_NOTE =
  "In production this is Stripe's hosted payment page. Nothing here takes a real card.";

const CANCEL_URL = '/store?payment=cancelled';

export function StoreCheckoutStandIn() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  const session = findStoreCheckoutSession(sessionId);

  if (!session) {
    return (
      <StandInShell>
        <h1 className="text-xl font-medium text-text-primary">This checkout session has closed</h1>
        <p className="mt-3 text-sm text-muted-foreground">Go back to the store to check out again.</p>
        <Link className="mt-6 inline-block text-sm text-text-primary underline underline-offset-4" to="/store">
          Back to the store
        </Link>
      </StandInShell>
    );
  }

  const paidLines = session.lines.filter(isPaidLine);
  const total = formatStorePrice(storeOrderTotal(paidLines), session.currency);

  const pay = async () => {
    setPaying(true);
    await payStoreCheckout(session.sessionId);
    navigate(storeOrderCompleteUrl(session.sessionId));
  };

  return (
    <StandInShell>
      <h1 className="text-xl font-medium text-text-primary">Pay for your order</h1>

      <div className="mt-6">
        <label className="text-xs text-muted-foreground" htmlFor="stand-in-email">
          Email
        </label>
        <input
          className={STAND_IN_FIELD_CLASS}
          data-parity="stand-in-email"
          id="stand-in-email"
          readOnly
          type="email"
          value={session.email}
        />
      </div>

      <dl className={STAND_IN_READINGS_CLASS} data-parity="stand-in-lines">
        {paidLines.map((line) => (
          <StandInReading
            key={line.productId}
            term={line.title}
            value={formatStorePrice(line.amount, session.currency)}
          />
        ))}
        <StandInReading term="Total" value={total} />
      </dl>

      <StandInCardFields />

      <Button aria-busy={paying} className="mt-8" disabled={paying} onClick={pay} variant="inverted" width="full">
        {paying ? 'Taking payment…' : `Pay ${total}`}
      </Button>

      <Link className={STAND_IN_BACK_LINK_CLASS} to={CANCEL_URL}>
        Back
      </Link>
    </StandInShell>
  );
}

function StandInShell({ children }: { children: ReactNode }) {
  return (
    <div data-parity-root="StoreCheckoutStandIn">
      <ProviderStandInShell eyebrow={EYEBROW} landmarkLabel="Checkout" note={HOSTED_PAGE_NOTE}>
        {children}
      </ProviderStandInShell>
    </div>
  );
}
