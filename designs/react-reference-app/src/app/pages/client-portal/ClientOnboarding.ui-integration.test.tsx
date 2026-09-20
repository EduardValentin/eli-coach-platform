import { render, screen, waitFor } from '@testing-library/react';
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
import { emptyOnboardingDraft, type OnboardingDraft } from '../../domain/journey';
import { saveDraft } from '../../services/onboardingService';

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

function draftAt(currentFormIndex: number): OnboardingDraft {
  const draft = emptyOnboardingDraft();

  return {
    ...draft,
    currentFormIndex,
    consents: { disclaimer: true, specialCategory: true, progressPhotos: false },
    answers: { ...draft.answers, measurements: { weight: 66.1, waist: 74 } },
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
  it('asks for the disclaimer before the first form and refuses to move on without it', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // assert
    expect(screen.getByText('Tick the box to carry on.')).toBeVisible();
    expect(screen.getByText('Step 1 of 5')).toBeVisible();
  });

  it('opens the first form once the disclaimer is acknowledged', async () => {
    // arrange
    renderOnboarding('?session=client&jstage=account-created');

    // act
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your goal and your week' }),
    ).toBeVisible();
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
    expect(screen.getAllByText('Pick one of these.').length).toBeGreaterThan(0);
    expect(screen.getByText('Add a number here.')).toBeVisible();
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
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

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
