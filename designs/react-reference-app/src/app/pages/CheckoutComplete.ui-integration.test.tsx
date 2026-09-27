import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { CheckoutComplete } from './CheckoutComplete';
import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';

const CONFIRMATION_URL = '/checkout/complete';

function renderConfirmation() {
  window.history.replaceState({}, '', CONFIRMATION_URL);

  render(
    <MemoryRouter initialEntries={[CONFIRMATION_URL]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckoutComplete />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('the payment confirmation', () => {
  it('says where her invitation is going and how long it works', () => {
    // arrange
    renderConfirmation();

    // act
    const invitation = screen.getByText(/^Your invitation is on its way to/);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Payment confirmed' }),
    ).toBeInTheDocument();
    expect(invitation).toHaveTextContent(
      /^Your invitation is on its way to \S+@\S+\. It works for 30 days once it arrives — you'll create your account from it\.$/,
    );
  });
});
