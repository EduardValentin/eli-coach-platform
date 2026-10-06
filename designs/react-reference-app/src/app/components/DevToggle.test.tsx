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

describe('DevToggle resource upload', () => {
  it('drives the upload through to an answer, a held preparing state or either server refusal', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Resources' }));

    // act
    await user.click(screen.getByRole('combobox', { name: 'Resource upload' }));

    // assert
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Works',
      'Fails',
      'Holds at preparing',
      'Refused: over 50 pages',
      'Refused: cannot be read',
    ]);
  });

  it('keeps the chosen outcome in the address so the state can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Resources' }));
    await user.click(screen.getByRole('combobox', { name: 'Resource upload' }));

    // act
    await user.click(screen.getByRole('option', { name: 'Holds at preparing' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Resource upload' })).toHaveTextContent(
      'Holds at preparing',
    );
    expect(new URLSearchParams(window.location.search).get('rupload')).toBe('holds');
  });
});

describe('DevToggle resource opening', () => {
  it('keeps a failing opening in the address so the state can be shared', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle();
    await openDevSettings();
    await user.click(screen.getByRole('tab', { name: 'Resources' }));
    await user.click(screen.getByRole('combobox', { name: 'Resource opening' }));

    // act
    await user.click(screen.getByRole('option', { name: 'Fails' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Resource opening' })).toHaveTextContent('Fails');
    expect(new URLSearchParams(window.location.search).get('rmark')).toBe('fails');
  });

  it('restores a failing opening from the address', async () => {
    // arrange
    const user = userEvent.setup();
    renderDevToggle('?rmark=fails');
    await openDevSettings();

    // act
    await user.click(screen.getByRole('tab', { name: 'Resources' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Resource opening' })).toHaveTextContent('Fails');
  });
});
