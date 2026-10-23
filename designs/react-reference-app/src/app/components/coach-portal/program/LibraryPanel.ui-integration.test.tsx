import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stubEditorBrowserApis, stubPhoneViewport } from '../../../../test/renderProgramEditor';
import { ProgramEditorPage } from '../../../pages/coach-portal/ProgramEditorPage';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider, DEMO_JOURNEY_CALL_ID } from '../../../context/ClientJourneyContext';
import { ProgramProvider, usePrograms } from '../../../context/ProgramContext';
import { TrainingProvider } from '../../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../../context/UnitPreferencesContext';

beforeEach(stubEditorBrowserApis);

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
        </UnitPreferencesProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(
    within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^1 Foundation 4 wk/ }),
  );
  return user;
}

function firstSession(): HTMLElement {
  return screen.getByRole('article', { name: 'Full Body A' });
}

function library(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Exercise library' });
}

async function clearFirstSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(firstSession()).getByRole('button', { name: 'Full Body A actions' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Clear session' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Clear Full Body A?' })).getByRole('button', { name: 'Clear session' }));
}

describe('LibraryPanel', () => {
  it('stays beside the editor on wide screens and collapses from the top bar', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    expect(library()).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Exercise library' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // act
    await user.click(toggle);

    // assert
    expect(screen.queryByRole('complementary', { name: 'Exercise library' })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('quick-adds without a target into the matching group of the open session', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await clearFirstSession(user);
    await user.click(within(library()).getByRole('switch', { name: 'Only her equipment' }));

    // act
    await user.click(within(library()).getByRole('button', { name: 'Add Barbell Back Squat' }));
    await user.click(within(library()).getByRole('button', { name: 'Add Lateral Raises' }));

    // assert
    expect(within(firstSession()).getByRole('article', { name: 'A Barbell Back Squat' })).toBeInTheDocument();
    expect(within(firstSession()).getByRole('article', { name: 'C Lateral Raises' })).toBeInTheDocument();
  });

  it('fills a new card with the block defaults and its substitutions', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await clearFirstSession(user);
    await user.click(within(library()).getByRole('switch', { name: 'Only her equipment' }));

    // act
    await user.click(within(library()).getByRole('button', { name: 'Add Leg Press' }));

    // assert
    const card = within(firstSession()).getByRole('article', { name: 'A Leg Press' });
    expect(within(card).getByText('2 warm-up · 3 × 12–15 · RIR 3')).toBeInTheDocument();
    expect(within(card).getByText('Rest 1:15')).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Details for Leg Press' }));
    expect(within(within(card).getByRole('group', { name: 'Substitutions' })).getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('hides archived exercises from the library but keeps an archived one on its card', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft&exseed=clash');

    // act
    await user.click(screen.getByRole('button', { name: 'Reference the archived hip thrust' }));
    await user.click(within(library()).getByRole('switch', { name: 'Only her equipment' }));

    // assert
    expect(within(firstSession()).getByText('archived')).toBeInTheDocument();
    expect(within(library()).getAllByRole('button', { name: 'Add Hip Thrust' })).toHaveLength(1);
  });

  it('narrows the list by search', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await user.click(within(library()).getByRole('switch', { name: 'Only her equipment' }));

    // act
    await user.type(within(library()).getByRole('searchbox', { name: 'Search exercises' }), 'LUNGE');

    // assert
    expect(within(library()).getByRole('button', { name: 'Add Walking Lunges' })).toBeInTheDocument();
    expect(within(library()).queryByRole('button', { name: 'Add Leg Press' })).not.toBeInTheDocument();
  });

  it('opens as a drawer on narrow screens and closes on Escape returning focus to the opener', async () => {
    // arrange
    stubPhoneViewport();
    const user = await openFirstBlock('pseed=draft');
    expect(screen.queryByRole('complementary', { name: 'Exercise library' })).not.toBeInTheDocument();
    const opener = within(firstSession()).getByRole('button', { name: 'Add warm-up exercise' });

    // act
    await user.click(opener);

    // assert
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveFocus();
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
    await user.click(screen.getByRole('button', { name: 'Block actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copy from another client…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Copy from another client' });
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
    await user.click(screen.getByRole('button', { name: 'Block actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copy from another client…' }));

    // assert
    expect(within(await screen.findByRole('dialog', { name: 'Copy from another client' })).getByText('No other client has a program yet.')).toBeInTheDocument();
  });
});
