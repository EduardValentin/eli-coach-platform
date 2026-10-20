import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { subDays } from 'date-fns';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ProgramEditorPage } from './ProgramEditorPage';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { ProgramProvider } from '../../context/ProgramContext';
import { TrainingProvider } from '../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') || query.includes('min-width'),
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
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderEditor(search: string, path = '/coach/clients/c1/program/draft') {
  const url = `${path}?session=coach${search}`;
  window.history.replaceState(null, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <UnitPreferencesProvider>
          <ClientProfileProvider>
            <TrainingProvider>
              <AssessmentCallProvider>
                <ClientJourneyProvider>
                  <ProgramProvider>
                    <Routes>
                      <Route path="/coach/clients/:id/program/draft" element={<ProgramEditorPage />} />
                      <Route path="/coach/clients/:id/program" element={<p>Program page</p>} />
                      <Route path="/coach/clients/:id" element={<p>Client page</p>} />
                    </Routes>
                  </ProgramProvider>
                </ClientJourneyProvider>
              </AssessmentCallProvider>
            </TrainingProvider>
          </ClientProfileProvider>
        </UnitPreferencesProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function planTable(): HTMLElement {
  return screen.getByRole('table', { name: 'Blocks' });
}

describe('ProgramEditorPage', () => {
  it('opens on the plan overview for version 1 with three suggested blocks', () => {
    // arrange
    const search = '&pseed=draft&jstage=approved';

    // act
    renderEditor(search);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: /v1 draft/ })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: 'Plan overview' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Plan overview' })).toBeInTheDocument();
    const rows = within(planTable()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole('combobox', { name: 'Type of block 1' })).toHaveTextContent('Foundation');
    expect(within(rows[1]).getByRole('combobox', { name: 'Type of block 2' })).toHaveTextContent('Hypertrophy');
    expect(within(rows[2]).getByRole('combobox', { name: 'Type of block 3' })).toHaveTextContent('Deload');
    expect(within(rail()).getByRole('button', { name: /^1 Foundation · 4 wk/ })).toBeInTheDocument();
  });

  it('selects a block from the rail and shows it as current', async () => {
    // arrange
    const user = renderEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy · 6 wk/ }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy · 6 wk/ })).toHaveAttribute('aria-current', 'true');
    expect(within(rail()).getByRole('button', { name: 'Plan overview' })).not.toHaveAttribute('aria-current');
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
    expect(within(main).getByRole('list', { name: 'Sessions' })).toBeInTheDocument();
  });

  it('refuses a block duration below the weeks already run', async () => {
    // arrange
    const realNow = new Date();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(subDays(realNow, 15));
    const user = renderEditor('&pseed=two-versions&jstage=program-ready');
    vi.useRealTimers();
    expect(within(rail()).getByRole('button', { name: /^1 Foundation · 4 wk/ })).toHaveAttribute('aria-current', 'true');
    await user.click(within(rail()).getByRole('button', { name: 'Plan overview' }));
    const weeks = within(planTable()).getByRole('spinbutton', { name: 'Weeks of block 1' });

    // act
    await user.clear(weeks);
    await user.type(weeks, '1');

    // assert
    expect(screen.getByText('This block has already run 2 weeks')).toBeInTheDocument();
    expect(weeks).toHaveValue(4);
    expect(within(rail()).getByRole('button', { name: /^1 Foundation · 4 wk/ })).toBeInTheDocument();
  });

  it('adds a block after the last one with the previous sessions', async () => {
    // arrange
    const user = renderEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(rail()).getByRole('button', { name: 'Add block' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a block' });
    expect(within(dialog).getByRole('combobox', { name: 'Type' })).toHaveTextContent('Hypertrophy');
    expect(within(dialog).getByRole('spinbutton', { name: 'Weeks' })).toHaveValue(4);
    await user.click(within(dialog).getByRole('button', { name: 'Add block' }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Add a block' })).not.toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^4 Hypertrophy · 4 wk/ })).toHaveAttribute('aria-current', 'true');
    await user.click(within(rail()).getByRole('button', { name: 'Plan overview' }));
    const rows = within(planTable()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    expect(within(rows[3]).getByText('3 of 3 filled')).toBeInTheDocument();
  });

  it('discards the draft after confirmation and returns to the program page', async () => {
    // arrange
    const user = renderEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    const dialog = screen.getByRole('dialog', { name: 'Discard this draft?' });
    expect(within(dialog).getByText('Everything you changed since version 2 is lost.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Discard draft' }));

    // assert
    expect(screen.getByText('Program page')).toBeInTheDocument();
  });

  it('discards a first draft and returns to the client page', async () => {
    // arrange
    const user = renderEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Discard this draft?' })).getByRole('button', { name: 'Discard draft' }),
    );

    // assert
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });
});
