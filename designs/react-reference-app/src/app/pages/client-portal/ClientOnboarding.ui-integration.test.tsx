import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientOnboarding } from './ClientOnboarding';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  DEMO_JOURNEY_CALL_ID,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import {
  emptyOnboardingDraft,
  type OnboardingConsents,
  type OnboardingDraft,
} from '../../domain/journey';
import { loadDraft, saveDraft } from '../../services/onboardingService';

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
});

function StageProbe() {
  const { demoJourney } = useClientJourneys();

  return <span data-testid="stage">{demoJourney.stage}</span>;
}

function renderOnboarding(devParams: string) {
  const url = `/portal/onboarding${devParams}`;
  window.history.replaceState({}, '', url);

  return render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <UnitPreferencesProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <StageProbe />
                <Routes>
                  <Route element={<ClientOnboarding />} path="/portal/onboarding" />
                  <Route element={<p>portal home</p>} path="/portal" />
                </Routes>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </UnitPreferencesProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

const GIVEN_CONSENTS: OnboardingConsents = {
  disclaimer: true,
  specialCategory: true,
  progressPhotos: false,
};

const WITHHELD_CONSENTS: OnboardingConsents = {
  disclaimer: false,
  specialCategory: false,
  progressPhotos: false,
};

function draftAt(
  currentFormIndex: number,
  consents: OnboardingConsents = GIVEN_CONSENTS,
): OnboardingDraft {
  const draft = emptyOnboardingDraft();

  return {
    ...draft,
    currentFormIndex,
    consents,
    answers: {
      ...draft.answers,
      'goal-availability': { weight: 66.1, height: 165 },
      measurements: { waist: 74 },
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('the onboarding', () => {
  it('opens the first form straight away, with no consent screen in front of it', () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    const heading = screen.getByRole('heading', { level: 2 });

    // assert
    expect(heading).toHaveTextContent('Your goal and your week');
    expect(screen.getByText('Step 1 of 5')).toBeVisible();
  });

  it('asks for the health-data consent on the safety form and holds her there without it', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(1, WITHHELD_CONSENTS));
    renderOnboarding('?session=client&jstage=onboarding');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // assert
    expect(screen.getByText('Tick the box to carry on.')).toBeVisible();
    expect(screen.getByText('Step 2 of 5')).toBeVisible();
  });

  it('asks for the disclaimer on the last form and refuses to send without it', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(4, WITHHELD_CONSENTS));
    renderOnboarding('?session=client&jstage=onboarding');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Send to my coach' }));

    // assert
    expect(screen.getByText('Tick the box to carry on.')).toBeVisible();
    expect(screen.getByTestId('stage')).toHaveTextContent('onboarding');
  });

  it('offers a two-option choice as radio buttons, not a dropdown', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(3));
    renderOnboarding('?session=client&jstage=onboarding');

    // act
    const group = screen.getByRole('radiogroup', {
      name: /Where you want to hear from me/,
    });

    // assert
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    expect(within(group).getByRole('radio', { name: 'Email' })).toBeVisible();
    expect(within(group).getByRole('radio', { name: 'WhatsApp' })).toBeVisible();
  });

  it('asks how much she drinks as a number', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(3));
    renderOnboarding('?session=client&jstage=onboarding');

    // act
    const water = screen.getByLabelText(/Water a day/);

    // assert
    expect(water).toHaveAttribute('type', 'number');
    expect(water).toHaveAttribute('max', '10');
    expect(screen.getByLabelText(/Coffee a day/)).toHaveAttribute(
      'type',
      'number',
    );
    expect(screen.getByLabelText(/Meals a day that suit you/)).toHaveAttribute(
      'type',
      'number',
    );
  });

  it('offers a choice of more than two options as a select', () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    const control = screen.getByRole('combobox', { name: /Where you train/ });

    // assert
    expect(control).toBeVisible();
  });

  it('asks for every number as a number, bounded by the range the schema sets', () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    const weight = screen.getByLabelText(/Your weight/);

    // assert
    expect(weight).toHaveAttribute('type', 'number');
    expect(weight).toHaveAttribute('inputmode', 'decimal');
    expect(weight).toHaveAttribute('min', '30');
    expect(weight).toHaveAttribute('max', '300');
    expect(screen.getByLabelText(/Training days a week/)).toHaveAttribute(
      'inputmode',
      'numeric',
    );
  });

  it('turns down a weight outside the sensible range', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    await userEvent.type(screen.getByLabelText(/Your weight/), '500');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // assert
    expect(
      screen.getByText('Enter a weight between 30 and 300 kg.'),
    ).toBeVisible();
  });

  it('keeps a goal weight within reach of the weight she has now', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    await userEvent.type(screen.getByLabelText(/Your weight/), '66');
    await userEvent.type(screen.getByLabelText(/Goal weight/), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // assert
    expect(
      screen.getByText('Keep your goal within 60 kg of your current weight.'),
    ).toBeVisible();
  });

  it('asks for the measurements without repeating the weight from the first form', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(4));

    // act
    renderOnboarding('?session=client&jstage=onboarding');

    // assert
    expect(screen.getByLabelText(/Waist/)).toBeVisible();
    expect(screen.queryByLabelText(/Weight/)).not.toBeInTheDocument();
  });

  it('holds the progress photos shut until she agrees to share them', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(4));

    // act
    renderOnboarding('?session=client&jstage=onboarding');

    // assert
    expect(screen.getByLabelText('Front Add photo')).toBeDisabled();
    expect(screen.getByText('Tick the box to add your photos.')).toBeVisible();
  });

  it('holds her on a form until the required answers are there', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=onboarding');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your cycle and hormonal context' }),
    ).toBeVisible();
    expect(screen.getAllByText('Choose one option.').length).toBeGreaterThan(0);
    expect(screen.getByText('Enter a number.')).toBeVisible();
  });

  it('marks the answers she can skip as optional', () => {
    // arrange
    renderOnboarding('?session=client&jstage=onboarding');

    // act
    const optional = screen.getAllByText('(optional)');

    // assert
    expect(optional.length).toBeGreaterThan(0);
  });

  it('counts four forms and leaves out the cycle for a male account', () => {
    // arrange
    renderOnboarding('?session=client&jstage=onboarding&jsex=male');

    // act
    const heading = screen.getByRole('heading', { level: 2 });

    // assert
    expect(screen.getByText('Step 3 of 4')).toBeVisible();
    expect(heading).toHaveTextContent('Food and daily life');
  });

  it('saves her answers quietly as she types', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    await userEvent.type(screen.getByLabelText(/Your weight/), '66');

    // assert
    expect(await screen.findByText('Saving…')).toBeVisible();
    expect(
      await screen.findByText('Saved', undefined, { timeout: SERVICE_TIMEOUT }),
    ).toBeVisible();
  });

  it('resumes at the form she left', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(3));

    // act
    renderOnboarding('?session=client&jstage=onboarding');

    // assert
    expect(screen.getByText('Step 4 of 5')).toBeVisible();
    expect(screen.getByText('Picking up where you left off.')).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Food and daily life' }),
    ).toBeVisible();
  });

  it('sends the last form to her coach and closes the onboarding', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(4));
    renderOnboarding('?session=client&jstage=onboarding');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Send to my coach' }));

    // assert
    expect(
      await screen.findByText('portal home', undefined, { timeout: SERVICE_TIMEOUT }),
    ).toBeVisible();
    await waitFor(() => expect(screen.getByTestId('stage')).toHaveTextContent('submitted'));
  });

  it('lets her pick the measurement system before the first measurement', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    const group = screen.getByRole('radiogroup', { name: 'How do you measure?' });

    // assert
    expect(within(group).getByRole('radio', { name: 'kg · cm' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'lb · in' })).toBeVisible();
    expect(screen.getByLabelText(/Your weight/)).toHaveAccessibleName(/\(kg\)/);
  });

  it('takes her weight in pounds and stores it in kilograms', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');
    await userEvent.click(screen.getByRole('radio', { name: 'lb · in' }));

    // act
    await userEvent.type(screen.getByLabelText(/Your weight/), '150');

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveAccessibleName(/\(lb\)/);
    await waitFor(
      () =>
        expect(
          loadDraft(DEMO_JOURNEY_CALL_ID)?.answers['goal-availability'].weight,
        ).toBeCloseTo(68, 1),
      { timeout: SERVICE_TIMEOUT },
    );
  });

  it('turns down a weight outside the sensible range in pounds', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');
    await userEvent.click(screen.getByRole('radio', { name: 'lb · in' }));

    // act
    await userEvent.type(screen.getByLabelText(/Your weight/), '1200');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // assert
    expect(
      screen.getByText('Enter a weight between 66 and 661 lb.'),
    ).toBeVisible();
  });

  it('converts what she already typed when she changes the measurement system', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');
    await userEvent.type(screen.getByLabelText(/Your weight/), '68');

    // act
    await userEvent.click(screen.getByRole('radio', { name: 'lb · in' }));

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveValue(149.9);
  });

  it('spells out her height in feet and inches while she works in inches', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');
    await userEvent.click(screen.getByRole('radio', { name: 'lb · in' }));

    // act
    await userEvent.type(screen.getByLabelText(/Your height/), '68');

    // assert
    expect(screen.getByText('5 ft 8 in')).toBeVisible();
  });

  it('shows the same answers in pounds when she comes back to the form', async () => {
    // arrange
    await saveDraft(DEMO_JOURNEY_CALL_ID, draftAt(0));
    window.localStorage.setItem(
      'eli.unitPreferences',
      JSON.stringify({ weightUnit: 'lb', heightUnit: 'ft-in' }),
    );

    // act
    renderOnboarding('?session=client&jstage=onboarding');

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveValue(145.7);
    expect(screen.getByLabelText(/Your height/)).toHaveValue(65);
  });

  it('shows only the flagged questions when her coach asks for more', async () => {
    // arrange
    renderOnboarding('?answer=1&session=client&jstage=needs-details');

    // act
    const heading = screen.getByRole('heading', { level: 1 });

    // assert
    expect(heading).toHaveTextContent('A few more details');
    expect(
      screen.getByText(
        'Two quick things before I build your plan — tell me a little more about your sleep and about that shoulder.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText(/Tell me about it in a line or two/)).toBeVisible();
    expect(screen.queryByText('Your goal and your week')).not.toBeInTheDocument();
  });

  it('sends her extra answers back and returns the journey to review', async () => {
    // arrange
    renderOnboarding('?answer=1&session=client&jstage=needs-details');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Send my answers' }));

    // assert
    expect(
      await screen.findByText('portal home', undefined, { timeout: SERVICE_TIMEOUT }),
    ).toBeVisible();
    await waitFor(() => expect(screen.getByTestId('stage')).toHaveTextContent('reviewing'));
  });
});
