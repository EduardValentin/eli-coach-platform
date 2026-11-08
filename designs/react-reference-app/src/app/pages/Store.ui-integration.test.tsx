import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Store } from './Store';
import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { StoreProvider } from '../context/StoreContext';

function renderStore() {
  window.history.replaceState({}, '', '/store');

  return render(
    <MemoryRouter initialEntries={['/store']}>
      <AppProvider>
        <StoreProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <Store />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

describe('Store currency', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('prices the plans in euros until the visitor chooses otherwise', () => {
    // arrange
    renderStore();

    // act
    const currencies = within(screen.getByRole('group', { name: 'Currency' })).getAllByRole('radio');

    // assert
    expect(currencies.map((currency) => currency.textContent?.trim())).toEqual(['EUR', 'USD']);
    expect(screen.getByRole('radio', { name: 'EUR' })).toBeChecked();
    expect(screen.getByText('€39.00')).toBeInTheDocument();
    expect(screen.queryByText('$45.00')).not.toBeInTheDocument();
  });

  it('switches every price to its fixed dollar amount and remembers the choice', async () => {
    // arrange
    const user = userEvent.setup();
    const { unmount } = renderStore();

    // act
    await user.click(screen.getByRole('radio', { name: 'USD' }));

    // assert
    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('$55.00')).toBeInTheDocument();
    expect(screen.queryByText('€39.00')).not.toBeInTheDocument();

    // act
    unmount();
    renderStore();

    // assert
    expect(screen.getByRole('radio', { name: 'USD' })).toBeChecked();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it('falls back to euros when the remembered choice cannot be read', () => {
    // arrange
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    // act
    renderStore();

    // assert
    expect(screen.getByRole('radio', { name: 'EUR' })).toBeChecked();
    expect(screen.getByText('€39.00')).toBeInTheDocument();
  });
});
