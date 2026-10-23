import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../../context/ClientJourneyContext';
import { ProgramProvider } from '../../../context/ProgramContext';
import { TrainingProvider } from '../../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../../context/UnitPreferencesContext';
import { ClientProfilePage } from '../../../pages/coach-portal/ClientProfilePage';
import { ProgramEditorPage } from '../../../pages/coach-portal/ProgramEditorPage';

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
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderSheet(query: string) {
  const url = `/coach/clients/c1/program/new?session=coach${query}`;
  window.history.replaceState(null, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <UnitPreferencesProvider>
          <TrainingProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ProgramProvider>
                  <Routes>
                    <Route path="/coach/clients/:id/program/new" element={<ProgramEditorPage />} />
                    <Route path="/coach/clients/:id/program/draft" element={<p>Editor</p>} />
                    <Route path="/coach/clients/:id" element={<p>Client page</p>} />
                  </Routes>
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </TrainingProvider>
        </UnitPreferencesProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function renderProfileThenSheet() {
  const url = '/coach/clients/c1/profile?session=coach&pseed=none&jstage=approved';
  window.history.replaceState(null, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <UnitPreferencesProvider>
          <TrainingProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ProgramProvider>
                  <Routes>
                    <Route path="/coach/clients/:id/profile" element={<ClientProfilePage />} />
                    <Route path="/coach/clients/:id/program/new" element={<ProgramEditorPage />} />
                  </Routes>
                  <Link to="/coach/clients/c1/program/new">open the program setup</Link>
                  <Toaster />
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </TrainingProvider>
        </UnitPreferencesProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

type User = ReturnType<typeof userEvent.setup>;

async function openPanel(user: User, name: string) {
  await user.click(screen.getByRole('button', { name }));
}

describe('ProgramSetupSheet', () => {
  it('groups the fields into four panels with the program panel open', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=approved');

    // assert
    for (const name of ['Program', 'Schedule', 'Equipment', 'Cycle']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Program' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Schedule' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the daily steps with the schedule and only the cycle mode under Cycle', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await openPanel(user, 'Schedule');
    await openPanel(user, 'Cycle');

    // assert
    const schedule = screen.getByRole('region', { name: 'Schedule' });
    for (const name of ['Split', 'Training days', 'Session length']) expect(within(schedule).getByRole('radiogroup', { name })).toBeInTheDocument();
    expect(within(schedule).getByRole('combobox', { name: 'Daily steps' })).toHaveTextContent('6,000');
    const cycle = screen.getByRole('region', { name: 'Cycle' });
    expect(within(cycle).getAllByRole('combobox')).toHaveLength(1);
    expect(within(cycle).getByRole('combobox', { name: 'Cycle mode' })).toBeInTheDocument();
  });

  it('leaves the cycle panel out for a male client', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=approved&jgender=male');

    // assert
    for (const name of ['Program', 'Schedule', 'Equipment']) expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Cycle' })).not.toBeInTheDocument();
  });

  it('prefills from her profile and creates the draft', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // assert
    expect(screen.getByRole('heading', { name: 'Set up the program' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Goal' })).toHaveTextContent('Lose fat');
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Beginner');
    expect(screen.getByRole('combobox', { name: 'Program language' })).toHaveTextContent('English');

    // act
    await openPanel(user, 'Schedule');

    // assert
    expect(screen.getByRole('radio', { name: '3 days' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '60 min' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Daily steps' })).toHaveTextContent('6,000');

    // act
    await user.click(screen.getByRole('button', { name: 'Continue to plan' }));

    // assert
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });

  it('changes a choice before creating the draft', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(screen.getByRole('combobox', { name: 'Level' }));
    await user.click(screen.getByRole('option', { name: 'Advanced' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Advanced');
  });

  it('offers the two splits as a plain radio without descriptions', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await openPanel(user, 'Schedule');

    // assert
    const split = screen.getByRole('radiogroup', { name: 'Split' });
    expect(within(split).getAllByRole('radio').map(radio => radio.textContent)).toEqual(['Full Body', 'Upper / Lower']);
    expect(within(split).getByRole('radio', { name: 'Full Body' })).toBeChecked();
  });

  it('follows the training days with the suggested split', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    await openPanel(user, 'Schedule');

    // act
    await user.click(screen.getByRole('radio', { name: '4 days' }));

    // assert
    expect(screen.getByRole('radio', { name: 'Upper / Lower' })).toBeChecked();
  });

  it('prefills the equipment from her profile', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await openPanel(user, 'Equipment');

    // assert
    const equipment = screen.getByRole('group', { name: 'Equipment' });
    expect(within(equipment).getByRole('checkbox', { name: 'Barbell' })).toBeChecked();
    expect(within(equipment).getByRole('checkbox', { name: 'Kettlebell' })).toBeChecked();
    expect(within(equipment).getByRole('checkbox', { name: 'Bodyweight only' })).not.toBeChecked();
  });

  it('keeps bodyweight only exclusive of every other chip', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    await openPanel(user, 'Equipment');
    const equipment = screen.getByRole('group', { name: 'Equipment' });

    // act
    await user.click(within(equipment).getByRole('checkbox', { name: 'Bodyweight only' }));

    // assert
    expect(within(equipment).getByRole('checkbox', { name: 'Bodyweight only' })).toBeChecked();
    expect(within(equipment).getByRole('checkbox', { name: 'Barbell' })).not.toBeChecked();
    expect(within(equipment).getByRole('checkbox', { name: 'Dumbbells' })).not.toBeChecked();

    // act
    await user.click(within(equipment).getByRole('checkbox', { name: 'Kettlebell' }));

    // assert
    expect(within(equipment).getByRole('checkbox', { name: 'Kettlebell' })).toBeChecked();
    expect(within(equipment).getByRole('checkbox', { name: 'Bodyweight only' })).not.toBeChecked();
  });

  it('explains nothing under the fields', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    for (const name of ['Schedule', 'Equipment', 'Cycle']) await openPanel(user, name);

    // assert
    expect(screen.queryByText(/Suggested from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pick everything/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Every session trains the whole body/)).not.toBeInTheDocument();
  });

  it('prefills what the coach last saved on her profile', async () => {
    // arrange
    const user = renderProfileThenSheet();
    const coaching = screen.getByRole('region', { name: 'Coaching' });
    await user.click(within(coaching).getByRole('radio', { name: '5+ days' }));
    await user.click(within(coaching).getByRole('radio', { name: 'Intermediate' }));
    await user.click(within(coaching).getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Changes saved', {}, { timeout: 3000 });

    // act
    await user.click(screen.getByRole('link', { name: 'open the program setup' }));
    await openPanel(user, 'Schedule');

    // assert
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Intermediate');
    expect(screen.getByRole('radio', { name: '5+ days' })).toBeChecked();
  });

  it('returns to the client page on cancel', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    // assert
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });

  it('opens the existing draft instead of setting up again', () => {
    // arrange / act
    renderSheet('&pseed=draft&jstage=approved');

    // assert
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });
});
