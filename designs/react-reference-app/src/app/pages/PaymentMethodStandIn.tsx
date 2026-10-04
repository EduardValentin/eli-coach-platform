import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ThemeButton';
import {
  ProviderStandInShell,
  STAND_IN_BACK_LINK_CLASS,
  StandInCardFields,
} from '../components/ProviderStandIn';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { savePaymentMethod } from '../services/subscriptionService';

const SETTINGS_PATH = '/portal/settings';

const EYEBROW = 'Stripe customer portal · prototype stand-in';

const HOSTED_PAGE_NOTE =
  "In production this is Stripe's page for updating the card on file. Nothing here takes a real card.";

export function PaymentMethodStandIn() {
  const navigate = useNavigate();
  const { demoJourney, recordPaymentMethodChanged } = useClientJourneys();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const card = await savePaymentMethod();
    recordPaymentMethodChanged(demoJourney.callId, card);
    navigate(SETTINGS_PATH);
  };

  return (
    <ProviderStandInShell
      eyebrow={EYEBROW}
      landmarkLabel="Payment method"
      note={HOSTED_PAGE_NOTE}
    >
      <h1 className="text-xl font-medium text-text-primary">Update your card</h1>

      <StandInCardFields />

      <Button
        aria-busy={saving}
        className="mt-8"
        disabled={saving}
        onClick={() => void save()}
        variant="inverted"
        width="full"
      >
        {saving ? 'Saving…' : 'Save card'}
      </Button>

      <Link className={STAND_IN_BACK_LINK_CLASS} to={SETTINGS_PATH}>
        Back
      </Link>
    </ProviderStandInShell>
  );
}
