import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgramEditorPage } from '../../../pages/coach-portal/ProgramEditorPage';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../../context/ClientProfileContext';
import { ProgramProvider } from '../../../context/ProgramContext';
import { TrainingProvider } from '../../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../../context/UnitPreferencesContext';

function stubViewport(desktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') || (desktop && query.includes('min-width')),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  stubViewport(true);
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

async function openFirstBlock() {
  const url = '/coach/clients/c1/program/draft?session=coach&pseed=draft&jstage=approved';
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
  const user = userEvent.setup();
  await user.click(within(rail()).getByRole('button', { name: /^1 Foundation 4 wk/ }));
  return user;
}

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function firstSession(): HTMLElement {
  return screen.getByRole('table', { name: 'Full Body A exercises' });
}

function positions(): string[] {
  return within(firstSession())
    .getAllByRole('rowheader')
    .map(header => header.textContent ?? '');
}

function rowAt(position: string): HTMLElement {
  return within(firstSession()).getByRole('rowheader', { name: position }).closest('tr') as HTMLElement;
}

async function choose(user: ReturnType<typeof userEvent.setup>, combobox: HTMLElement, option: string) {
  await user.click(combobox);
  await user.click(screen.getByRole('option', { name: option }));
}

async function retype(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, text: string) {
  await user.clear(field);
  await user.type(field, text);
}

describe('BlockWorkspace', () => {
  it('changing the block type refills untouched values and keeps a typed one', async () => {
    // arrange
    const user = await openFirstBlock();
    await retype(user, within(firstSession()).getByRole('textbox', { name: /^Rest for A / }), '3:00');

    // act
    await choose(user, screen.getByRole('combobox', { name: 'Block type' }), 'Hypertrophy');

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
    expect(within(rowAt('A')).getByText('4 × 6–10 · RIR 1–2')).toBeInTheDocument();
    expect(within(firstSession()).getByRole('textbox', { name: /^Rest for A / })).toHaveValue('3:00');
    expect(within(rowAt('B')).getByText('3 × 8–12 /side · RIR 1–2')).toBeInTheDocument();
    expect(within(firstSession()).getByRole('textbox', { name: /^Rest for B / })).toHaveValue('1:45');
  });

  it('renames the split without touching its text', async () => {
    // arrange
    const user = await openFirstBlock();
    const name = screen.getByRole('textbox', { name: 'Split name' });
    expect(name).toHaveAttribute('placeholder', 'Full body');

    // act
    await user.type(name, 'Strength split');

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Split shape' })).toHaveTextContent('Full body');
    expect(firstSession()).toBeInTheDocument();
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));
    const rows = within(within(screen.getByRole('main')).getByRole('list', { name: 'Blocks' })).getAllByRole('listitem');
    expect(within(rows[0]).getByText('Strength split')).toBeInTheDocument();
  });

  it('rebuilds the sessions from a new split shape after confirmation', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await choose(user, screen.getByRole('combobox', { name: 'Split shape' }), 'Upper / lower');
    const dialog = screen.getByRole('dialog', { name: 'Replace the sessions?' });
    expect(within(dialog).getByText('Every session of this block is rebuilt from the Upper / lower shape.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Replace sessions' }));

    // assert
    const lowerA = screen.getByRole('table', { name: 'Lower A exercises' });
    expect(screen.getByRole('button', { name: /^Upper A/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Monday' })).toHaveTextContent('Lower A');
    expect(within(lowerA).queryAllByRole('rowheader')).toHaveLength(0);
  });

  it('places a session on a weekday', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(screen.getByRole('combobox', { name: 'Monday' })).toHaveTextContent('Full Body A');
    expect(screen.getByRole('combobox', { name: 'Tuesday' })).toHaveTextContent('LISS 30 min');

    // act
    await choose(user, screen.getByRole('combobox', { name: 'Saturday' }), 'Full Body A');

    // assert
    expect(screen.getByRole('combobox', { name: 'Saturday' })).toHaveTextContent('Full Body A');
    expect(screen.getByRole('combobox', { name: 'Monday' })).toHaveTextContent('Rest');
  });

  it('shows the estimated minutes against the target', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(screen.getByText('~34 min / 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Full Body B.*5 exercises · ~34 min/ })).toHaveAttribute('aria-expanded', 'false');

    // act
    await choose(user, screen.getByRole('combobox', { name: 'Target minutes' }), '30 min');
    await retype(user, within(firstSession()).getByRole('textbox', { name: /^Rest for A / }), '5:00');
    await user.tab();

    // assert
    expect(screen.getByText('~46 min / 30')).toBeInTheDocument();
    expect(screen.getByText('Over target')).toBeInTheDocument();
  });

  it('seeds the accessories as a superset that can be split and grouped again', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(positions()).toEqual(['A', 'B', 'C1', 'C2', 'D']);
    await user.click(within(firstSession()).getAllByRole('button', { name: /^Show details for / })[2]);
    expect(screen.getByRole('group', { name: /^C1 / })).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Split superset' }));

    // assert
    expect(positions()).toEqual(['A', 'B', 'C', 'C', 'D']);
    await user.click(screen.getByRole('button', { name: 'Superset with next' }));
    expect(positions()).toEqual(['A', 'B', 'C1', 'C2', 'D']);
  });

  it('reset to block defaults clears a typed value', async () => {
    // arrange
    const user = await openFirstBlock();
    await retype(user, within(firstSession()).getByRole('textbox', { name: /^Rest for A / }), '3:00');
    await user.tab();
    await user.click(within(firstSession()).getAllByRole('button', { name: /^Show details for / })[0]);

    // act
    await user.click(screen.getByRole('button', { name: 'Reset to block defaults' }));

    // assert
    expect(within(firstSession()).getByRole('textbox', { name: /^Rest for A / })).toHaveValue('1:15');
  });

  it('keeps the previous rest when the typed text is not a duration', async () => {
    // arrange
    const user = await openFirstBlock();
    const rest = within(firstSession()).getByRole('textbox', { name: /^Rest for A / });

    // act
    await retype(user, rest, 'lots');
    await user.tab();

    // assert
    expect(screen.getByText('Use seconds or m:ss like 1:30')).toBeInTheDocument();
    await choose(user, screen.getByRole('combobox', { name: 'Block type' }), 'Hypertrophy');
    expect(within(firstSession()).getByRole('textbox', { name: /^Rest for A / })).toHaveValue('2:30');
  });

  it('adds an exercise row waiting for a choice', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));

    // assert
    expect(positions()).toEqual(['A', 'B', 'C1', 'C2', 'C', 'D']);
    expect(within(firstSession()).getByRole('button', { name: 'Choose an exercise' })).toBeInTheDocument();
  });

  it('expands one session at a time', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('button', { name: /^Full Body B/ }));

    // assert
    expect(screen.getByRole('table', { name: 'Full Body B exercises' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Full Body A exercises' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Full Body A/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders rows as cards at phone width', async () => {
    // arrange
    stubViewport(false);

    // act
    await openFirstBlock();

    // assert
    expect(screen.queryByRole('table', { name: 'Full Body A exercises' })).not.toBeInTheDocument();
    const cards = within(screen.getByRole('list', { name: 'Full Body A exercises' })).getAllByRole('article');
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByRole('heading', { level: 4, name: /^A / })).toBeInTheDocument();
    expect(within(cards[0]).getByText('3 × 12–15 · RIR 3')).toBeInTheDocument();
  });
});
