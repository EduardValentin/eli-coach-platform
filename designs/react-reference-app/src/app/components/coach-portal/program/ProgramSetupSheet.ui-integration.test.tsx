import { render, screen, waitFor, within } from '@testing-library/react';
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
                    <Route path="/coach/clients/:id/program/draft" element={<p>Editor</p>} />
                  </Routes>
                  <Link to="/coach/clients/c1/program/new">open the program setup</Link>
                  <Link to="/coach/clients/c1/profile">open her profile</Link>
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

function equipment(): HTMLElement {
  return screen.getByRole('group', { name: /^Equipment/ });
}

async function clearEquipment(user: User) {
  for (const chip of within(equipment()).getAllByRole('checkbox')) {
    if ((chip as HTMLInputElement).checked) await user.click(chip);
  }
}

describe('ProgramSetupSheet', () => {
  it('titles the page once under a link back to the client', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=approved');

    // assert
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Build Jane’s program' })).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    const back = screen.getByRole('navigation', { name: 'Back to the client' });
    expect(within(back).getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/coach/clients/c1');
    expect(document.title).toBe('Build Jane’s program · Evoa');
  });

  it('lists every field in one form in the order they depend on each other', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=approved');

    // assert
    expect(screen.queryByRole('button', { name: 'Schedule' })).not.toBeInTheDocument();
    const labels = ['Goal', 'Level', 'Training days', 'Split', 'Session length', 'Daily steps', 'Equipment', 'Program language'];
    const positions = labels.map(label => screen.getAllByText(label, { exact: true })[0]);
    for (const [index, label] of positions.entries()) {
      if (index > 0) expect(positions[index - 1].compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('names the goals the way a coach reads them', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    expect(screen.getByRole('combobox', { name: /^Goal/ })).toHaveTextContent('Fat loss');

    // act
    await user.click(screen.getByRole('combobox', { name: /^Goal/ }));

    // assert
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual([
      'Fat loss',
      'Muscle gain',
      'Weight maintenance',
      'Activity and nutrition balance',
      'Overall health',
      'Cycle-aware training',
    ]);
  });

  it('offers the daily steps in thousands from 4,000 to 12,000', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    const steps = screen.getByRole('combobox', { name: 'Daily steps' });
    expect(steps).toHaveTextContent('6,000');

    // act
    await user.click(steps);

    // assert
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual([
      '4,000', '5,000', '6,000', '7,000', '8,000', '9,000', '10,000', '11,000', '12,000',
    ]);
  });

  it('prefills from her profile and creates the program', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Beginner');
    expect(screen.getByRole('combobox', { name: 'Program language' })).toHaveTextContent('English');
    expect(screen.getByRole('radio', { name: '3 days' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '60 min' })).toBeChecked();

    // act
    await user.click(screen.getByRole('button', { name: 'Create program' }));

    // assert
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });

  it('submits the form with Enter', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    screen.getByRole('button', { name: 'Create program' }).focus();

    // act
    await user.keyboard('{Enter}');

    // assert
    expect(await screen.findByText('Editor')).toBeInTheDocument();
  });

  it('changes a choice before creating the program', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(screen.getByRole('combobox', { name: 'Level' }));
    await user.click(screen.getByRole('option', { name: 'Advanced' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Advanced');
  });

  it('offers the two splits as a plain radio without descriptions', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=approved');

    // assert
    const split = screen.getByRole('radiogroup', { name: 'Split' });
    expect(within(split).getAllByRole('radio').map(radio => radio.textContent)).toEqual(['Full Body', 'Upper / Lower']);
    expect(within(split).getByRole('radio', { name: 'Full Body' })).toBeChecked();
  });

  it('follows the training days with the suggested split', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(screen.getByRole('radio', { name: '4 days' }));

    // assert
    expect(screen.getByRole('radio', { name: 'Upper / Lower' })).toBeChecked();
  });

  it('keeps the split the coach chose when the training days change', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    await user.click(screen.getByRole('radio', { name: 'Upper / Lower' }));

    // act
    await user.click(screen.getByRole('radio', { name: '2 days' }));

    // assert
    expect(screen.getByRole('radio', { name: 'Upper / Lower' })).toBeChecked();
  });

  it('prefills the equipment from her profile', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=approved');

    // assert
    expect(within(equipment()).getAllByRole('checkbox').map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Full gym',
      'Machines',
      'Barbell',
      'Dumbbells',
      'Kettlebells',
      'Resistance bands',
      'Bodyweight only',
    ]);
    expect(within(equipment()).getByRole('checkbox', { name: 'Full gym' })).toBeChecked();
    expect(within(equipment()).getByRole('checkbox', { name: 'Dumbbells' })).toBeChecked();
    expect(within(equipment()).getByRole('checkbox', { name: 'Kettlebells' })).not.toBeChecked();
  });

  it('keeps bodyweight only exclusive of every other chip', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(within(equipment()).getByRole('checkbox', { name: 'Bodyweight only' }));

    // assert
    expect(within(equipment()).getByRole('checkbox', { name: 'Bodyweight only' })).toBeChecked();
    expect(within(equipment()).getByRole('checkbox', { name: 'Full gym' })).not.toBeChecked();
    expect(within(equipment()).getByRole('checkbox', { name: 'Dumbbells' })).not.toBeChecked();

    // act
    await user.click(within(equipment()).getByRole('checkbox', { name: 'Kettlebells' }));

    // assert
    expect(within(equipment()).getByRole('checkbox', { name: 'Kettlebells' })).toBeChecked();
    expect(within(equipment()).getByRole('checkbox', { name: 'Bodyweight only' })).not.toBeChecked();
  });

  it('explains nothing under the fields', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=approved');

    // assert
    expect(screen.queryByText(/Suggested from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pick everything/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Every session trains the whole body/)).not.toBeInTheDocument();
  });

  it('requires at least one equipment option and keeps her profile untouched', async () => {
    // arrange
    const user = renderProfileThenSheet();
    await user.click(screen.getByRole('link', { name: 'open the program setup' }));
    await clearEquipment(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Create program' }));

    // assert
    expect(await screen.findByText('Choose at least one equipment option.')).toBeInTheDocument();
    expect(screen.queryByText('Editor')).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(screen.getByRole('link', { name: 'open her profile' }));
    const coaching = screen.getByRole('region', { name: 'Coaching' });
    expect(within(coaching).getByRole('checkbox', { name: 'Full gym' })).toBeChecked();
    expect(within(coaching).getByRole('checkbox', { name: 'Dumbbells' })).toBeChecked();
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

    // assert
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveTextContent('Intermediate');
    expect(screen.getByRole('radio', { name: '5+ days' })).toBeChecked();
  });

  it('saves the equipment chosen here on her profile', async () => {
    // arrange
    const user = renderProfileThenSheet();
    await user.click(screen.getByRole('link', { name: 'open the program setup' }));
    await user.click(within(equipment()).getByRole('checkbox', { name: 'Bodyweight only' }));

    // act
    await user.click(screen.getByRole('button', { name: 'Create program' }));

    // assert
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
    await screen.findByText('Editor', {}, { timeout: 3000 });
    await user.click(screen.getByRole('link', { name: 'open her profile' }));
    const coaching = screen.getByRole('region', { name: 'Coaching' });
    expect(within(coaching).getByRole('checkbox', { name: 'Bodyweight only' })).toBeChecked();
    expect(within(coaching).getByRole('checkbox', { name: 'Full gym' })).not.toBeChecked();
  });

  it('keeps the choices and says so when the program cannot be created', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved&pwrite=fails');
    await user.click(screen.getByRole('radio', { name: '4 days' }));

    // act
    await user.click(screen.getByRole('button', { name: 'Create program' }));

    // assert
    expect(await screen.findByRole('alert')).toHaveTextContent('The program wasn’t created. Your choices are still here, so try again.');
    expect(screen.queryByText('Editor')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '4 days' })).toBeChecked();
  });

  it('returns to the client page on cancel when nothing changed', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');

    // act
    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    // assert
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    await user.click(screen.getByRole('radio', { name: '4 days' }));

    // act
    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    // assert
    const dialog = screen.getByRole('dialog', { name: 'Unsaved changes' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Unsaved changes' })).not.toBeInTheDocument());
    expect(screen.getByRole('radio', { name: '4 days' })).toBeChecked();
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Unsaved changes' })).getByRole('button', { name: 'Discard' }));
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });

  it('asks before leaving through the link back to her with unsaved changes', async () => {
    // arrange
    const user = renderSheet('&pseed=none&jstage=approved');
    await user.click(screen.getByRole('radio', { name: '4 days' }));

    // act
    await user.click(screen.getByRole('link', { name: 'Jane Doe' }));

    // assert
    expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeInTheDocument();
    expect(screen.queryByText('Client page')).not.toBeInTheDocument();
  });

  it('shows no form until her answers are approved', () => {
    // arrange / act
    renderSheet('&pseed=none&jstage=reviewing');

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Program not ready yet' })).toBeInTheDocument();
    expect(screen.getByText('The program opens once her answers are approved.')).toBeInTheDocument();
    expect(document.title).toBe('Program not ready yet · Evoa');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(within(screen.getByRole('navigation', { name: 'Back to the client' })).getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/coach/clients/c1');
    expect(screen.queryByRole('button', { name: 'Create program' })).not.toBeInTheDocument();
  });

  it('opens the existing draft instead of setting up again', () => {
    // arrange / act
    renderSheet('&pseed=draft&jstage=approved');

    // assert
    expect(screen.getByText('Editor')).toBeInTheDocument();
  });
});
