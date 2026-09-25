import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ProgramStatusCard } from './ProgramStatusCard';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';

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

function renderCard(devParams: string) {
  const url = `/portal?scope=post-mvp&${devParams.slice(1)}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <UnitPreferencesProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <Routes>
                  <Route element={<ProgramStatusCard />} path="/portal" />
                  <Route
                    element={<p>onboarding page</p>}
                    path="/portal/onboarding"
                  />
                </Routes>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </UnitPreferencesProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('the program status card', () => {
  it('tells her the answers are with her coach', () => {
    // arrange
    renderCard('?session=client&jstage=submitted');

    // act & assert
    expect(screen.getByText('Sent to your coach')).toBeVisible();
    expect(
      screen.getByText('Eli has your answers and will start on them soon.'),
    ).toBeVisible();
  });

  it('tells her the review is under way', () => {
    // arrange
    renderCard('?session=client&jstage=reviewing');

    // act & assert
    expect(
      screen.getByText('Your coach is reviewing your answers'),
    ).toBeVisible();
    expect(
      screen.getByText(
        "You'll see the next step here as soon as she has looked through your answers.",
      ),
    ).toBeVisible();
  });

  it('tells her the answers are approved and the program is being built', () => {
    // arrange
    renderCard('?session=client&jstage=approved');

    // act & assert
    expect(screen.getByText('Your answers are approved')).toBeVisible();
    expect(
      screen.getByText('Eli is putting your program together.'),
    ).toBeVisible();
  });

  it("passes on her coach's question and offers to answer it", async () => {
    // arrange
    renderCard('?session=client&jstage=needs-details');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Answer now' }));

    // assert
    expect(screen.getByText('onboarding page')).toBeVisible();
  });

  it('names the coach message on the needs-details card', () => {
    // arrange
    renderCard('?session=client&jstage=needs-details');

    // act & assert
    expect(
      screen.getByText('Your coach needs a few more details'),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Two quick things before I build your plan — tell me a little more about your sleep and about that shoulder.',
      ),
    ).toBeVisible();
  });

  it('points her at the finished program', () => {
    // arrange
    renderCard('?session=client&jstage=program-ready');

    // act & assert
    expect(screen.getByText('Your program is ready')).toBeVisible();
    expect(
      screen.getByText("Head to your plan whenever you're ready."),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'See my plan' })).toHaveAttribute(
      'href',
      '/portal/plan',
    );
  });

  it('tells her when Eli starts working while she keeps her 14 days', () => {
    // arrange
    renderCard('?session=client&jstage=reviewing&jstart=waiting');

    // act
    const line = screen.getByText(
      /^Eli has your answers\. You chose to keep your 14-day right of withdrawal, so she starts working on your program on \d{1,2} \w+\. Your program will be delivered as soon as it is completed\.$/,
    );

    // assert
    expect(line).toBeVisible();
    expect(
      screen.getByText(
        'Want Eli to start sooner? You can give up your 14-day right of withdrawal and let her begin now.',
      ),
    ).toBeVisible();
  });

  it('keeps the stage line before her answers reach Eli on the waiting path', () => {
    // arrange
    renderCard('?session=client&jstage=needs-details&jstart=waiting');

    // act
    const line = screen.getByText(
      'Two quick things before I build your plan — tell me a little more about your sleep and about that shoulder.',
    );

    // assert
    expect(line).toBeVisible();
    expect(
      screen.queryByText(/she starts working on your program on/),
    ).not.toBeInTheDocument();
  });

  it('asks her to give up the withdrawal right before letting Eli start', async () => {
    // arrange
    renderCard('?session=client&jstage=reviewing&jstart=waiting');

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Let Eli start now' }),
    );

    // assert
    const dialog = screen.getByRole('alertdialog', {
      name: 'Let Eli start now?',
    });
    expect(dialog).toHaveAccessibleDescription(
      /^I expressly request that my program begins before the end of the 14-day withdrawal period\./,
    );
    expect(
      screen.getByRole('button', { name: 'Keep my 14 days' }),
    ).toBeVisible();
  });

  it('drops the waiting line once she lets Eli start now', async () => {
    // arrange
    renderCard('?session=client&jstage=reviewing&jstart=waiting');
    await userEvent.click(
      screen.getByRole('button', { name: 'Let Eli start now' }),
    );

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Yes, start now' }),
    );

    // assert
    await waitFor(
      () =>
        expect(
          screen.queryByText(/she starts working on your program on/),
        ).not.toBeInTheDocument(),
      { timeout: SERVICE_TIMEOUT },
    );
    expect(
      screen.queryByRole('button', { name: 'Let Eli start now' }),
    ).not.toBeInTheDocument();
  });

  it('keeps billing off the program card once the coaching runs', () => {
    // arrange
    renderCard('?session=client&jstage=program-ready&jsub=active');

    // act
    const reassurance = screen.queryByText(/Your coaching renews on/);

    // assert
    expect(reassurance).not.toBeInTheDocument();
  });
});
