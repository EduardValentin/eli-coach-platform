import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stubEditorBrowserApis, stubPhoneViewport } from '../../../../test/renderProgramEditor';
import { ClientProfilePage } from '../../../pages/coach-portal/ClientProfilePage';
import { ProgramEditorPage } from '../../../pages/coach-portal/ProgramEditorPage';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider, DEMO_JOURNEY_CALL_ID } from '../../../context/ClientJourneyContext';
import { ProgramProvider, usePrograms } from '../../../context/ProgramContext';
import { TrainingProvider } from '../../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../../context/UnitPreferencesContext';


function setStats(container: HTMLElement): string[] {
  const terms = within(container).getAllByRole('term');
  const values = within(container).getAllByRole('definition');
  return terms.map((term, index) => `${term.textContent} ${values[index].textContent}`);
}

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
  if (!screen.queryByRole('navigation', { name: 'Program sections' })) await user.click(screen.getByRole('button', { name: 'Program sections' }));
  await user.click(
    within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^1 Foundation\b/ }),
  );
  return user;
}

function renderEditorThenProfile() {
  const url = '/coach/clients/c1/program/draft?session=coach&jstage=approved&pseed=draft';
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
                    <Route path="/coach/clients/:id/program/draft" element={<ProgramEditorPage />} />
                    <Route path="/coach/clients/:id/profile" element={<ClientProfilePage />} />
                  </Routes>
                  <Link to="/coach/clients/c1/profile">open her profile</Link>
                  <Link to="/coach/clients/c1/program/draft">open the draft</Link>
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

async function openFirstBlockOfDraft(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^1 Foundation\b/ }),
  );
  expect(within(library()).getByRole('button', { name: 'Filters, 1 active' })).toBeInTheDocument();
}

function firstSession(): HTMLElement {
  return screen.getByRole('article', { name: 'Full Body A' });
}

function library(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Exercise library' });
}

function filtersPanel(): HTMLElement {
  return screen.getByRole('dialog', { name: 'Filters' });
}

async function showAllEquipment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(library()).getByRole('button', { name: /^Filters/ }));
  await user.click(within(filtersPanel()).getByRole('switch', { name: 'Only her equipment' }));
  await user.keyboard('{Escape}');
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
    await showAllEquipment(user);

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
    await showAllEquipment(user);

    // act
    await user.click(within(library()).getByRole('button', { name: 'Add Leg Press' }));

    // assert
    const card = within(firstSession()).getByRole('article', { name: 'A Leg Press' });
    expect(setStats(card)).toEqual(['Warm-up 2 sets', 'Working 3 sets × 12–15', 'RIR 3', 'Rest 1:15']);
    await user.click(within(card).getByRole('button', { name: 'Details for Leg Press' }));
    expect(within(within(card).getByRole('group', { name: 'Substitutions' })).getByRole('button', { name: /^Barbell Back Squat/ })).toBeInTheDocument();
  });

  it('hides archived exercises from the library but keeps an archived one on its card', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft&exseed=clash');

    // act
    await user.click(screen.getByRole('button', { name: 'Reference the archived hip thrust' }));
    await showAllEquipment(user);

    // assert
    expect(within(firstSession()).getByText('archived')).toBeInTheDocument();
    expect(within(library()).getAllByRole('button', { name: 'Add Barbell Hip Thrust' })).toHaveLength(1);
  });

  it('filters on the equipment in her profile, following a later profile edit', async () => {
    // arrange
    const user = renderEditorThenProfile();
    await openFirstBlockOfDraft(user);
    expect(within(library()).getByRole('button', { name: 'Add Barbell Back Squat' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'open her profile' }));
    const coaching = screen.getByRole('region', { name: 'Coaching' });
    await user.click(within(coaching).getByRole('checkbox', { name: 'Bodyweight only' }));
    await user.click(within(coaching).getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Changes saved', {}, { timeout: 3000 });

    // act
    await user.click(screen.getByRole('link', { name: 'open the draft' }));
    await openFirstBlockOfDraft(user);

    // assert
    expect(within(library()).queryByRole('button', { name: 'Add Barbell Back Squat' })).not.toBeInTheDocument();
    expect(within(library()).getAllByRole('button', { name: 'Add Push-Up' }).length).toBeGreaterThan(0);
  });

  it('suggests substitutions from the equipment in her profile, following a later profile edit', async () => {
    // arrange
    const user = renderEditorThenProfile();
    await user.click(screen.getByRole('link', { name: 'open her profile' }));
    const coaching = screen.getByRole('region', { name: 'Coaching' });
    await user.click(within(coaching).getByRole('checkbox', { name: 'Bodyweight only' }));
    await user.click(within(coaching).getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Changes saved', {}, { timeout: 3000 });
    await user.click(screen.getByRole('link', { name: 'open the draft' }));
    await openFirstBlockOfDraft(user);
    await clearFirstSession(user);
    await showAllEquipment(user);

    // act
    await user.click(within(library()).getByRole('button', { name: 'Add Leg Press' }));

    // assert
    const card = within(firstSession()).getByRole('article', { name: 'A Leg Press' });
    await user.click(within(card).getByRole('button', { name: 'Details for Leg Press' }));
    const substitutions = within(card).getByRole('group', { name: 'Substitutions' });
    expect(within(substitutions).getByRole('button', { name: /^Squat Jump/ })).toBeInTheDocument();
    expect(within(substitutions).queryByRole('button', { name: /^Barbell Back Squat/ })).not.toBeInTheDocument();
  });

  it('narrows the list by search', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await showAllEquipment(user);

    // act
    await user.type(within(library()).getByRole('searchbox', { name: 'Search exercises' }), 'LUNGE');

    // assert
    expect(within(library()).getByRole('button', { name: 'Add Walking Lunges' })).toBeInTheDocument();
    expect(within(library()).queryByRole('button', { name: 'Add Leg Press' })).not.toBeInTheDocument();
  });

  it('lists each filter that leaves nothing as a chip that removes only that filter', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await user.type(within(library()).getByRole('searchbox', { name: 'Search exercises' }), 'zzz');
    const filters = () => within(library()).getByRole('list', { name: 'Active filters' });
    expect(within(library()).getByText('No matches')).toBeInTheDocument();
    expect(within(filters()).getAllByRole('listitem').map(chip => chip.textContent)).toEqual(['Search: “zzz”', 'Only her equipment']);

    // act
    await user.click(within(filters()).getByRole('button', { name: 'Remove filter Only her equipment' }));

    // assert
    expect(within(library()).getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('zzz');
    expect(within(filters()).getAllByRole('listitem')).toHaveLength(1);
    expect(within(filters()).getByRole('button', { name: 'Remove filter Search: “zzz”' })).toHaveFocus();
  });

  it('clears every filter that leaves nothing at once', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await user.type(within(library()).getByRole('searchbox', { name: 'Search exercises' }), 'zzz');

    // act
    await user.click(within(library()).getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('');
    expect(within(library()).getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(within(library()).getByRole('button', { name: 'Add Barbell Back Squat' })).toBeInTheDocument();
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveFocus();
  });

  it('opens the filters panel from the Filters button and closes it on Escape, returning focus to the button', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    const filtersButton = within(library()).getByRole('button', { name: 'Filters, 1 active' });

    // act
    await user.click(filtersButton);

    // assert
    const panel = screen.getByRole('dialog', { name: 'Filters' });
    expect(within(panel).getByRole('switch', { name: 'Only her equipment' })).toBeChecked();
    expect(within(panel).getByRole('switch', { name: 'Bodyweight' })).not.toBeChecked();
    expect(within(panel).getByRole('button', { name: 'Pattern' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Muscle' })).toBeInTheDocument();

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
    await waitFor(() => expect(filtersButton).toHaveFocus());
  });

  it('counts the active filters on the Filters button, keeping focus in the panel as filters change', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await user.click(within(library()).getByRole('button', { name: 'Filters, 1 active' }));
    const bodyweight = within(filtersPanel()).getByRole('switch', { name: 'Bodyweight' });

    // act
    await user.click(bodyweight);

    // assert
    expect(within(library()).getByRole('button', { name: 'Filters, 2 active' })).toBeInTheDocument();
    expect(within(library()).queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument();
    expect(within(library()).queryByRole('button', { name: 'Add Barbell Back Squat' })).not.toBeInTheDocument();
    expect(within(library()).getAllByRole('button', { name: 'Add Push-Up' }).length).toBeGreaterThan(0);

    // act
    await user.click(bodyweight);

    // assert
    expect(within(library()).getByRole('button', { name: 'Filters, 1 active' })).toBeInTheDocument();
    expect(bodyweight).toHaveFocus();
    expect(filtersPanel()).toBeInTheDocument();
  });

  it('clears the panel filters from the panel, closing it onto the Filters button and keeping the search', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await user.type(within(library()).getByRole('searchbox', { name: 'Search exercises' }), 'squat');
    await user.click(within(library()).getByRole('button', { name: 'Filters, 1 active' }));
    await user.click(within(filtersPanel()).getByRole('switch', { name: 'Bodyweight' }));

    // act
    await user.click(within(filtersPanel()).getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
    const filtersButton = within(library()).getByRole('button', { name: 'Filters' });
    await waitFor(() => expect(filtersButton).toHaveFocus());
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('squat');
    await user.click(filtersButton);
    expect(within(filtersPanel()).getByRole('switch', { name: 'Only her equipment' })).not.toBeChecked();
    expect(within(filtersPanel()).getByRole('switch', { name: 'Bodyweight' })).not.toBeChecked();
  });

  it('shows the exercises of the type chosen in the Type dropdown', async () => {
    // arrange
    const user = await openFirstBlock('pseed=draft');
    await showAllEquipment(user);
    const typeSelect = within(library()).getByRole('combobox', { name: 'Exercise type' });
    expect(typeSelect).toHaveTextContent('Resistance');

    // act
    await user.click(typeSelect);
    await user.click(await screen.findByRole('option', { name: 'Cardio' }));

    // assert
    expect(typeSelect).toHaveTextContent('Cardio');
    expect(within(library()).getByRole('button', { name: 'Add Stationary bike' })).toBeInTheDocument();
    expect(within(library()).queryByRole('button', { name: 'Add Barbell Back Squat' })).not.toBeInTheDocument();
  });

  it('opens as a drawer on narrow screens and closes on Escape returning focus to the opener', async () => {
    // arrange
    stubPhoneViewport();
    const user = await openFirstBlock('pseed=draft');
    expect(screen.queryByRole('complementary', { name: 'Exercise library' })).not.toBeInTheDocument();
    const opener = within(firstSession()).getByRole('button', { name: 'Add exercise to warm-up' });

    // act
    await user.click(opener);

    // assert
    const drawer = screen.getByRole('dialog', { name: 'Exercise library' });
    expect(within(drawer).getByRole('searchbox', { name: 'Search exercises' })).toHaveFocus();
    expect(screen.queryByRole('main', { name: 'Program editor' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Exercise library' })).not.toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Program editor' })).toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('closes the drawer from its own close button, returning focus to the opener', async () => {
    // arrange
    stubPhoneViewport();
    const user = await openFirstBlock('pseed=draft');
    const opener = within(firstSession()).getByRole('button', { name: 'Add exercise to warm-up' });
    await user.click(opener);

    // act
    await user.click(within(screen.getByRole('dialog', { name: 'Exercise library' })).getByRole('button', { name: 'Close' }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Exercise library' })).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
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
