import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { AppProvider, useAppState } from './AppContext';

function PrototypeScopeProbe() {
  const { appState, setAppState } = useAppState();

  return (
    <>
      <output>{appState.prototypeMode}</output>
      <button
        type="button"
        onClick={() => setAppState({ prototypeMode: 'post-mvp' })}
      >
        Show Post-MVP
      </button>
    </>
  );
}

function renderScopeProbe(search = '') {
  window.history.replaceState(null, '', `/${search}`);

  return render(
    <MemoryRouter>
      <AppProvider>
        <PrototypeScopeProbe />
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('prototype scope', () => {
  it('starts in MVP mode', () => {
    // arrange
    renderScopeProbe();

    // act
    const scope = screen.getByRole('status');

    // assert
    expect(scope).toHaveTextContent('mvp');
  });

  it('restores Post-MVP mode from the URL', () => {
    // arrange
    renderScopeProbe('?scope=post-mvp');

    // act
    const scope = screen.getByRole('status');

    // assert
    expect(scope).toHaveTextContent('post-mvp');
  });

  it('persists Post-MVP mode in the URL', async () => {
    // arrange
    const user = userEvent.setup();
    renderScopeProbe();

    // act
    await user.click(screen.getByRole('button', { name: 'Show Post-MVP' }));

    // assert
    await waitFor(() => {
      expect(window.location.search).toBe('?scope=post-mvp');
    });
  });
});

function SubscriptionParamsProbe() {
  const { appState, setAppState } = useAppState();

  return (
    <>
      <p>refund {appState.journeyRefund}</p>
      <p>start {appState.journeyStartPath}</p>
      <p>subscription {appState.journeySubscriptionStatus}</p>
      <p>payment problem {String(appState.journeyPaymentProblem)}</p>
      <p>paid {appState.journeyDaysSincePayment}</p>
      <p>cancel {appState.cancelOutcome}</p>
      <p>portal {appState.paymentPortalOutcome}</p>
      <button
        type="button"
        onClick={() =>
          setAppState({
            journeyPaymentProblem: true,
            journeyDaysSincePayment: '13',
            cancelOutcome: 'fails',
            paymentPortalOutcome: 'fails',
          })
        }
      >
        Change the subscription params
      </button>
    </>
  );
}

function renderSubscriptionParams(search = '') {
  window.history.replaceState(null, '', `/${search}`);

  return render(
    <MemoryRouter>
      <AppProvider>
        <SubscriptionParamsProbe />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('subscription dev params', () => {
  it('reads every subscription param from the URL', () => {
    // arrange
    const search =
      '?jrefund=part-refunded&jpayproblem=1&jpaid=14&jcancel=fails&jpayportal=fails';

    // act
    renderSubscriptionParams(search);

    // assert
    expect(screen.getByText('refund part-refunded')).toBeInTheDocument();
    expect(screen.getByText('payment problem true')).toBeInTheDocument();
    expect(screen.getByText('paid 14')).toBeInTheDocument();
    expect(screen.getByText('cancel fails')).toBeInTheDocument();
    expect(screen.getByText('portal fails')).toBeInTheDocument();
  });

  it('ends the subscription on the waiting path whenever a refund is set', () => {
    // arrange
    const search = '?jrefund=due&jsub=active&jstart=immediate';

    // act
    renderSubscriptionParams(search);

    // assert
    expect(screen.getByText('subscription ended')).toBeInTheDocument();
    expect(screen.getByText('start waiting')).toBeInTheDocument();
  });

  it('falls back to the defaults for unknown values', () => {
    // arrange
    const search =
      '?jrefund=maybe&jpaid=7&jcancel=already-ended&jpayportal=later';

    // act
    renderSubscriptionParams(search);

    // assert
    expect(screen.getByText('refund none')).toBeInTheDocument();
    expect(screen.getByText('paid stage')).toBeInTheDocument();
    expect(screen.getByText('cancel works')).toBeInTheDocument();
    expect(screen.getByText('portal works')).toBeInTheDocument();
  });

  it('writes the changed params back to the URL', async () => {
    // arrange
    const user = userEvent.setup();
    renderSubscriptionParams();

    // act
    await user.click(
      screen.getByRole('button', { name: 'Change the subscription params' }),
    );

    // assert
    await waitFor(() => {
      expect(window.location.search).toBe(
        '?jpayproblem=1&jpaid=13&jcancel=fails&jpayportal=fails',
      );
    });
  });
});
