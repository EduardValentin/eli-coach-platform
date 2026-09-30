import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import { PROGRESS_PHOTO_CONSENT_COPY } from '../../domain/onboardingCopy';
import { Toaster } from '../ui/sonner';
import { MeasurementsSection } from './MeasurementsSection';

const SERVICE_TIMEOUT = 4000;

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:picked'),
  });
});

afterEach(() => {
  toast.dismiss();
  window.history.replaceState({}, '', '/');
});

function renderSection(devParams = '') {
  const url = `/portal/profile?session=client${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <UnitPreferencesProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <MeasurementsSection />
                <Toaster />
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </UnitPreferencesProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function historyRows(): HTMLElement[] {
  const table = screen.getByRole('table', {
    name: 'Measurements history, newest first',
  });

  return within(table).getAllByRole('row').slice(1);
}

function photo(type = 'image/jpeg'): File {
  return new File([new Uint8Array(512)], 'photo', { type });
}

async function openSheet() {
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));

  return screen.getByRole('dialog', { name: 'Add measurements' });
}

async function save() {
  await userEvent.click(
    screen.getByRole('button', { name: 'Save measurements' }),
  );
  await waitFor(
    () =>
      expect(
        screen.queryByRole('dialog', { name: 'Add measurements' }),
      ).not.toBeInTheDocument(),
    { timeout: SERVICE_TIMEOUT },
  );
}

describe('her measurements on the profile page', () => {
  it('adds a fresh entry prefilled with her latest values and keeps the earlier one', async () => {
    // arrange
    renderSection();
    const sheet = await openSheet();
    const weight = within(sheet).getByRole('spinbutton', { name: /Weight/ });
    const prefilled = (weight as HTMLInputElement).value;
    await userEvent.clear(weight);
    await userEvent.type(weight, '65.4');

    // act
    await save();

    // assert
    expect(await screen.findByText('Measurements saved.')).toBeVisible();
    expect(prefilled).toBe('66.1');
    const rows = historyRows();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('65.4 kg');
    expect(rows[1]).toHaveTextContent('66.1 kg');
  });

  it('keeps the photos she adds with the new entry', async () => {
    // arrange
    renderSection();
    await openSheet();
    await userEvent.click(
      screen.getByRole('checkbox', { name: PROGRESS_PHOTO_CONSENT_COPY }),
    );
    await userEvent.upload(screen.getByLabelText('Add front photo'), photo());

    // act
    await save();

    // assert
    expect(
      within(historyRows()[0]).getByRole('button', { name: /^View photos/ }),
    ).toBeVisible();
    expect(
      within(historyRows()[1]).queryByRole('button', { name: /^View photos/ }),
    ).not.toBeInTheDocument();
  });

  it('remembers the consent she gave in the sheet the next time she adds measurements', async () => {
    // arrange
    renderSection();
    await openSheet();
    await userEvent.click(
      screen.getByRole('checkbox', { name: PROGRESS_PHOTO_CONSENT_COPY }),
    );
    await save();

    // act
    await openSheet();

    // assert
    expect(
      screen.getByText(
        `You agreed to share progress photos on ${format(new Date(), 'd MMMM yyyy')}.`,
      ),
    ).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('saves the entry and names each photo that could not be processed', async () => {
    // arrange
    renderSection('&jphoto=refuses');
    await openSheet();
    await userEvent.click(
      screen.getByRole('checkbox', { name: PROGRESS_PHOTO_CONSENT_COPY }),
    );
    await userEvent.upload(screen.getByLabelText('Add side photo'), photo());

    // act
    await save();

    // assert
    expect(
      await screen.findByText(
        'The side photo could not be processed, so it was not saved.',
      ),
    ).toBeInTheDocument();
    expect(historyRows()).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: /^View photos/ }),
    ).not.toBeInTheDocument();
  });

  it('drops the row action once she removes the last photo of an entry', async () => {
    // arrange
    renderSection();
    await openSheet();
    await userEvent.click(
      screen.getByRole('checkbox', { name: PROGRESS_PHOTO_CONSENT_COPY }),
    );
    await userEvent.upload(screen.getByLabelText('Add back photo'), photo());
    await save();
    await userEvent.click(screen.getByRole('button', { name: /^View photos/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove back photo' }),
    );

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await userEvent.keyboard('{Escape}');

    // assert
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(historyRows()).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: /^View photos/ }),
    ).not.toBeInTheDocument();
  });
});
