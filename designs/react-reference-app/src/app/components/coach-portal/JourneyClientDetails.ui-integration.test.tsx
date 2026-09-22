import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { JourneyClientDetails } from './JourneyClientDetails';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';

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

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function DemoJourneyDetails() {
  const { demoJourney, answerRequest } = useClientJourneys();

  return (
    <>
      <JourneyClientDetails journey={demoJourney} />
      <button
        onClick={() => answerRequest(demoJourney.callId, new Date())}
        type="button"
      >
        stand in for her answer
      </button>
    </>
  );
}

function renderDetails(urlQuery: string) {
  const url = `/coach/clients/c1?scope=post-mvp&${urlQuery.slice(1)}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <DemoJourneyDetails />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function onboardingWidget(): HTMLElement {
  return screen.getByRole('region', { name: 'Onboarding' });
}

function pageHeader(): HTMLElement {
  const header = screen.getByRole('heading', { level: 1 }).closest('header');
  if (!header) throw new Error('No page header');

  return header;
}

describe('the coach view of a client in onboarding', () => {
  it('badges an immediate start beside her name and keeps the stage out of the header', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    const header = pageHeader();
    expect(within(header).getByText('Immediate start')).toBeInTheDocument();
    expect(within(header).queryByText('Sent to coach')).not.toBeInTheDocument();
  });

  it('names the day a waiting client starts beside her name', () => {
    // arrange
    const urlQuery = '?jstage=submitted&jstart=waiting';

    // act
    renderDetails(urlQuery);

    // assert
    expect(within(pageHeader()).getByText(/^Starts on /)).toBeInTheDocument();
  });

  it('shows the journey status only inside the onboarding widget', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    expect(
      within(onboardingWidget()).getByText('Sent to coach'),
    ).toBeInTheDocument();
  });

  it('counts the answers of every form she was asked to fill in', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('button', { name: /Your measurements/ }),
    ).toHaveTextContent('2 of 4 answered');
    expect(
      within(widget).getByRole('button', { name: /Your cycle and hormonal context/ }),
    ).toBeInTheDocument();
  });

  it('opens a form and reads its answers back, marking the ones she skipped', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', { name: /Your measurements/ }),
    );

    // assert
    const widget = onboardingWidget();
    expect(within(widget).getByText('Waist')).toBeInTheDocument();
    expect(within(widget).getByText('74 cm')).toBeInTheDocument();
    expect(within(widget).getAllByText('Not answered')).toHaveLength(2);
  });

  it('reads her measurements back in kilograms and centimetres whatever she entered them in', async () => {
    // arrange
    window.localStorage.setItem(
      'eli.unitPreferences',
      JSON.stringify({ weightUnit: 'lb', heightUnit: 'ft-in' }),
    );
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', { name: /Your goal and your week/ }),
    );

    // assert
    const widget = onboardingWidget();
    expect(within(widget).getByText('66.1 kg')).toBeInTheDocument();
    expect(within(widget).getByText('165 cm')).toBeInTheDocument();
  });

  it('reads a yes or no back as plain text and marks the ones that need a look', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', {
        name: /A few safety questions/,
      }),
    );

    // assert
    const widget = onboardingWidget();
    const injury = within(widget).getByText('Bone or joint problem').nextSibling;
    expect(injury).toHaveTextContent('Yes');
    expect(
      within(injury as HTMLElement).getByLabelText('Needs a look'),
    ).toBeInTheDocument();
    const heart = within(widget).getByText('Heart condition').nextSibling;
    expect(heart).toHaveTextContent('No');
    expect(
      within(heart as HTMLElement).queryByLabelText('Needs a look'),
    ).not.toBeInTheDocument();
  });

  it('offers to build the program without reviewing her answers first', () => {
    // arrange
    const urlQuery = '?jstage=submitted';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('link', { name: 'Build her program' }),
    ).toHaveAttribute('href', '/coach/training/builder/ac-demo-client-1');
    expect(
      within(widget).getByRole('button', { name: 'Review answers' }),
    ).toBeInTheDocument();
  });

  it('opens every answer for flagging the moment the coach reviews', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');

    // act
    await user.click(screen.getByRole('button', { name: 'Review answers' }));

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    ).not.toBeChecked();
    expect(within(widget).getByText('0 questions flagged')).toBeVisible();
    expect(within(widget).getByText('Reviewing')).toBeInTheDocument();
  });

  it('keeps the review open and the flags out of the way once she is done', async () => {
    // arrange
    const user = renderDetails('?jstage=submitted');
    await user.click(screen.getByRole('button', { name: 'Review answers' }));
    await user.click(
      within(onboardingWidget()).getByRole('checkbox', {
        name: 'Flag Sleep hours',
      }),
    );

    // act
    await user.click(screen.getByRole('button', { name: 'Done' }));

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('button', { name: 'Continue review' }),
    ).toBeInTheDocument();
    expect(within(widget).queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(
      within(widget).getByRole('button', { name: 'Continue review' }),
    );
    expect(
      within(onboardingWidget()).getByRole('checkbox', {
        name: 'Flag Sleep hours',
      }),
    ).not.toBeChecked();
  });

  it('asks for more details only once a question is flagged and a note written', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');

    // act
    await user.click(screen.getByRole('button', { name: 'Continue review' }));

    // assert
    const widget = onboardingWidget();
    const send = within(widget).getByRole('button', {
      name: 'Ask for more details',
    });
    expect(send).toBeDisabled();

    await user.click(
      within(widget).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    );
    expect(within(widget).getByText('1 question flagged')).toBeVisible();
    expect(send).toBeDisabled();

    await user.type(
      within(widget).getByRole('textbox', { name: 'What is missing?' }),
      'Tell me more about your sleep.',
    );
    expect(send).toBeEnabled();
  });

  it('sends the request and moves her back to answering', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');
    await user.click(screen.getByRole('button', { name: 'Continue review' }));
    const widget = onboardingWidget();

    // act
    await user.click(
      within(widget).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    );
    await user.type(
      within(widget).getByRole('textbox', { name: 'What is missing?' }),
      'Tell me more about your sleep.',
    );
    await user.click(
      within(widget).getByRole('button', { name: 'Ask for more details' }),
    );

    // assert
    const reviewed = onboardingWidget();
    expect(within(reviewed).getByText('Needs more details')).toBeInTheDocument();
    expect(
      within(reviewed).getByText('Tell me more about your sleep.'),
    ).toBeInTheDocument();
    expect(
      within(reviewed).queryByRole('button', { name: /review/i }),
    ).not.toBeInTheDocument();
    expect(
      within(reviewed).getByRole('link', { name: 'Build her program' }),
    ).toBeInTheDocument();
  });

  it('approves the answers and turns the widget to building her program', async () => {
    // arrange
    const user = renderDetails('?jstage=reviewing');
    await user.click(screen.getByRole('button', { name: 'Continue review' }));

    // act
    await user.click(
      within(onboardingWidget()).getByRole('button', {
        name: 'Approve answers',
      }),
    );

    // assert
    const widget = onboardingWidget();
    expect(within(widget).getByText('Approved')).toBeInTheDocument();
    expect(within(widget).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      within(widget).getByRole('link', { name: 'Build her program' }),
    ).toBeInTheDocument();
    expect(
      within(widget).getByRole('button', { name: 'Review again' }),
    ).toBeInTheDocument();
  });

  it('reopens the approved answers without approving them twice', async () => {
    // arrange
    const user = renderDetails('?jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Review again' }));

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    ).not.toBeChecked();
    expect(within(widget).getByText('Approved')).toBeInTheDocument();
    expect(
      within(widget).queryByRole('button', { name: 'Approve answers' }),
    ).not.toBeInTheDocument();
  });

  it('brings her back to the approved answers after a reopened question', async () => {
    // arrange
    const user = renderDetails('?jstage=approved');
    await user.click(screen.getByRole('button', { name: 'Review again' }));
    const reopened = onboardingWidget();
    await user.click(
      within(reopened).getByRole('checkbox', { name: 'Flag Sleep hours' }),
    );
    await user.type(
      within(reopened).getByRole('textbox', { name: 'What is missing?' }),
      'Tell me more about your sleep.',
    );

    // act
    await user.click(
      within(reopened).getByRole('button', { name: 'Ask for more details' }),
    );

    // assert
    expect(
      within(onboardingWidget()).getByText('Needs more details'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'stand in for her answer' }),
    );
    expect(within(onboardingWidget()).getByText('Approved')).toBeInTheDocument();
  });

  it('leaves a client with her program ready nothing to act on', () => {
    // arrange
    const urlQuery = '?jstage=program-ready';

    // act
    renderDetails(urlQuery);

    // assert
    const widget = onboardingWidget();
    expect(
      within(widget).queryByRole('link', { name: 'Build her program' }),
    ).not.toBeInTheDocument();
    expect(
      within(widget).queryByRole('button', { name: /review/i }),
    ).not.toBeInTheDocument();
  });
});
