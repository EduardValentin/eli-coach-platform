import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgramEditorPage } from '../../../pages/coach-portal/ProgramEditorPage';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider, DEMO_JOURNEY_CALL_ID } from '../../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../../context/ClientProfileContext';
import { ProgramProvider, usePrograms } from '../../../context/ProgramContext';
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

function ArchivedRowProbe() {
  const { updateDraft } = usePrograms();
  return (
    <button
      type="button"
      onClick={() =>
        updateDraft(DEMO_JOURNEY_CALL_ID, content => {
          const [first, ...rest] = content.plan.blocks;
          const [session, ...sessions] = first.sessions;
          const [row, ...rows] = session.rows;
          return {
            ...content,
            plan: { blocks: [{ ...first, sessions: [{ ...session, rows: [{ ...row, exerciseId: 'e18' }, ...rows] }, ...sessions] }, ...rest] },
          };
        })
      }
    >
      Reference the archived hip thrust
    </button>
  );
}

async function openFirstBlock(search: string) {
  const url = `/coach/clients/c1/program/draft?session=coach&jstage=approved&${search}`;
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
                    <ArchivedRowProbe />
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
  await user.click(
    within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^1 Foundation · 4 wk/ }),
  );
  return user;
}

function firstSession(): HTMLElement {
  return screen.getByRole('table', { name: 'Full Body A exercises' });
}

function drawer(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Exercise library' });
}

describe('LibraryDrawer', () => {
  it('fills a row from the drawer with the block defaults and its substitution', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await user.click(screen.getAllByRole('button', { name: 'Add exercise' })[0]);
    await user.click(within(drawer()).getByRole('switch', { name: 'Only her equipment' }));

    // act
    const pick = within(drawer()).getByRole('button', { name: 'Leg Press · Squat · Machine' });
    expect(within(pick.closest('li') as HTMLElement).getByText('Role Secondary compound in slot C')).toBeInTheDocument();
    await user.click(pick);

    // assert
    expect(screen.queryByRole('complementary', { name: 'Exercise library' })).not.toBeInTheDocument();
    expect(within(firstSession()).queryByRole('button', { name: 'Choose an exercise' })).not.toBeInTheDocument();
    await user.click(within(firstSession()).getByRole('button', { name: 'Show details for Leg Press' }));
    const substitutions = screen.getByRole('group', { name: /Leg Press/ });
    expect(within(substitutions).getByText('Barbell Back Squat')).toBeInTheDocument();
    const rest = within(firstSession()).getByRole('textbox', { name: 'Rest for C Leg Press' });
    expect(rest).toHaveValue('1:15');
    expect(within(rest.closest('tr') as HTMLElement).getByText('3 × 12–15 · RIR 3')).toBeInTheDocument();
  });

  it('hides archived exercises from the drawer but keeps an archived one on its row', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft&exseed=clash');
    await user.click(screen.getByRole('button', { name: 'Reference the archived hip thrust' }));
    expect(within(firstSession()).getByText('archived')).toBeInTheDocument();

    // act
    await user.click(within(firstSession()).getByRole('button', { name: /^Hip Thrust/ }));
    await user.click(within(drawer()).getByRole('switch', { name: 'Only her equipment' }));

    // assert
    expect(within(drawer()).getAllByRole('button', { name: /^Hip Thrust · / })).toHaveLength(1);
    expect(within(firstSession()).getByText('archived')).toBeInTheDocument();
  });

  it('narrows the list by search and closes on Escape returning focus to the opener', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    const opener = screen.getAllByRole('button', { name: 'Add exercise' })[0];
    await user.click(opener);
    await user.click(within(drawer()).getByRole('switch', { name: 'Only her equipment' }));

    // act
    await user.type(within(drawer()).getByRole('searchbox', { name: 'Search exercises' }), 'LUNGE');

    // assert
    expect(within(drawer()).getByRole('button', { name: 'Walking Lunges · Lunge · Dumbbells' })).toBeInTheDocument();
    expect(within(drawer()).queryByRole('button', { name: /^Leg Press/ })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Exercise library' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('CopyBlockDialog', () => {
  it('copies a block from another client', async () => {
    // arrange
    const user = await openFirstBlock('pseed=two-versions');
    await user.clear(screen.getByRole('textbox', { name: 'Session name' }));
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), 'Mine');
    await user.click(screen.getByRole('button', { name: 'Copy from another client' }));
    const dialog = screen.getByRole('dialog', { name: 'Copy from another client' });
    expect(within(dialog).getByRole('combobox', { name: 'Client' })).toHaveTextContent('Andreea Popescu');
    expect(within(dialog).getByRole('combobox', { name: 'Version' })).toHaveTextContent('Version 1 · published');
    expect(within(dialog).getByRole('combobox', { name: 'Block' })).toHaveTextContent('1. Foundation · 4 weeks');

    // act
    await user.click(within(dialog).getByRole('button', { name: 'Copy sessions' }));
    await user.click(within(screen.getByRole('dialog', { name: "Replace this block's sessions?" })).getByRole('button', { name: 'Replace sessions' }));

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('Full Body A');
    expect(firstSession()).toBeInTheDocument();
  });

  it('says so when no other client has a program', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');

    // act
    await user.click(screen.getByRole('button', { name: 'Copy from another client' }));

    // assert
    expect(within(screen.getByRole('dialog', { name: 'Copy from another client' })).getByText('No other client has a program yet.')).toBeInTheDocument();
  });
});
