import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppState } from '../../context/AppContext';
import {
  openPaymentMethodPortal,
  subscriptionErrorMessage,
} from '../../services/subscriptionService';

export function usePaymentMethodPortal() {
  const { appState } = useAppState();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const open = async () => {
    setOpening(true);
    setProblem(null);

    try {
      const session = await openPaymentMethodPortal(
        appState.paymentPortalOutcome,
      );
      navigate(session.url);
    } catch (error) {
      setProblem(subscriptionErrorMessage(error, 'payment-portal-unavailable'));
      setOpening(false);
    }
  };

  return { open, opening, problem };
}
