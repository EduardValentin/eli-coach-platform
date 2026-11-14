import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from '../../components/Navbar';
import { RequireSession } from '../../components/RequireSession';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ProgramProvider } from '../../context/ProgramContext';
import { StoreProvider } from '../../context/StoreContext';
import { TrainingProvider } from '../../context/TrainingContext';
import { ClientExercise } from './ClientExercise';

const completeSignIn = vi.hoisted(() => vi.fn());

vi.mock('../../services/authService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/authService')>();
  return { ...actual, completeSignIn };
});

const SEEDS = 'pseed=published&jstage=program-ready';

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

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  completeSignIn.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});

function renderAt(url: string) {
  window.history.replaceState({}, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <StoreProvider>
          <TrainingProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ProgramProvider>
                  <Routes>
                    <Route element={<RequireSession session="client" />}>
                      <Route path="/portal/exercises/:exerciseId" element={<ClientExercise />} />
                      <Route path="/portal/program" element={<h1>Program page</h1>} />
                    </Route>
                    <Route
                      path="/"
                      element={
                        <>
                          <Navbar />
                          <h1>Home</h1>
                        </>
                      }
                    />
                  </Routes>
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </TrainingProvider>
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderSignedIn(exerciseId: string) {
  renderAt(`/portal/exercises/${exerciseId}?session=client&${SEEDS}`);
}

describe('the client exercise page', () => {
  it('shows the exercise with its video, its cues, its swaps and a way back to her program', async () => {
    // arrange
    // act
    renderSignedIn('e1');

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Barbell Back Squat' })).toBeInTheDocument();
    expect(screen.getByLabelText('Barbell Back Squat video')).toHaveAttribute('src', expect.stringContaining('.mp4'));
    expect(within(screen.getByRole('region', { name: 'How to do it' })).getByText(/targets the quads, glutes, and core/)).toBeInTheDocument();
    const swaps = within(await screen.findByRole('region', { name: 'Swaps' })).getAllByRole('link');
    expect(swaps.length).toBeGreaterThan(0);
    swaps.forEach(swap => expect(swap).toHaveAttribute('href', expect.stringMatching(/^\/portal\/exercises\/e\d+$/)));
    expect(screen.getByRole('link', { name: 'Back to program' })).toHaveAttribute('href', '/portal/program');
  });

  it('opens a swap on its own exercise page', async () => {
    // arrange
    const user = userEvent.setup();
    renderSignedIn('e1');
    const [swap] = within(await screen.findByRole('region', { name: 'Swaps' })).getAllByRole('link');
    const swapText = swap.textContent ?? '';

    // act
    await user.click(swap);

    // assert
    const heading = await screen.findByRole('heading', { level: 1, name: name => name !== 'Barbell Back Squat' });
    expect(swapText.startsWith(heading.textContent ?? '-')).toBe(true);
    expect(heading).toHaveFocus();
  });

  it('still works for an exercise without a video', () => {
    // arrange
    // act
    renderSignedIn('e3');

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Bulgarian Split Squat' })).toBeInTheDocument();
    expect(screen.getByText('No video for this exercise yet.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bulgarian Split Squat video')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'How to do it' })).toBeInTheDocument();
  });

  it.each([
    ['an unknown', 'not-an-exercise'],
    ['an archived', 'e13'],
  ])('answers %s exercise with a friendly not-found and a way to her program', async (_, exerciseId) => {
    // arrange
    const user = userEvent.setup();
    renderSignedIn(exerciseId);
    expect(screen.getByText("We couldn't find this exercise")).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('link', { name: 'Go to your program' }));

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Program page' })).toBeInTheDocument();
  });

  it('brings a signed-out client back to the same exercise after she signs in', async () => {
    // arrange
    const user = userEvent.setup();
    completeSignIn.mockResolvedValue('client');
    renderAt(`/portal/exercises/e3?${SEEDS}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();

    // act
    await user.click(screen.getAllByRole('button', { name: 'Sign In' })[0]);

    // assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Bulgarian Split Squat' })).toBeInTheDocument();
  });
});
