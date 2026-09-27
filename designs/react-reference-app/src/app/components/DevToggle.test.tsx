import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { CheckinProvider } from '../context/CheckinContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';
import { DevToggle } from './DevToggle';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function renderDevToggle(search = '') {
  window.history.replaceState(null, '', `/${search}`);

  return render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckinProvider>
                <DevToggle />
              </CheckinProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

async function openDevSettings() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
}

describe('DevToggle prototype mode', () => {
  it('shows only MVP settings by default', async () => {
    // arrange
    renderDevToggle();

    // act
    await openDevSettings();

    // assert
    expect(screen.getByRole('combobox', { name: 'Prototype mode' })).toHaveTextContent('MVP');
    expect(screen.queryByRole('tab', { name: 'Nutrition' })).not.toBeInTheDocument();
  });

  it('adds Post-MVP settings in Post-MVP mode', async () => {
    // arrange
    renderDevToggle('?scope=post-mvp');

    // act
    await openDevSettings();

    // assert
    expect(screen.getByRole('combobox', { name: 'Prototype mode' })).toHaveTextContent('Post-MVP');
    expect(screen.getByRole('tab', { name: 'Nutrition' })).toBeInTheDocument();
  });
});

describe('DevToggle links sent by the coach', () => {
  it('opens the payment link with its token in the fragment and the dev settings in the query', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?jstage=payment-link-sent');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // assert
    const [paymentLink] = screen.getAllByRole('link', {
      name: /^Open payment link · /,
    });
    expect(paymentLink).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^\/select-bundle\?jstage=payment-link-sent#pl-seed-[\w-]+$/,
      ),
    );
  });
});
