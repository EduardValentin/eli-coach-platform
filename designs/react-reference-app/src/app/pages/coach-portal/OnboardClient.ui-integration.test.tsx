import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserEvent } from '@testing-library/user-event';
import { OnboardClient } from './OnboardClient';
import { AppProvider } from '../../context/AppContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';

// The dev-toggle outcome is read from the real address bar rather than from the
// router, so the query string has to be on `window.location` before rendering.
function renderWizard(search = '') {
  window.history.replaceState({}, '', `/coach/onboard${search}`);
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[`/coach/onboard${search}`]}>
      <AppProvider>
        <UnitPreferencesProvider>
          <OnboardClient />
        </UnitPreferencesProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return user;
}

const continueButton = () => screen.getByRole('button', { name: 'Continue' });

// Age is a real input from outside the process, so the suite names the day
// rather than inheriting whatever date it happens to run on.
const TODAY = new Date('2026-09-01T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

// Date of birth uses the app's shared BrandCalendar, not a native date input.
// The picker is bounded to the ages the step accepts and opens on its youngest
// allowed year, so clicking a day in the month it opens on is a valid birth
// date — here 15 January 2010, a client who has just turned sixteen.
async function pickDateOfBirth(user: UserEvent) {
  await user.click(screen.getByLabelText('Date of birth'));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByText('15'));
  await user.keyboard('{Escape}');
}

async function completeBasics(user: UserEvent) {
  await user.type(screen.getByLabelText('First name'), 'Jane');
  await user.type(screen.getByLabelText('Last name'), 'Doe');
  await user.type(screen.getByLabelText('Email address'), 'jane@example.com');
  await pickDateOfBirth(user);
  await user.click(continueButton());
}

// Steps cross-fade, so the next step's first field is only in the DOM once the
// outgoing one has left.
async function completeMeasurements(user: UserEvent) {
  await user.type(await screen.findByLabelText('Height (cm)'), '165');
  await user.type(screen.getByLabelText('Weight (kg)'), '65');
  await user.selectOptions(
    screen.getByLabelText('Activity level'),
    'moderately-active',
  );
  await user.click(continueButton());
}

// Steps 1-4, stopping on the nutrition step with the goal already chosen.
async function completeThroughGoal(user: UserEvent, goal = 'Fat Loss') {
  await completeBasics(user);
  await completeMeasurements(user);
  await screen.findByLabelText('Allergies, intolerances and preferences');
  await user.click(continueButton()); // dietary restrictions are optional
  await user.selectOptions(await screen.findByLabelText('Goal type'), goal);
  await user.click(continueButton());
  await screen.findByLabelText('Target weight');
}

// The nutrition step opens at maintenance; a target weight is what unlocks the
// rate slider, because the rate has no meaning without somewhere to arrive.
async function enterTargetWeight(user: UserEvent, kg: string) {
  await user.type(screen.getByLabelText('Target weight'), kg);
}

async function completeThroughReview(user: UserEvent) {
  await completeThroughGoal(user);
  await enterTargetWeight(user, '60');
  await user.click(continueButton());
  // The footer button is outside the animated region, so it appears before the
  // review content does. Wait for the summary itself.
  await screen.findByRole('list', { name: 'Onboarding summary' });
}

describe('the coach onboarding wizard', () => {
  it('refuses to advance past incomplete basics and names each missing field', async () => {
    // arrange
    const user = renderWizard();

    // act
    await user.click(continueButton());

    // assert — still on step 1, with a message per required field
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByText('First name is required.')).toBeInTheDocument();
    expect(screen.getByText('Last name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByText('Date of birth is required.')).toBeInTheDocument();
  });

  it('explains the sex field through a focusable info affordance', async () => {
    // arrange
    const user = renderWizard();

    // act
    const info = screen.getByRole('button', { name: 'Why we ask for sex' });
    await user.hover(info);

    // assert — reachable by keyboard and screen reader, not hover alone
    expect(info).toBeInTheDocument();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      /Mifflin-St Jeor formula uses this selection to calculate the BMR/,
    );
  });

  it('rejects an email that is not an address', async () => {
    // arrange
    const user = renderWizard();

    // act
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.type(screen.getByLabelText('Email address'), 'jane-at-example');
    await pickDateOfBirth(user);
    await user.click(continueButton());

    // assert
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
  });

  it('accepts a client who has just reached the youngest age coached', async () => {
    // arrange
    const user = renderWizard();

    // act — the picker opens on its youngest allowed year, so an out-of-range
    // birth date cannot be chosen at all
    await completeBasics(user);

    // assert
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
  });

  it('advances once the basics are valid', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeBasics(user);

    // assert
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Fitness & Measurements' }),
    ).toBeInTheDocument();
  });

  it('blocks the measurements step until height and weight are plausible', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeBasics(user);
    await user.type(await screen.findByLabelText('Height (cm)'), '40');
    await user.type(screen.getByLabelText('Weight (kg)'), '5');
    await user.click(continueButton());

    // assert
    expect(
      screen.getByText('Height must be between 100 and 250 cm.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Weight must be between 30 and 300 kg.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
  });

  it('shows the basal rate and estimated expenditure calculated from her measurements', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user);

    // assert — female constant: (10*65) + (6.25*165) - (5*16) - 161, then *1.55
    const summary = await screen.findByRole('status');
    expect(within(summary).getByText('1,440 kcal')).toBeInTheDocument();
    expect(within(summary).getByText('2,232 kcal')).toBeInTheDocument();
  });

  it('recalculates using the male constant when the coach selects male', async () => {
    // arrange
    const user = renderWizard();

    // act
    await user.type(screen.getByLabelText('First name'), 'Alex');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com');
    await pickDateOfBirth(user);
    await user.click(screen.getByRole('radio', { name: 'Male' }));
    await user.click(continueButton());
    await completeMeasurements(user);
    await screen.findByLabelText('Allergies, intolerances and preferences');
    await user.click(continueButton());
    await user.selectOptions(await screen.findByLabelText('Goal type'), 'Fat Loss');
    await user.click(continueButton());
    await screen.findByLabelText('Target weight');

    // assert — same measurements, +5 instead of -161
    const summary = await screen.findByRole('status');
    expect(within(summary).getByText('1,606 kcal')).toBeInTheDocument();
  });

  it('requires a goal type before the review step', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeBasics(user);
    await completeMeasurements(user);
    await screen.findByLabelText('Allergies, intolerances and preferences');
    await user.click(continueButton());
    await screen.findByLabelText('Goal type');
    await user.click(continueButton());

    // assert
    expect(screen.getByText('Goal type is required.')).toBeInTheDocument();
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
  });

  it('opens the nutrition step at maintenance with the goal\'s split', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user, 'Fat Loss');

    // assert - 0.5% of 65 kg floors to 0.30 kg/wk, a 330 kcal deficit off 2232
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.3');
    expect(
      within(screen.getByRole('status')).getByText('1,902 kcal'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Protein')).toHaveValue(35);
    expect(screen.getByLabelText('Carbs')).toHaveValue(35);
    expect(screen.getByLabelText('Fats')).toHaveValue(30);
  });

  it('refuses a target weight above current when the goal only loses', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user, 'Fat Loss');
    await enterTargetWeight(user, '70');
    await user.click(continueButton());

    // assert
    expect(
      screen.getByText('This goal cannot raise the weight above the current 65 kg.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
  });

  it('holds maintenance and recomposition to the same ceiling', async () => {
    // arrange & act & assert - both may hold or drift down, never rise
    for (const goal of ['Maintenance', 'Recomposition']) {
      const user = renderWizard();
      await completeThroughGoal(user, goal);
      await enterTargetWeight(user, '70');
      await user.click(continueButton());
      expect(
        screen.getByText('This goal cannot raise the weight above the current 65 kg.'),
      ).toBeInTheDocument();
      cleanup();
    }
  });

  it('refuses a target weight below current when the goal only gains', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user, 'Muscle Building');
    await enterTargetWeight(user, '60');
    await user.click(continueButton());

    // assert
    expect(
      screen.getByText('This goal cannot lower the weight below the current 65 kg.'),
    ).toBeInTheDocument();
  });

  it('lets a custom goal move in either direction', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user, 'Custom');
    await enterTargetWeight(user, '70');
    await user.click(continueButton());

    // assert - no complaint, so the step advanced
    expect(screen.getByText('Step 6 of 6')).toBeInTheDocument();
  });

  it('turns the chosen rate into a budget and an arrival date', async () => {
    // arrange
    const user = renderWizard();
    await completeThroughGoal(user, 'Fat Loss');
    await enterTargetWeight(user, '60');
    const slider = screen.getByRole('slider');

    // act - opens on 0.30, and each step is 0.05, so four steps reach 0.50
    slider.focus();
    for (let step = 0; step < 4; step += 1) {
      await user.keyboard('{ArrowRight}');
    }

    // assert - 0.5 kg/wk is a 550 kcal deficit, and 5 kg takes ten weeks
    expect(
      within(screen.getByRole('status')).getByText('1,682 kcal'),
    ).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.5');
    expect(screen.getByText('0.77% bodyweight')).toBeInTheDocument();
    expect(screen.getByText('10 Nov 2026')).toBeInTheDocument();
  });

  it('caps the rate where the deficit would reach the basal rate', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user, 'Fat Loss');
    await enterTargetWeight(user, '60');

    // assert - 1.5% of 65 kg, the ceiling, sits past the 0.72 caution point so
    // the coach can still be warned rather than silently stopped
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '0.97');
  });

  it('warns when the pace drives the budget under the basal rate', async () => {
    // arrange
    const user = renderWizard();
    await completeThroughGoal(user, 'Fat Loss');
    await enterTargetWeight(user, '60');

    // act - all the way to the ceiling
    screen.getByRole('slider').focus();
    await user.keyboard('{End}');

    // assert - allowed, but never silent
    expect(
      screen.getByText(/under her basal rate of 1,440 kcal/),
    ).toBeInTheDocument();
  });

  it('shows what each macro share works out to in grams and calories', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user);
    await enterTargetWeight(user, '60');

    // assert - at the 1902 kcal opening budget, 30% of it is 571 kcal of fat,
    // which is 63 g at 9 kcal per gram
    expect(screen.getByText('63 g \u00b7 571 kcal')).toBeInTheDocument();
    expect(screen.getByText('100% \u00b7 1,902 kcal')).toBeInTheDocument();
  });

  it('refuses a macro split that does not add up to a hundred percent', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughGoal(user);
    await enterTargetWeight(user, '60');
    const protein = screen.getByLabelText('Protein');
    await user.clear(protein);
    await user.type(protein, '50');
    await user.click(continueButton());

    // assert
    expect(
      screen.getByText(
        'The split must add up to 100%. It currently adds up to 115%.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
  });

  it('reviews everything the coach entered before sending', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughReview(user);

    // assert
    expect(screen.getByText('Step 6 of 6')).toBeInTheDocument();
    const review = screen.getByRole('list', { name: 'Onboarding summary' });
    expect(within(review).getByText('Jane')).toBeInTheDocument();
    expect(within(review).getByText('Doe')).toBeInTheDocument();
    expect(within(review).getByText('jane@example.com')).toBeInTheDocument();
    expect(within(review).getByText('Fat Loss')).toBeInTheDocument();
    expect(within(review).getByText('165 cm')).toBeInTheDocument();
  });

  it('confirms the invitation once it is sent', async () => {
    // arrange
    const user = renderWizard();

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    // assert
    expect(
      await screen.findByRole('heading', { name: 'Invitation sent' }),
    ).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('says the earlier link stopped working when an invitation was replaced', async () => {
    // arrange
    const user = renderWizard('?invite=replaced-invitation');

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    // assert
    expect(
      await screen.findByText('The earlier invitation link no longer works.'),
    ).toBeInTheDocument();
  });

  it('keeps the coach on the review step when the email already belongs to a client', async () => {
    // arrange
    const user = renderWizard('?invite=already-client');

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    // assert — nothing was stored, so there is nothing to retry
    const failure = await screen.findByRole('alert');
    expect(failure).toHaveTextContent(
      'That email already belongs to one of your clients, so nothing was saved.',
    );
    expect(screen.getByText('Step 6 of 6')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try sending again' }),
    ).not.toBeInTheDocument();
  });

  it('offers another send when delivery fails, because the record survived', async () => {
    // arrange
    const user = renderWizard('?invite=delivery-failure');

    // act
    await completeThroughReview(user);
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    // assert
    const failure = await screen.findByRole('alert');
    expect(failure).toHaveTextContent(
      'The profile and invitation were saved, but the email could not be sent.',
    );
    expect(
      screen.getByRole('button', { name: 'Try sending again' }),
    ).toBeInTheDocument();
  });
});
