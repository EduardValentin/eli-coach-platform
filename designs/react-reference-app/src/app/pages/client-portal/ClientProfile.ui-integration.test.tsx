import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PortalSidebar } from '../../components/client-portal/PortalSidebar';
import { CLIENT_PORTAL_LINKS } from '../../components/client-portal/navigation-links';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { CycleProvider } from '../../context/CycleContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { TrainingProvider } from '../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import { ClientProfile } from './ClientProfile';

const SAVE_TIMEOUT = { timeout: 3000 };

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
    value: vi.fn(() => 'blob:avatar'),
  });
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderProfile(devParams: string) {
  const url = `/portal/profile?session=client&${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <UnitPreferencesProvider>
            <CycleProvider>
              <AssessmentCallProvider>
                <ClientJourneyProvider>
                  <NotificationProvider>
                    <CheckinProvider>
                      <Routes>
                        <Route path="/portal/profile" element={<ClientProfile />} />
                      </Routes>
                      <PortalSidebar links={CLIENT_PORTAL_LINKS} markedHrefs={[]} countByHref={{}} />
                      <Toaster />
                    </CheckinProvider>
                  </NotificationProvider>
                </ClientJourneyProvider>
              </AssessmentCallProvider>
            </CycleProvider>
          </UnitPreferencesProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function section(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

function readingIn(block: HTMLElement, label: string): HTMLElement {
  const term = within(block).getByText(label);
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement)) throw new Error(`No ${label} value`);
  return value;
}

describe('her profile page', () => {
  it('lets her edit who she is, without her gender, and keeps her email read-only', () => {
    // act
    renderProfile('jstage=approved');

    // assert
    const about = section('About you');
    expect(within(about).getByRole('textbox', { name: /First name/ })).toHaveValue('Jane');
    expect(within(about).getByRole('textbox', { name: /Last name/ })).toHaveValue('Doe');
    expect(within(about).getByText('jane@example.com')).toBeInTheDocument();
    expect(within(about).getByRole('button', { name: "Why the email can't be changed" })).toBeInTheDocument();
    expect(within(about).queryByRole('radiogroup', { name: /Gender/ })).not.toBeInTheDocument();
  });

  it('leaves out her training and what her coach keeps before her answers are approved', () => {
    // act
    renderProfile('jstage=submitted');

    // assert
    expect(section('About you')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your training' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your coach keeps these up to date' })).not.toBeInTheDocument();
  });

  it('lets her edit her training once her answers are approved', async () => {
    // arrange
    const user = renderProfile('jstage=approved');
    const training = section('Your training');

    // act
    await user.click(within(training).getByRole('radio', { name: '4 days' }));
    await user.click(within(training).getByRole('button', { name: 'Save changes' }));

    // assert
    expect(await screen.findByText('Changes saved', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(within(training).getByRole('radio', { name: '4 days' })).toBeChecked();
    expect(within(training).getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('shows what her coach keeps up to date as readings, never her coach notes', () => {
    // act
    renderProfile('jstage=approved');

    // assert
    const kept = section('Your coach keeps these up to date');
    expect(readingIn(kept, 'Gender')).toHaveTextContent('Female');
    expect(readingIn(kept, 'Level')).toHaveTextContent('Beginner');
    expect(readingIn(kept, 'Primary goal')).toHaveTextContent('Lose fat');
    expect(readingIn(kept, 'Goal weight')).toHaveTextContent('62 kg');
    expect(readingIn(kept, 'Lifestyle activity level')).toHaveTextContent('Mostly sitting');
    expect(readingIn(kept, 'Cycle mode')).toHaveTextContent('Adapted to symptoms');
    expect(readingIn(kept, 'Dietary restrictions')).toHaveTextContent('Lactose, mild');
    expect(within(kept).queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Coach notes/)).not.toBeInTheDocument();
  });

  it('saves her new name and shows it beside her picture and in the sidebar', async () => {
    // arrange
    const user = renderProfile('jstage=approved');
    const firstName = within(section('About you')).getByRole('textbox', { name: /First name/ });
    await user.clear(firstName);
    await user.type(firstName, 'Anna');

    // act
    await user.click(within(section('About you')).getByRole('button', { name: 'Save changes' }));

    // assert
    expect(await screen.findByText('Changes saved', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Anna Doe' })).toBeInTheDocument();
    expect(screen.getAllByText('Anna Doe').length).toBeGreaterThan(1);
  });

  it('uploads her picture', async () => {
    // arrange
    const user = renderProfile('jstage=submitted');

    // act
    await user.upload(screen.getByLabelText('Upload picture'), new File(['avatar'], 'avatar.webp', { type: 'image/webp' }));

    // assert
    expect(await screen.findByText('Profile picture updated', {}, SAVE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByLabelText('Change picture')).toBeInTheDocument();
  });
});
